import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (isRateLimited(getClientIp(request), 'api:quiz-response-counts', 30, 60_000).limited) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.rpc('get_quiz_response_counts', { owner_uuid: user.id });
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const row of data || []) {
      if (typeof row.quiz_id === 'string') counts[row.quiz_id] = Number(row.response_count) || 0;
    }
    return NextResponse.json({ counts }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[api/quiz-response-counts] Count lookup failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Could not load assessment response counts.' }, { status: 503 });
  }
}
