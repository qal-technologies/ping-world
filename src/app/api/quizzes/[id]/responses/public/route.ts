import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser, readJsonWithinLimit } from '@/lib/api-auth';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (isRateLimited(getClientIp(request), 'api:quiz-responses-public-toggle', 12, 60_000).limited)
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const { id } = await params;
    const body = await readJsonWithinLimit(request, 4_000) as { enabled?: unknown };
    if (body.enabled !== undefined && typeof body.enabled !== 'boolean') return NextResponse.json({ error: 'Invalid visibility setting.' }, { status: 400 });
    const admin = getSupabaseAdmin();
    const { data: quiz } = await admin.from('quizzes').select('id,user_id,settings').eq('id', id).maybeSingle();
    if (!quiz) return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 });
    if (quiz.user_id !== user.id) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    const settings = quiz.settings && typeof quiz.settings === 'object' ? { ...quiz.settings } : {};
    const enabled = typeof body.enabled === 'boolean' ? body.enabled : !settings.publicResponsesId;
    if (enabled) settings.publicResponsesId = randomUUID();
    else delete settings.publicResponsesId;
    const { error } = await admin.from('quizzes').update({ settings }).eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    return NextResponse.json({ enabled, publicId: enabled ? settings.publicResponsesId : null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Could not update response sharing.' }, { status: 503 });
  }
}
