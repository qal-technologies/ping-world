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
    const requestedQuizId = request.nextUrl.searchParams.get('quizId');
    if (requestedQuizId) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedQuizId)) {
        return NextResponse.json({ error: 'Invalid assessment.' }, { status: 400 });
      }
      const { data: quiz, error: quizError } = await admin.from('quizzes')
        .select('id,responses').eq('id', requestedQuizId).eq('user_id', user.id).maybeSingle();
      if (quizError) throw quizError;
      if (!quiz) return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 });
      const [{ count: submitted, error: responseError }, { count: active, error: attemptError }] = await Promise.all([
        admin.from('quiz_responses').select('id', { count: 'exact', head: true }).eq('quiz_id', requestedQuizId),
        admin.from('quiz_attempts').select('id', { count: 'exact', head: true }).eq('quiz_id', requestedQuizId).eq('status', 'in_progress'),
      ]);
      if (responseError) throw responseError;
      if (attemptError) throw attemptError;
      // Match response loading's legacy fallback: the JSONB copy is consulted
      // only when no normalized response rows exist, so it cannot double count.
      const submittedCount = (submitted ?? 0) > 0
        ? submitted!
        : Array.isArray(quiz.responses) ? quiz.responses.length : 0;
      const activeCount = active ?? 0;
      counts[requestedQuizId] = submittedCount + activeCount;
      return NextResponse.json({ counts, count: counts[requestedQuizId], submittedCount, activeCount }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

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

    // Count with head-only queries instead of transferring every response and
    // attempt row to the app server. Small batches avoid both large IN clauses
    // and a burst of database requests for accounts with many assessments.
    for (let index = 0; index < userQuizzes.length; index += 20) {
      const batch = userQuizzes.slice(index, index + 20);
      const batchCounts = await Promise.all(batch.map(async (quiz) => {
        const [responseResult, attemptResult] = await Promise.all([
          admin.from('quiz_responses').select('id', { count: 'exact', head: true }).eq('quiz_id', quiz.id),
          admin.from('quiz_attempts').select('id', { count: 'exact', head: true }).eq('quiz_id', quiz.id).eq('status', 'in_progress'),
        ]);
        if (responseResult.error) throw responseResult.error;
        if (attemptResult.error) throw attemptResult.error;
        const normalizedResponses = responseResult.count ?? 0;
        // Legacy responses live in a JSONB array on the assessment. Use that
        // count only when there are no normalized response rows, avoiding a
        // double count during partial migrations.
        const savedResponses = normalizedResponses > 0
          ? normalizedResponses
          : Array.isArray(quiz.responses) ? quiz.responses.length : 0;
        return [quiz.id, savedResponses + (attemptResult.count ?? 0)] as const;
      }));
      for (const [quizId, count] of batchCounts) counts[quizId] = count;
    }

    return NextResponse.json({ counts }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.warn('[api/quiz-response-counts] Count lookup degraded:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ counts: {} }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
}
