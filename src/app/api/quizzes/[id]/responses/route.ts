import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { decodeStoredCorrectAnswer } from '@/lib/quiz/quiz-evaluation';

function correctFor(
  question: Record<string, any>,
  answer: any,
): boolean | undefined {
  let expected = decodeStoredCorrectAnswer(question.correctIndex);
  if (
    expected === null ||
    expected === undefined ||
    expected === '' ||
    (Array.isArray(expected) && expected.length === 0) ||
    question.type === 'upload'
  )
    return undefined;
  if (typeof expected === 'number' && Array.isArray(question.options)) {
    const option = question.options[expected];
    expected = option && typeof option === 'object' ? option.id : option;
  }
  if (question.type === 'input') {
    const left = String(answer ?? '').trim();
    const right = String(expected ?? '').trim();
    return question.caseSensitive ?
        left === right
      : left.toLowerCase() === right.toLowerCase();
  }
  if (Array.isArray(answer) && Array.isArray(expected)) {
    return (
      answer.length === expected.length &&
      answer.every((value) =>
        expected.some((item: unknown) => String(value) === String(item)),
      )
    );
  }
  return String(answer ?? '').trim() === String(expected ?? '').trim();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (
    isRateLimited(getClientIp(request), 'api:quiz-response-list', 30, 60_000)
      .limited
  ) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  const user = await getRequestUser(request);
  if (!user)
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  try {
    const { id } = await params;
    const offset = Math.max(
      0,
      Math.min(Number(request.nextUrl.searchParams.get('offset')) || 0, 4900),
    );
    const limit = Math.max(
      1,
      Math.min(Number(request.nextUrl.searchParams.get('limit')) || 100, 100),
    );
    const windowEnd = Math.min(5000, offset + limit + 1);
    const admin = getSupabaseAdmin();
    const { data: quiz, error: quizError } = await admin
      .from('quizzes')
      .select('id,user_id,type,questions')
      .eq('id', id)
      .maybeSingle();
    if (quizError || !quiz)
      return NextResponse.json(
        { error: 'Assessment not found.' },
        { status: 404 },
      );
    if (quiz.user_id !== user.id)
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

    const [
      { data: rows, error },
      { data: attempts, error: attemptError },
      { count: totalCount, error: countError },
      { count: attemptCount, error: attemptCountError },
    ] = await Promise.all([
      admin
        .from('quiz_responses')
        .select('id,timestamp,score,total_questions,user_data,answers')
        .eq('quiz_id', id)
        .order('timestamp', { ascending: false })
        .range(0, windowEnd - 1),
      admin
        .from('quiz_attempts')
        .select(
          'id,started_at,updated_at,status,answers,user_data,current_question_index,question_order',
        )
        .eq('quiz_id', id)
        .eq('status', 'in_progress')
        .order('updated_at', { ascending: false })
        .range(0, windowEnd - 1),
      admin
        .from('quiz_responses')
        .select('id', { count: 'exact', head: true })
        .eq('quiz_id', id),
      admin
        .from('quiz_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('quiz_id', id)
        .eq('status', 'in_progress'),
    ]);
    if (error || attemptError || countError || attemptCountError)
      throw error || attemptError || countError || attemptCountError;

    const responses: any[] = (rows || []).map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      score: row.score || 0,
      totalQuestions: row.total_questions || 0,
      userData: row.user_data || {},
      answers: Array.isArray(row.answers) ? row.answers : [],
    }));

    const questionMap = new Map(
      (Array.isArray(quiz.questions) ? quiz.questions : []).map((q: any) => [
        String(q.id),
        q,
      ]),
    );
    for (const attempt of attempts || []) {
      const snapshot =
        attempt.answers && typeof attempt.answers === 'object' ?
          attempt.answers
        : {};
      let answers = await Promise.all(
        Object.entries(snapshot).map(
          async ([questionId, value]: [string, any]) => {
            const question = questionMap.get(questionId);
            if (!question) return null;
            const answer =
              value && typeof value === 'object' && 'answer' in value ?
                value.answer
              : value;
            const correct =
              quiz.type === 'quiz' ? correctFor(question, answer) : undefined;
            const result = {
              ...(value && typeof value === 'object' ? value : {}),
              questionId,
              answer,
              ...(typeof correct === 'boolean' ? { correct } : {}),
            };
            if (
              typeof result.fileUrl === 'string' &&
              !result.fileUrl.startsWith('http') &&
              !result.fileUrl.startsWith('data:')
            ) {
              const { data: signed } = await admin.storage
                .from('quiz-response-media')
                .createSignedUrl(result.fileUrl, 3600);
              if (signed?.signedUrl) result.fileUrl = signed.signedUrl;
            }
            return result;
          },
        ),
      );
      const questionOrder =
        Array.isArray(attempt.question_order) ?
          attempt.question_order.map(String)
        : Array.isArray(quiz.questions) ?
          quiz.questions.map((question: any) => String(question.id))
        : [];
      const answerOrder = new Map(
        questionOrder.map((questionId: string, index: number) => [
          questionId,
          index,
        ]),
      );
      answers = answers.sort(
        (left: any, right: any) =>
          (answerOrder.get(String(left?.questionId)) ??
            Number.MAX_SAFE_INTEGER) -
          (answerOrder.get(String(right?.questionId)) ??
            Number.MAX_SAFE_INTEGER),
      );
      const totals = new Map<string, { correct: number; total: number }>();
      for (const answer of answers as any[]) {
        const question: any = questionMap.get(answer.questionId);
        const category = String(question?.category || 'General');
        const value = totals.get(category) || { correct: 0, total: 0 };
        value.total += 1;
        if (answer.correct) value.correct += 1;
        totals.set(category, value);
      }
      responses.push({
        id: attempt.id,
        timestamp: attempt.updated_at,
        startedAt: attempt.started_at,
        status: 'in_progress',
        score:
          quiz.type === 'quiz' ?
            answers.filter((answer: any) => answer.correct).length
          : 0,
        totalQuestions: questionMap.size,
        answeredQuestions: answers.length,
        userData: attempt.user_data || {},
        answers,
        categoryScores: Object.fromEntries(totals),
      });
    }
    responses.sort(
      (a: any, b: any) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    const hasMore = responses.length > offset + limit;
    const page = responses.slice(offset, offset + limit);
    const signedPage = await Promise.all(
      page.map(async (response: any) => ({
        ...response,
        answers: await Promise.all(
          (response.answers || []).map(async (answer: any) => {
            if (
              typeof answer?.fileUrl !== 'string' ||
              answer.fileUrl.startsWith('http') ||
              answer.fileUrl.startsWith('data:')
            )
              return answer;
            const { data: signed } = await admin.storage
              .from('quiz-response-media')
              .createSignedUrl(answer.fileUrl, 3600);
            return signed?.signedUrl ?
                { ...answer, fileUrl: signed.signedUrl }
              : answer;
          }),
        ),
      })),
    );
    const nextOffset = hasMore ? offset + limit : null;
    return NextResponse.json(
      {
        responses: signedPage,
        nextOffset,
        totalCount: (totalCount || 0) + (attemptCount || 0),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error(
      '[api/quiz-responses/list] Load failed:',
      error instanceof Error ? error.message : 'unknown',
    );
    return NextResponse.json(
      { error: 'Could not load assessment responses.' },
      { status: 503 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (
    isRateLimited(getClientIp(request), 'api:quiz-response-delete', 30, 60_000)
      .limited
  ) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  const user = await getRequestUser(request);
  if (!user)
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  try {
    const { id: quizId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(quizId))
      return NextResponse.json(
        { error: 'Invalid assessment.' },
        { status: 400 },
      );
    // Assessment responses are an integrity record. Only the explicit bulk
    // clear flow is supported; setters cannot remove an individual response.
    if (request.nextUrl.searchParams.get('all') !== '1') {
      return NextResponse.json(
        {
          error:
            'Individual response deletion is disabled to protect assessment integrity.',
        },
        { status: 403 },
      );
    }
    const admin = getSupabaseAdmin();
    const { data: quiz, error: quizError } = await admin
      .from('quizzes')
      .select('id,user_id')
      .eq('id', quizId)
      .maybeSingle();
    if (quizError || !quiz)
      return NextResponse.json(
        { error: 'Assessment not found.' },
        { status: 404 },
      );
    if (quiz.user_id !== user.id)
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    const { data: rows, error: rowsError } = await admin
      .from('quiz_responses')
      .select('id,answers')
      .eq('quiz_id', quizId);
    if (rowsError) throw rowsError;
    const mediaPaths = (rows || []).flatMap((row: any) =>
      (Array.isArray(row.answers) ? row.answers : [])
        .map((answer: any) => answer?.fileUrl)
        .filter(
          (path: unknown): path is string =>
            typeof path === 'string' &&
            !path.startsWith('http') &&
            !path.startsWith('data:') &&
            path.startsWith(`${quizId}/`),
        ),
    );
    if (mediaPaths.length) {
      const { error } = await admin.storage
        .from('quiz-response-media')
        .remove(mediaPaths);
      if (error) throw error;
    }
    const { error } = await admin
      .from('quiz_responses')
      .delete()
      .eq('quiz_id', quizId);
    if (error) throw error;
    return NextResponse.json(
      { success: true, deletedCount: rows?.length || 0 },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error(
      '[api/quiz-responses/delete] Delete failed:',
      error instanceof Error ? error.message : 'unknown',
    );
    return NextResponse.json(
      { error: 'Could not delete response.' },
      { status: 503 },
    );
  }
}
