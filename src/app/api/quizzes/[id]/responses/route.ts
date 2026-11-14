import { NextRequest, NextResponse } from 'next/server';
import {
  getRequestUser,
  getRequestUserFromToken,
  readJsonWithinLimit,
} from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { decodeStoredCorrectAnswer } from '@/lib/quiz/quiz-evaluation';

function correctFor(
  question: Record<string, any>,
  answer: any,
): boolean | undefined {
  if (question.type === 'upload')
    return answer !== undefined && answer !== null && answer !== '' ?
        true
      : undefined;
  let expected = decodeStoredCorrectAnswer(question.correctIndex);
  if (
    expected === null ||
    expected === undefined ||
    expected === '' ||
    (Array.isArray(expected) && expected.length === 0)
  )
    return (
        answer !== undefined &&
          answer !== null &&
          answer !== '' &&
          !(Array.isArray(answer) && answer.length === 0)
      ) ?
        true
      : undefined;
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
  const options = Array.isArray(question.options) ? question.options : [];
  const normalize = (value: unknown) => {
    const found = options.find(
      (option: any, index: number) =>
        String(option?.id ?? index) === String(value),
    );
    if (found) return String(found.id ?? value);
    const index = Number(value);
    return Number.isInteger(index) && options[index] ?
        String(options[index]?.id ?? value)
      : String(value ?? '').trim();
  };
  const left = (Array.isArray(answer) ? answer : [answer])
    .map(normalize)
    .sort();
  const right = (Array.isArray(expected) ? expected : [expected])
    .map(normalize)
    .sort();
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function normalizeKeyIds(question: Record<string, any>, key: unknown) {
  const options = Array.isArray(question.options) ? question.options : [];
  return (Array.isArray(key) ? key : [key]).map((value: unknown) => {
    if (
      (typeof value === 'number' || /^\d+$/.test(String(value))) &&
      options[Number(value)]
    )
      return String(options[Number(value)]?.id ?? value);
    return String(value);
  });
}

function optionWeight(question: Record<string, any>, id: string) {
  const options = Array.isArray(question.options) ? question.options : [];
  const index = options.findIndex(
    (option: any, optionIndex: number) =>
      String(option?.id ?? optionIndex) === id || String(optionIndex) === id,
  );
  const weight = Number(options[index]?.scoreWeight);
  return Number.isFinite(weight) && weight >= 0 ? weight : 1;
}

function questionPointsPossible(question: Record<string, any>) {
  if (question.type === 'logic') return 0;
  const key = decodeStoredCorrectAnswer(question.correctIndex);
  if (
    question.type === 'upload' ||
    question.type === 'input' ||
    key === null ||
    key === undefined ||
    key === '' ||
    (Array.isArray(key) && key.length === 0)
  )
    return 1;
  const options = Array.isArray(question.options) ? question.options : [];
  const hasCustomWeights = options.some(
    (option: any) =>
      option?.scoreWeight !== undefined &&
      option?.scoreWeight !== null &&
      option?.scoreWeight !== '' &&
      Number.isFinite(Number(option.scoreWeight)) &&
      Number(option.scoreWeight) >= 0,
  );
  if (!hasCustomWeights) return 1;
  const ids = normalizeKeyIds(question, key);
  return question.type === 'checkbox' ?
      ids.reduce((sum: number, id: string) => sum + optionWeight(question, id), 0)
    : optionWeight(question, ids[0] || '');
}

function answerPointsEarned(
  question: Record<string, any>,
  answer: any,
  correct: boolean | undefined,
) {
  if (!isAttemptedAnswer(answer)) return 0;
  if (question.type === 'upload') return 1;
  if (question.type === 'input') return correct === true ? 1 : 0;
  if (correct === undefined) return 1;
  const key = decodeStoredCorrectAnswer(question.correctIndex);
  const options = Array.isArray(question.options) ? question.options : [];
  const hasCustomWeights = options.some(
    (option: any) =>
      option?.scoreWeight !== undefined &&
      option?.scoreWeight !== null &&
      option?.scoreWeight !== '' &&
      Number.isFinite(Number(option.scoreWeight)) &&
      Number(option.scoreWeight) >= 0,
  );
  if (question.type === 'checkbox' && hasCustomWeights) {
    const correctIds = new Set(normalizeKeyIds(question, key));
    const selectedIds = normalizeKeyIds(
      question,
      Array.isArray(answer.answer) ? answer.answer : [],
    );
    return selectedIds.reduce(
      (sum: number, id: string) =>
        sum + (correctIds.has(id) ? optionWeight(question, id) : 0),
      0,
    );
  }
  if (!correct) return 0;
  return hasCustomWeights ?
      optionWeight(question, normalizeKeyIds(question, key)[0] || '')
    : 1;
}

function isAttemptedAnswer(answer: any): boolean {
  if (!answer || answer.passed) return false;
  if (answer.fileUrl) return true;
  const value = answer.answer;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return typeof value === 'number' || typeof value === 'boolean';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return listQuizResponses(request, params, () => getRequestUser(request));
}

// The access token is carried in the bounded body for local development too:
// large legacy JWT claims can exceed Node's request-header limit and yield 431.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let token = '';
  try {
    const body = (await readJsonWithinLimit(request, 256 * 1024)) as {
      accessToken?: unknown;
    };
    token = typeof body.accessToken === 'string' ? body.accessToken : '';
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!token || token.length > 240 * 1024)
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  return listQuizResponses(request, params, () =>
    getRequestUserFromToken(token),
  );
}

async function listQuizResponses(
  request: NextRequest,
  params: Promise<{ id: string }>,
  resolveUser: () => ReturnType<typeof getRequestUser>,
) {
  if (
    isRateLimited(getClientIp(request), 'api:quiz-response-list', 30, 60_000)
      .limited
  ) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  const user = await resolveUser();
  if (!user)
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  try {
    const { id } = await params;
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );
    const isValidId = isUuid || /^[a-z0-9_-]{1,64}$/i.test(id);
    if (!isValidId) {
      return NextResponse.json(
        { error: 'Assessment not found.' },
        { status: 404 },
      );
    }

    const limit = Math.max(
      1,
      Math.min(Number(request.nextUrl.searchParams.get('limit')) || 50, 50),
    );
    const cursorValue = request.nextUrl.searchParams.get('cursor');
    let cursor: {
      timestamp: string;
      id: string;
      seen: number;
      submittedSeen: number;
    } | null = null;
    if (cursorValue && cursorValue.length <= 1000) {
      try {
        const parsed = JSON.parse(cursorValue);
        if (
          typeof parsed.timestamp === 'string' &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
            parsed.timestamp,
          ) &&
          Number.isFinite(Date.parse(parsed.timestamp)) &&
          typeof parsed.id === 'string' &&
          /^[0-9a-f-]{36}$/i.test(parsed.id)
        ) {
          cursor = {
            // Preserve database timestamp precision for exact equality in the
            // composite keyset filter; Date#toISOString truncates sub-ms data.
            timestamp: parsed.timestamp,
            id: parsed.id,
            seen: Math.max(0, Math.min(1000, Number(parsed.seen) || 0)),
            submittedSeen: Math.max(0, Number(parsed.submittedSeen) || 0),
          };
        }
      } catch {
        /* Invalid cursors are ignored and start at the newest page. */
      }
    }
    const seenBefore = cursor?.seen || 0;
    const admin = getSupabaseAdmin();

    let quiz: any = null;
    if (isUuid) {
      const { data, error: qErr } = await admin
        .from('quizzes')
        .select('id,user_id,type,questions,settings')
        .eq('id', id)
        .maybeSingle();
      if (qErr) throw qErr;
      if (data) quiz = data;
    }
    if (!quiz) {
      const { data, error: qErr } = await admin
        .from('quizzes')
        .select('id,user_id,type,questions,settings')
        .eq('custom_id', id)
        .maybeSingle();
      if (qErr) throw qErr;
      if (data) quiz = data;
    }

    if (!quiz) {
      return NextResponse.json(
        { error: 'Assessment not found.' },
        { status: 404 },
      );
    }
    if (quiz.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    let rows: any[] = [];
    let attempts: any[] = [];
    let totalCount: number | null = null;
    let attemptCount: number | null = null;
    let attemptsUnavailable = false;

    try {
      // Keep the response and live-attempt reads independent. A schema/cache
      // problem in one projection must not hide attempts that were saved in
      // the other table (or turn a usable partial feedback page into a 503).
      const [
        responseSettled,
        attemptSettled,
        responseCountSettled,
        attemptCountSettled,
      ] = await Promise.allSettled([
        admin
          .from('quiz_responses')
          .select('id,timestamp,score,total_questions,user_data,answers')
          .eq('quiz_id', quiz.id)
          .or(
            cursor ?
              `timestamp.lt.${cursor.timestamp},and(timestamp.eq.${cursor.timestamp},id.gt.${cursor.id})`
            : 'id.not.is.null',
          )
          .order('timestamp', { ascending: false })
          .order('id', { ascending: true })
          .range(0, limit - 1),
        admin
          .from('quiz_attempts')
          .select(
            'id,started_at,updated_at,status,answers,user_data,current_question_index,question_order',
          )
          .eq('quiz_id', quiz.id)
          .eq('status', 'in_progress')
          .or(
            cursor ?
              `updated_at.lt.${cursor.timestamp},and(updated_at.eq.${cursor.timestamp},id.gt.${cursor.id})`
            : 'id.not.is.null',
          )
          .order('updated_at', { ascending: false })
          .order('id', { ascending: true })
          .range(0, limit - 1),
        admin
          .from('quiz_responses')
          .select('id', { count: 'exact', head: true })
          .eq('quiz_id', quiz.id),
        admin
          .from('quiz_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('quiz_id', quiz.id)
          .eq('status', 'in_progress'),
      ]);

      const responseResult =
        responseSettled.status === 'fulfilled' ? responseSettled.value : null;
      const attemptResult =
        attemptSettled.status === 'fulfilled' ? attemptSettled.value : null;
      const responseCountResult =
        responseCountSettled.status === 'fulfilled' ?
          responseCountSettled.value
        : null;
      const attemptCountResult =
        attemptCountSettled.status === 'fulfilled' ?
          attemptCountSettled.value
        : null;

      if (
        responseResult &&
        !responseResult.error &&
        Array.isArray(responseResult.data)
      ) {
        rows = responseResult.data;
      } else {
        if (responseResult?.error)
          console.error(
            '[api/quiz-responses/list] Response query failed:',
            responseResult.error.code,
            responseResult.error.message,
          );
        try {
          const fallback = await admin
            .from('quiz_responses')
            .select('*')
            .eq('quiz_id', quiz.id)
            .or(
              cursor ?
                `timestamp.lt.${cursor.timestamp},and(timestamp.eq.${cursor.timestamp},id.gt.${cursor.id})`
              : 'id.not.is.null',
            )
            .order('timestamp', { ascending: false })
            .order('id', { ascending: true })
            .range(0, limit - 1);
          if (fallback.error) throw fallback.error;
          if (Array.isArray(fallback.data)) rows = fallback.data;
        } catch (fallbackError) {
          console.error(
            '[api/quiz-responses/list] Response fallback failed:',
            fallbackError instanceof Error ? fallbackError.message : 'unknown',
          );
        }
      }

      if (
        attemptResult &&
        !attemptResult.error &&
        Array.isArray(attemptResult.data)
      ) {
        attempts = attemptResult.data;
      } else {
        if (attemptResult?.error)
          console.error(
            '[api/quiz-responses/list] Attempt query failed:',
            attemptResult.error.code,
            attemptResult.error.message,
          );
        try {
          const attemptFallback = await admin
            .from('quiz_attempts')
            .select('*')
            .eq('quiz_id', quiz.id)
            .eq('status', 'in_progress')
            .or(
              cursor ?
                `updated_at.lt.${cursor.timestamp},and(updated_at.eq.${cursor.timestamp},id.gt.${cursor.id})`
              : 'id.not.is.null',
            )
            .order('updated_at', { ascending: false })
            .order('id', { ascending: true })
            .range(0, limit - 1);
          if (attemptFallback.error) throw attemptFallback.error;
          if (Array.isArray(attemptFallback.data))
            attempts = attemptFallback.data;
        } catch (fallbackError) {
          attemptsUnavailable = true;
          console.error(
            '[api/quiz-responses/list] Attempt fallback failed:',
            fallbackError instanceof Error ? fallbackError.message : 'unknown',
          );
        }
      }

      totalCount = responseCountResult?.count ?? null;
      attemptCount = attemptCountResult?.count ?? null;
    } catch (queryErr) {
      console.warn(
        '[api/quiz-responses/list] Direct table queries degraded:',
        queryErr,
      );
    }

    // Legacy responses may still live on the assessment JSONB column. Fetch
    // that potentially large field only when the normalized response table is
    // empty, so every routine attempt poll stays small and quick.
    if (rows.length === 0) {
      try {
        const { data: legacy } = await admin
          .from('quizzes')
          .select('responses')
          .eq('id', quiz.id)
          .maybeSingle();
        const legacyResponses =
          Array.isArray(legacy?.responses) ? legacy.responses : [];
        rows = legacyResponses.map((r: any, idx: number) => ({
          id:
            r.id || `00000000-0000-4000-8000-${String(idx).padStart(12, '0')}`,
          timestamp: r.timestamp || r.submittedAt || new Date().toISOString(),
          score: r.score ?? 0,
          total_questions:
            r.totalQuestions ??
            r.total_questions ??
            (Array.isArray(quiz.questions) ? quiz.questions.length : 0),
          user_data: r.userData || r.user_data || {},
          answers: Array.isArray(r.answers) ? r.answers : [],
        }));
        if (totalCount === null || totalCount === 0) totalCount = rows.length;
        if (cursor) {
          const cursorTime = Date.parse(cursor.timestamp);
          rows = rows.filter((row: any) => {
            const rowTime = Date.parse(String(row.timestamp || '')) || 0;
            return (
              rowTime < cursorTime ||
              (rowTime === cursorTime && String(row.id) > cursor.id)
            );
          });
        }
      } catch (legacyError) {
        console.warn(
          '[api/quiz-responses/list] Legacy response fallback unavailable:',
          legacyError instanceof Error ? legacyError.message : 'unknown',
        );
      }
    }

    const responses: any[] = (rows || []).map((row: any) => {
      const userData = { ...(row.user_data || {}) };
      for (const key of [
        'attemptTokenHash',
        'deviceKeyHash',
        'attemptId',
        'attemptToken',
        'deviceKey',
      ])
        delete userData[key];
      return {
        id: row.id,
        status: 'submitted',
        timestamp: row.timestamp,
        score: row.score || 0,
        totalQuestions: row.total_questions || 0,
        answeredQuestions:
          row.user_data?.answeredQuestions ??
          (Array.isArray(row.answers) ?
            new Set(
              row.answers
                .filter(isAttemptedAnswer)
                .map((answer: any) => String(answer.questionId)),
            ).size
          : 0),
        scorePossible: row.user_data?.scorePossible,
        currentPathQuestionIds: row.user_data?.currentPathQuestionIds,
        pathQuestionSnapshots: row.user_data?.pathQuestionSnapshots,
        userData,
        answers: Array.isArray(row.answers) ? row.answers : [],
        submissionReason: row.user_data?.submissionReason,
        startedAt: row.user_data?.startedAt,
        submittedAt: row.timestamp,
        durationSeconds: row.user_data?.durationSeconds,
        branchHistory: row.user_data?.branchHistory || [],
        isSignedUser: Boolean(row.user_data?.isSignedUser),
        signedUser: row.user_data?.signedUser || null,
      };
    });

    const questionMap = new Map(
      (Array.isArray(quiz.questions) ? quiz.questions : []).map((q: any) => [
        String(q.id),
        q,
      ]),
    );
    for (const attempt of attempts || []) {
      try {
        const snapshot =
          attempt.answers && typeof attempt.answers === 'object' ?
            attempt.answers
          : {};
        const attemptQuestionMap = new Map(questionMap);
        const questionSnapshots =
          (
            snapshot.__questionSnapshots &&
            typeof snapshot.__questionSnapshots === 'object'
          ) ?
            snapshot.__questionSnapshots
          : {};
        for (const [questionId, savedQuestion] of Object.entries(
          questionSnapshots,
        )) {
          if (savedQuestion && typeof savedQuestion === 'object')
            attemptQuestionMap.set(String(questionId), savedQuestion);
        }
        const attemptUserData = { ...(attempt.user_data || {}) };
        for (const key of [
          'attemptTokenHash',
          'deviceKeyHash',
          'attemptId',
          'attemptToken',
          'deviceKey',
        ])
          delete attemptUserData[key];
        let answers = await Promise.all(
          Object.entries(snapshot).map(
            async ([questionId, value]: [string, any]) => {
              if (
                [
                  '__visitedQuestionIds',
                  '__branchHistory',
                  '__signedUser',
                  '__questionSnapshots',
                ].includes(questionId)
              )
                return null;
              const question = attemptQuestionMap.get(questionId);
              if (!question) return null;
              const answer =
                value && typeof value === 'object' && 'answer' in value ?
                  value.answer
                : value;
              let correct: boolean | undefined;
              try {
                // A skipped question remains part of the reached path and total,
                // but it has no submitted value and must never earn points.
                correct =
                  (
                    quiz.type === 'quiz' &&
                    !(
                      value &&
                      typeof value === 'object' &&
                      value.passed === true
                    )
                  ) ?
                    correctFor(question, answer)
                  : undefined;
              } catch {
                // Malformed or legacy answer data must not take down the entire response page.
                correct = undefined;
              }
              const result =
                value && typeof value === 'object' ? { ...value } : {};
              // Progress snapshots come from the taker's browser. Use only
              // correctness calculated from the saved question, never a
              // client-supplied score or correctness flag.
              delete result.correct;
              delete result.pointsEarned;
              delete result.pointsPossible;
              if (Array.isArray(result.answerHistory))
                result.answerHistory = result.answerHistory.map(
                  (revision: any) => {
                    if (!revision || typeof revision !== 'object')
                      return revision;
                    const safeRevision = { ...revision };
                    delete safeRevision.correct;
                    delete safeRevision.pointsEarned;
                    delete safeRevision.pointsPossible;
                    return safeRevision;
                  },
                );
              Object.assign(result, {
                questionId,
                answer,
                ...(typeof correct === 'boolean' ? { correct } : {}),
              });
              const scoringAnswer = { ...result, answer };
              if (
                quiz.type === 'quiz' &&
                value?.passed !== true &&
                isAttemptedAnswer(scoringAnswer)
              ) {
                result.pointsEarned = answerPointsEarned(
                  question,
                  scoringAnswer,
                  correct,
                );
                result.pointsPossible = questionPointsPossible(question);
              }
              if (
                typeof result.fileUrl === 'string' &&
                !result.fileUrl.startsWith('http') &&
                !result.fileUrl.startsWith('data:')
              ) {
                try {
                  const { data: signed } = await admin.storage
                    .from('quiz-response-media')
                    .createSignedUrl(result.fileUrl, 3600);
                  if (signed?.signedUrl) result.fileUrl = signed.signedUrl;
                } catch {
                  // An unavailable attachment preview should not hide the live attempt.
                }
              }
              return result;
            },
          ),
        );
        const storedPathIds =
          Array.isArray(snapshot.__visitedQuestionIds) ?
            snapshot.__visitedQuestionIds.map(String)
          : [];
        const allQuestionsInPath =
          snapshot.__calculateAllBranches === true ||
          (Boolean(snapshot.__attemptSettings?.quizScroll) &&
            snapshot.__attemptSettings?.quizLayout !== 'scroll_show');
        const currentPathQuestionIds = (
          allQuestionsInPath ?
            (Array.isArray(quiz.questions) ? quiz.questions : []).map(
              (question: any) => String(question.id),
            )
          : Array.from(
              new Set([
                ...storedPathIds,
                ...answers
                  .map((answer: any) => String(answer?.questionId || ''))
                  .filter(Boolean),
              ]),
            )).filter(
          (questionId: string) =>
            (attemptQuestionMap.get(questionId) as any)?.type !== 'logic',
        );
        const branchHistory =
          Array.isArray(snapshot.__branchHistory) ?
            snapshot.__branchHistory
          : [];
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
        answers = answers.sort((left: any, right: any) => {
          const leftIndex = answerOrder.get(String(left?.questionId)) as
            | number
            | undefined;
          const rightIndex = answerOrder.get(String(right?.questionId)) as
            | number
            | undefined;
          if (leftIndex === rightIndex) {
            return String(left?.questionId) < String(right?.questionId) ?
                -1
              : 1;
          }
          return (
            (leftIndex ?? Number.MAX_SAFE_INTEGER) -
            (rightIndex ?? Number.MAX_SAFE_INTEGER)
          );
        });
        const totals = new Map<string, { correct: number; total: number }>();
        for (const answer of answers as any[]) {
          if (typeof answer.correct !== 'boolean') continue;
          const question: any = attemptQuestionMap.get(answer.questionId);
          const category = String(question?.category || 'General');
          const value = totals.get(category) || { correct: 0, total: 0 };
          value.total += 1;
          if (answer.correct) value.correct += 1;
          totals.set(category, value);
        }
        let scorePossible = 0;
        for (const questionId of currentPathQuestionIds) {
          const question: any = attemptQuestionMap.get(questionId);
          if (!question || question.type === 'logic' || quiz.type !== 'quiz')
            continue;
          // Possible score comes only from saved keys and option weights.
          // Skips and unanswered questions still contribute possible points.
          scorePossible += questionPointsPossible(question);
        }
        responses.push({
          id: attempt.id,
          timestamp: attempt.updated_at,
          startedAt: attempt.started_at,
          status: 'in_progress',
          score:
            quiz.type === 'quiz' ?
              answers.reduce((sum: number, answer: any) => {
                if (answer.passed === true) return sum;
                return (
                  sum +
                  (answer.pointsEarned !== undefined ?
                    Math.max(0, Number(answer.pointsEarned) || 0)
                  : answer.correct ? 1
                  : 0)
                );
              }, 0)
            : 0,
          totalQuestions: currentPathQuestionIds.length,
          scorePossible,
          branchHistory,
          isSignedUser: Boolean(snapshot.__signedUser),
          signedUser: snapshot.__signedUser || null,
          currentPathQuestionIds,
          pathQuestionSnapshots: currentPathQuestionIds
            .map((questionId: string) => {
              const question: any = attemptQuestionMap.get(questionId);
              return question ?
                  {
                    id: questionId,
                    text: String(question.text ?? ''),
                    type: String(question.type ?? ''),
                    category: question.category,
                    imageUrl:
                      (
                        typeof question.imageUrl === 'string' &&
                        !question.imageUrl.startsWith('data:')
                      ) ?
                        question.imageUrl
                      : undefined,
                    uploadUrl:
                      (
                        typeof question.uploadUrl === 'string' &&
                        !question.uploadUrl.startsWith('data:')
                      ) ?
                        question.uploadUrl
                      : undefined,
                    correctIndex: question.correctIndex ?? null,
                    correctExplanation:
                      typeof question.correctExplanation === 'string' ?
                        question.correctExplanation
                      : undefined,
                    options: (Array.isArray(question.options) ?
                      question.options
                    : []
                    ).map((option: any) => ({
                      id: String(option?.id ?? ''),
                      text: String(option?.text ?? option ?? ''),
                    })),
                  }
                : null;
            })
            .filter(Boolean),
          answeredQuestions: answers.filter(isAttemptedAnswer).length,
          durationSeconds: Math.max(
            0,
            Math.floor(
              (Date.now() - new Date(attempt.started_at).getTime()) / 1000,
            ),
          ),
          userData: attemptUserData,
          answers,
          categoryScores: Object.fromEntries(totals),
        });
      } catch (attemptShapeError) {
        // A malformed legacy snapshot must not hide a live participant. Return
        // the safe progress record even when its analytics projection fails.
        console.error(
          '[api/quiz-responses/list] Could not fully shape one live attempt:',
          attemptShapeError instanceof Error ?
            attemptShapeError.message
          : 'unknown',
        );
        const snapshot =
          attempt.answers && typeof attempt.answers === 'object' ?
            attempt.answers
          : {};
        const reserved = new Set([
          '__visitedQuestionIds',
          '__branchHistory',
          '__signedUser',
          '__questionSnapshots',
          '__calculateAllBranches',
          '__attemptSettings',
        ]);
        const fallbackAnswers = Object.entries(snapshot)
          .filter(
            ([id, value]: [string, any]) =>
              !reserved.has(id) && value && typeof value === 'object',
          )
          .map(([questionId, value]: [string, any]) => {
            const safeValue = { ...value };
            delete safeValue.correct;
            delete safeValue.pointsEarned;
            delete safeValue.pointsPossible;
            if (Array.isArray(safeValue.answerHistory))
              safeValue.answerHistory = safeValue.answerHistory.map(
                (revision: any) => {
                  if (!revision || typeof revision !== 'object')
                    return revision;
                  const safeRevision = { ...revision };
                  delete safeRevision.correct;
                  delete safeRevision.pointsEarned;
                  delete safeRevision.pointsPossible;
                  return safeRevision;
                },
              );
            return {
              ...safeValue,
              questionId: String(value.questionId || questionId),
            };
          });
        const fallbackPath = (
          Array.isArray(snapshot.__visitedQuestionIds) ?
            snapshot.__visitedQuestionIds.map(String)
          : fallbackAnswers.map((answer: any) =>
              String(answer.questionId),
            )).filter(
          (questionId: string) =>
            (questionMap.get(questionId) as any)?.type !== 'logic',
        );
        responses.push({
          id: attempt.id,
          timestamp: attempt.updated_at || attempt.started_at,
          startedAt: attempt.started_at,
          status: 'in_progress',
          score: 0,
          totalQuestions: fallbackPath.length,
          scorePossible: 0,
          currentPathQuestionIds: fallbackPath,
          branchHistory:
            Array.isArray(snapshot.__branchHistory) ?
              snapshot.__branchHistory
            : [],
          userData: (() => {
            const safeUserData =
              attempt.user_data && typeof attempt.user_data === 'object' ?
                { ...attempt.user_data }
              : {};
            for (const key of [
              'attemptTokenHash',
              'deviceKeyHash',
              'attemptId',
              'attemptToken',
              'deviceKey',
            ])
              delete safeUserData[key];
            return safeUserData;
          })(),
          answers: fallbackAnswers,
        });
      }
    }
    // Newest submitted response / most recently active attempt appears first.
    responses.sort((a: any, b: any) => {
      const timeA =
        new Date(a.timestamp || a.submittedAt || a.startedAt || 0).getTime() ||
        0;
      const timeB =
        new Date(b.timestamp || b.submittedAt || b.startedAt || 0).getTime() ||
        0;
      return timeB - timeA || String(a.id).localeCompare(String(b.id));
    });
    const chronologicalSubmitted = responses
      .filter((response: any) => response.status !== 'in_progress')
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(a.submittedAt || a.timestamp || 0).getTime() -
          new Date(b.submittedAt || b.timestamp || 0).getTime(),
      );
    const combinedTotal =
      (totalCount ?? rows.length) + (attemptCount ?? attempts.length);
    const availableCount = Math.min(combinedTotal, 1000);
    const page = responses.slice(0, limit);
    let submittedSeenOnPage = 0;
    for (const response of page) {
      if (response.status === 'in_progress') continue;
      response.takerNumber = Math.max(
        1,
        (totalCount ?? chronologicalSubmitted.length) -
          (cursor?.submittedSeen || 0) -
          submittedSeenOnPage,
      );
      submittedSeenOnPage += 1;
    }
    const hasMore = availableCount > seenBefore + page.length;
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
            try {
              const { data: signed } = await admin.storage
                .from('quiz-response-media')
                .createSignedUrl(answer.fileUrl, 3600);
              return signed?.signedUrl ?
                  { ...answer, fileUrl: signed.signedUrl }
                : answer;
            } catch {
              // Keep response and attempt data visible when private media is unavailable.
              return answer;
            }
          }),
        ),
      })),
    );
    const lastResponse = page[page.length - 1];
    const nextCursor =
      hasMore && lastResponse ?
        JSON.stringify({
          timestamp:
            lastResponse.timestamp ||
            lastResponse.submittedAt ||
            lastResponse.startedAt,
          id: lastResponse.id,
          seen: seenBefore + page.length,
          submittedSeen: (cursor?.submittedSeen || 0) + submittedSeenOnPage,
        })
      : null;
    let pollResults:
      | Array<{
          questionId: string;
          text: string;
          category: string;
          totalVotes: number;
          options: Array<{ label: string; votes: number }>;
        }>
      | undefined;
    let pollTruncated = false;
    if (quiz.type === 'survey' && quiz.settings?.surveyType === 'poll') {
      const { data: voteRows, error: voteError } = await admin
        .from('quiz_responses')
        .select('answers')
        .eq('quiz_id', quiz.id)
        .order('timestamp', { ascending: false })
        .range(0, 999);
      if (voteError) throw voteError;
      pollTruncated = (totalCount || 0) > 1000;
      const tallies = new Map<
        string,
        { text: string; category: string; votes: Map<string, number> }
      >();
      for (const voteRow of voteRows || []) {
        for (const rawAnswer of Array.isArray(voteRow.answers) ?
          voteRow.answers
        : []) {
          if (!rawAnswer || typeof rawAnswer !== 'object') continue;
          const answer = rawAnswer as Record<string, any>;
          if (
            answer.passed ||
            answer.answer === undefined ||
            answer.answer === null ||
            answer.answer === ''
          )
            continue;
          const question =
            (
              answer.questionSnapshot &&
              typeof answer.questionSnapshot === 'object'
            ) ?
              answer.questionSnapshot
            : null;
          if (!question || typeof answer.questionId !== 'string') continue;
          const tally = tallies.get(answer.questionId) || {
            text: String(question.text || 'Question'),
            category: String(question.category || 'General'),
            votes: new Map<string, number>(),
          };
          const selections =
            Array.isArray(answer.answer) ? answer.answer : [answer.answer];
          for (const selection of selections) {
            const options =
              Array.isArray(question.options) ? question.options : [];
            const option =
              options.find(
                (item: any, index: number) =>
                  String(item?.id ?? index) === String(selection),
              ) || options[Number(selection)];
            const label = String(option?.text ?? selection).trim();
            if (label)
              tally.votes.set(label, (tally.votes.get(label) || 0) + 1);
          }
          tallies.set(answer.questionId, tally);
        }
      }
      pollResults = [...tallies.entries()].map(([questionId, value]) => ({
        questionId,
        text: value.text,
        category: value.category,
        totalVotes: [...value.votes.values()].reduce(
          (sum, votes) => sum + votes,
          0,
        ),
        options: [...value.votes.entries()]
          .map(([label, votes]) => ({ label, votes }))
          .sort((a, b) => b.votes - a.votes),
      }));
    }
    return NextResponse.json(
      {
        responses: signedPage,
        nextOffset: null,
        nextCursor,
        hasMore,
        totalCount: combinedTotal,
        maxAvailableCount: availableCount,
        truncated: combinedTotal > availableCount,
        pollResults,
        pollTruncated,
        submittedCount: totalCount ?? rows.length,
        activeCount: attemptCount ?? attempts.length,
        attemptsUnavailable,
        responsesPublicId:
          typeof quiz.settings?.publicResponsesId === 'string' ?
            quiz.settings.publicResponsesId
          : null,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error(
      '[api/quiz-responses/list] Load failed:',
      error instanceof Error ? error.stack || error.message : error,
    );
    return NextResponse.json(
      {
        error: 'Could not load assessment responses.',
        ...(process.env.NODE_ENV !== 'production' ?
          {
            diagnostic:
              error instanceof Error ?
                error.message.slice(0, 300)
              : 'Unknown response loading error.',
          }
        : {}),
      },
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
    const { data: attempts, error: attemptsError } = await admin
      .from('quiz_attempts')
      .select('id,answers')
      .eq('quiz_id', quizId);
    if (attemptsError) throw attemptsError;
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
    const attemptMediaPaths = (attempts || []).flatMap((attempt: any) => {
      const data =
        attempt.answers && typeof attempt.answers === 'object' ?
          attempt.answers
        : {};
      return Object.entries(data).flatMap(([key, answer]: [string, any]) => {
        if (key.startsWith('__') || !answer || typeof answer !== 'object')
          return [];
        const path = answer.fileUrl;
        return (
            typeof path === 'string' &&
              !path.startsWith('http') &&
              !path.startsWith('data:') &&
              path.startsWith(`${quizId}/`)
          ) ?
            [path]
          : [];
      });
    });
    mediaPaths.push(...attemptMediaPaths);
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
    const { error: deleteAttemptsError } = await admin
      .from('quiz_attempts')
      .delete()
      .eq('quiz_id', quizId);
    if (deleteAttemptsError) throw deleteAttemptsError;
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
