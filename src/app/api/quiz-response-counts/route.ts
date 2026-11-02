import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser, getRequestUserFromToken, readJsonWithinLimit } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return getCounts(request, () => getRequestUser(request));
}

export async function POST(request: NextRequest) {
  let token = '';
  try {
    const body = await readJsonWithinLimit(request, 256 * 1024) as { accessToken?: unknown };
    token = typeof body.accessToken === 'string' ? body.accessToken : '';
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!token || token.length > 240 * 1024) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  return getCounts(request, () => getRequestUserFromToken(token));
}

async function getCounts(request: NextRequest, resolveUser: () => ReturnType<typeof getRequestUser>) {
  if (isRateLimited(getClientIp(request), 'api:quiz-response-counts', 60, 60_000).limited) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  try {
    const admin = getSupabaseAdmin();
    const counts: Record<string, number> = {};

    // 1. Try owner RPC function first (fastest and most efficient if applied in Supabase)
    const { data: rpcData, error: rpcError } = await admin.rpc('get_quiz_response_counts', {
      owner_uuid: user.id,
    });

    if (!rpcError && Array.isArray(rpcData)) {
      for (const row of rpcData) {
        if (typeof row.quiz_id === 'string') {
          counts[row.quiz_id] = Number(row.response_count) || 0;
        }
      }
      return NextResponse.json({ counts }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    // 2. Resilient Fallback: If RPC is not installed or errors, query quizzes owned by this user
    const { data: userQuizzes, error: quizError } = await admin
      .from('quizzes')
      .select('id, responses')
      .eq('user_id', user.id);

    if (quizError || !userQuizzes || userQuizzes.length === 0) {
      return NextResponse.json({ counts: {} }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const quizIds = userQuizzes.map((q) => q.id);

    // Count from quiz_responses table
    try {
      const { data: respRows } = await admin
        .from('quiz_responses')
        .select('quiz_id')
        .in('quiz_id', quizIds);

      if (Array.isArray(respRows)) {
        for (const row of respRows) {
          if (row.quiz_id) counts[row.quiz_id] = (counts[row.quiz_id] || 0) + 1;
        }
      }
    } catch {}

    // Count in-progress attempts from quiz_attempts
    try {
      const { data: attemptRows } = await admin
        .from('quiz_attempts')
        .select('quiz_id')
        .in('quiz_id', quizIds)
        .eq('status', 'in_progress');

      if (Array.isArray(attemptRows)) {
        for (const row of attemptRows) {
          if (row.quiz_id) counts[row.quiz_id] = (counts[row.quiz_id] || 0) + 1;
        }
      }
    } catch {}

    // Also include quizzes that store responses in JSONB array
    for (const q of userQuizzes) {
      if (!counts[q.id] && Array.isArray(q.responses) && q.responses.length > 0) {
        counts[q.id] = q.responses.length;
      }
    }

    return NextResponse.json({ counts }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.warn('[api/quiz-response-counts] Count lookup degraded:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ counts: {} }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
}
