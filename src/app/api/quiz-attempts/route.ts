import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { getRequestUser, readJsonWithinLimit } from '@/lib/api-auth';
import { verifyQuizAccessToken } from '@/lib/quiz/private-access-token';

export const dynamic = 'force-dynamic';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hashToken = (value: string) =>
  createHash('sha256').update(value).digest('hex');

function durationSeconds(quiz: Record<string, any>) {
  const settings =
    quiz.settings && typeof quiz.settings === 'object' ? quiz.settings : {};
  const timer =
    settings.timer && typeof settings.timer === 'object' ? settings.timer : {};
  const raw = timer.hasTimer;
  if (!raw) return null;
  const value = typeof raw === 'number' ? raw : Number(timer.duration || 10);
  const unit = settings.timerUnit || timer.unit || 'minutes';
  return (
    Math.max(1, value) *
    (unit === 'seconds' ? 1
    : unit === 'hours' ? 3600
    : 60)
  );
}

function remainingTime(quiz: Record<string, any>, startedAt: string) {
  const duration = durationSeconds(quiz);
  return duration === null ? null : (
      Math.max(
        0,
        duration -
          Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
      )
    );
}

const RESERVED_ATTEMPT_KEYS = new Set([
  '__visitedQuestionIds',
  '__branchHistory',
  '__signedUser',
  '__questionSnapshots',
  '__calculateAllBranches',
  '__attemptSettings',
]);

function sanitizeSnapshotValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return undefined;
  if (typeof value === 'string') return /^data:/i.test(value) ? undefined : value.slice(0, 10_000);
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 500).map((entry) => sanitizeSnapshotValue(entry, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !/(?:base64|dataurl|bloburl|rawbytes)/i.test(key))
      .slice(0, 200)
      .flatMap(([key, entry]) => {
        const sanitized = sanitizeSnapshotValue(entry, depth + 1);
        return sanitized === undefined ? [] : [[key.slice(0, 120), sanitized]];
      }));
  }
  return undefined;
}

function snapshotQuestion(question: Record<string, any>) {
  const snapshot = sanitizeSnapshotValue(question);
  return snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
    ? { ...(snapshot as Record<string, unknown>), id: String(question.id) }
    : { id: String(question.id), text: String(question.text ?? ''), type: String(question.type ?? '') };
}

function validIds(values: unknown, knownIds: Set<string>) {
  if (!Array.isArray(values)) return [] as string[];
  return [
    ...new Set(
      values.filter(
        (id): id is string => typeof id === 'string' && knownIds.has(id),
      ),
    ),
  ].slice(0, 200);
}

function normalizeBranchHistory(value: unknown, knownIds: Set<string>) {
  if (!Array.isArray(value)) return [] as Array<Record<string, unknown>>;
  return value.slice(-200).flatMap((entry: any) => {
    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof entry.fromQuestionId !== 'string' ||
      !knownIds.has(entry.fromQuestionId)
    )
      return [];
    const targetQuestionId =
      (
        typeof entry.targetQuestionId === 'string' &&
        knownIds.has(entry.targetQuestionId)
      ) ?
        entry.targetQuestionId
      : undefined;
    return [
      {
        fromQuestionId: entry.fromQuestionId,
        ...(targetQuestionId ? { targetQuestionId } : {}),
        category:
          typeof entry.category === 'string' ?
            entry.category.slice(0, 120)
          : undefined,
        questionIds: validIds(entry.questionIds, knownIds),
        at:
          typeof entry.at === 'string' ?
            entry.at.slice(0, 40)
          : new Date().toISOString(),
      },
    ];
  });
}

async function clearAttemptMedia(
  admin: ReturnType<typeof getSupabaseAdmin>,
  quizId: string,
  attemptId: string,
) {
  const storage = admin.storage.from('quiz-response-media');
  const prefix = `${quizId}/${attemptId}`;
  for (let page = 0; page < 100; page += 1) {
    const { data, error } = await storage.list(prefix, { limit: 100, offset: 0 });
    if (error) throw error;
    if (!data?.length) break;
    const paths = data
      .filter((item) => item.name && item.name !== '.')
      .map((item) => `${prefix}/${item.name}`);
    if (paths.length) {
      const { error: removeError } = await storage.remove(paths);
      if (removeError) throw removeError;
    }
    if (data.length < 100) break;
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(ip, 'api:quiz-attempt', 60, 60_000).limited) {
    return NextResponse.json(
      { error: 'Too many attempt saves. Try again shortly.' },
      { status: 429 },
    );
  }

  try {
    const body = (await readJsonWithinLimit(request, 512 * 1024)) as Record<
      string,
      any
    >;
    const quizId = typeof body.quizId === 'string' ? body.quizId : '';
    const attemptId = typeof body.attemptId === 'string' ? body.attemptId : '';
    if (!uuidPattern.test(quizId) || !uuidPattern.test(attemptId)) {
      return NextResponse.json({ error: 'Invalid attempt.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: quiz, error: quizError } = await admin
      .from('quizzes')
      .select('id,user_id,questions,settings,expires_at,"canGoBack",allowRetry')
      .eq('id', quizId)
      .maybeSingle();
    if (
      quizError ||
      !quiz ||
      (quiz.expires_at && new Date(quiz.expires_at).getTime() < Date.now())
    ) {
      return NextResponse.json(
        { error: 'Assessment not found or expired.' },
        { status: 404 },
      );
    }
    if (quiz.settings?.moderationStatus === 'under_review') {
      return NextResponse.json(
        { error: 'This assessment is paused while it is reviewed.' },
        { status: 423 },
      );
    }

    const action =
      body.action === 'start' ? 'start'
      : body.action === 'quit' ? 'quit'
      : 'save';
    const { data: attempt, error: attemptError } = await admin
      .from('quiz_attempts')
      .select('*')
      .eq('id', attemptId)
      .maybeSingle();
    if (attemptError) throw attemptError;

    if (action === 'quit') {
      const token =
        typeof body.attemptToken === 'string' ? body.attemptToken : '';
      if (!attempt)
        return NextResponse.json({
          success: true,
          completed: false,
          alreadyCleaned: true,
        });
      if (
        attempt.quiz_id !== quizId ||
        !token ||
        hashToken(token) !== attempt.attempt_token_hash
      ) {
        return NextResponse.json(
          { error: 'Attempt cleanup was not authorized.' },
          { status: 403 },
        );
      }
      if (attempt.status === 'submitted')
        return NextResponse.json({ success: true, completed: true });
      const attemptSettings =
        attempt.answers?.__attemptSettings || quiz.settings || {};
      const allowRetry = Boolean(attemptSettings.allowRetry ?? quiz.allowRetry);
      if (allowRetry) {
        const { error } = await admin
          .from('quiz_attempts')
          .delete()
          .eq('id', attemptId)
          .eq('quiz_id', quizId)
          .eq('attempt_token_hash', hashToken(token))
          .eq('status', attempt.status);
        if (error) throw error;
      } else {
        const { error } = await admin
          .from('quiz_attempts')
          .update({
            status: 'expired',
            answers: {},
            user_data: {},
            question_order: [],
            current_question_index: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', attemptId)
          .eq('quiz_id', quizId)
          .eq('attempt_token_hash', hashToken(token))
          .neq('status', 'submitted');
        if (error) throw error;
      }
      try {
        await clearAttemptMedia(admin, quizId, attemptId);
      } catch (cleanupError) {
        console.warn(
          '[api/quiz-attempts] Attempt media cleanup deferred:',
          cleanupError instanceof Error ? cleanupError.message : 'unknown',
        );
      }
      return NextResponse.json({ success: true, completed: !allowRetry });
    }

    if (action === 'start') {
      if (attempt) {
        const token =
          typeof body.attemptToken === 'string' ? body.attemptToken : '';
        if (
          !token ||
          hashToken(token) !== attempt.attempt_token_hash ||
          attempt.quiz_id !== quizId
        ) {
          return NextResponse.json(
            { error: 'Attempt recovery failed.' },
            { status: 403 },
          );
        }
        if (attempt.status !== 'in_progress')
          return NextResponse.json(
            { error: 'Attempt is already closed.' },
            { status: 409 },
          );
        const remainingSeconds = remainingTime(quiz, attempt.started_at);
        if (
          body.answers &&
          typeof body.answers === 'object' &&
          !Array.isArray(body.answers)
        ) {
          const questionList =
            Array.isArray(quiz.questions) ? quiz.questions : [];
          const questionIds = new Set([
            ...questionList.map((question: any) => String(question.id)),
            ...(attempt.question_order || []),
            ...Object.keys(attempt.answers?.__questionSnapshots || {}),
          ]);
          const submittedOrder =
            Array.isArray(body.questionOrder) ?
              body.questionOrder
            : attempt.question_order || [];
          const answers = Object.fromEntries(
            Object.entries(body.answers as Record<string, unknown>).filter(
              ([key]) => !RESERVED_ATTEMPT_KEYS.has(key),
            ),
          );
          if (
            submittedOrder.some((id: unknown) => typeof id !== 'string' || !(attempt.question_order || []).includes(id)) ||
            new Set(submittedOrder).size !== submittedOrder.length ||
            Object.entries(answers).length > questionIds.size ||
            Object.entries(answers).some(
              ([id, value]) =>
                !questionIds.has(id) || JSON.stringify(value).length > 32_000,
            )
          ) {
            return NextResponse.json(
              { error: 'Invalid attempt snapshot.' },
              { status: 400 },
            );
          }
          const currentQuestionIndex = Math.max(
            0,
            Math.min(
              Number(body.currentQuestionIndex) || 0,
              Math.max(0, submittedOrder.length - 1),
            ),
          );
          if (
            quiz.canGoBack === false &&
            currentQuestionIndex < Number(attempt.current_question_index || 0)
          ) {
            return NextResponse.json(
              { error: 'Backward navigation is disabled for this attempt.' },
              { status: 409 },
            );
          }
          const prior =
            attempt.answers && typeof attempt.answers === 'object' ?
              attempt.answers
            : {};
          const visitedIds = validIds(body.visitedQuestionIds, questionIds);
          const branchHistory = normalizeBranchHistory(
            body.branchHistory,
            questionIds,
          );
          const oldSnapshots =
            (
              prior.__questionSnapshots &&
              typeof prior.__questionSnapshots === 'object'
            ) ?
              prior.__questionSnapshots
            : {};
          const calculateAllBranches = Boolean(
            prior.__calculateAllBranches ?? body.calculateAllBranches,
          );
          const snapshotIds = new Set([
            ...Object.keys(oldSnapshots),
            ...submittedOrder,
            ...visitedIds,
          ]);
          if (calculateAllBranches || quiz.settings?.layout === 'scroll-all')
            questionList.forEach((question: any) =>
              snapshotIds.add(String(question.id)),
            );
          const questionSnapshots = {
            ...Object.fromEntries(
            questionList
              .filter((question: any) => snapshotIds.has(String(question.id)))
              .map((question: any) => [
                String(question.id),
                snapshotQuestion(question),
              ]),
            ),
            ...oldSnapshots,
          };
          const attemptKnownIds = new Set([...questionIds, ...(attempt.question_order || []), ...Object.keys(oldSnapshots)]);
          const mergedAnswers = {
            ...prior,
            ...answers,
            __visitedQuestionIds: validIds(
              [
                ...validIds(prior.__visitedQuestionIds, attemptKnownIds),
                ...validIds(body.visitedQuestionIds, attemptKnownIds),
              ],
              attemptKnownIds,
            ),
            __branchHistory:
              normalizeBranchHistory(body.branchHistory, attemptKnownIds).length ? normalizeBranchHistory(body.branchHistory, attemptKnownIds) : (
                prior.__branchHistory || []
              ),
            __questionSnapshots: questionSnapshots,
            __calculateAllBranches: calculateAllBranches,
            __attemptSettings: prior.__attemptSettings || quiz.settings || {},
          };
          const { error } = await admin
            .from('quiz_attempts')
            .update({
              answers: mergedAnswers,
              user_data: body.userData || attempt.user_data || {},
              current_question_index: currentQuestionIndex,
              updated_at: new Date().toISOString(),
            })
            .eq('id', attemptId)
            .eq('status', 'in_progress');
          if (error) throw error;
          attempt.answers = mergedAnswers;
          attempt.user_data = body.userData || attempt.user_data || {};
          attempt.current_question_index = currentQuestionIndex;
        }
        const visibleAnswers = Object.fromEntries(
          Object.entries(attempt.answers || {}).filter(([key]) => !RESERVED_ATTEMPT_KEYS.has(key)),
        );
        return NextResponse.json(
          {
            attemptId,
            attemptToken: token,
            startedAt: attempt.started_at,
            answers: visibleAnswers,
            questionOrder: attempt.question_order || [],
            userData: attempt.user_data || {},
            currentQuestionIndex: attempt.current_question_index || 0,
            remainingSeconds,
          },
          { headers: { 'Cache-Control': 'no-store' } },
        );
      }
      const settings =
        quiz.settings && typeof quiz.settings === 'object' ? quiz.settings : {};
      if (
        settings.isPrivate &&
        !verifyQuizAccessToken(
          typeof body.privateQuizAccessToken === 'string' ?
            body.privateQuizAccessToken
          : '',
          quizId,
        )
      ) {
        return NextResponse.json(
          { error: 'Private assessment access is required.' },
          { status: 403 },
        );
      }
      const allowRetry = Boolean(settings.allowRetry ?? quiz.allowRetry);
      const rawDeviceKey =
        typeof body.deviceKey === 'string' ? body.deviceKey : '';
      if (!allowRetry && rawDeviceKey.length < 48) {
        return NextResponse.json(
          {
            error:
              'Browser storage is required for this one-attempt assessment.',
          },
          { status: 400 },
        );
      }
      const deviceKeyHash = !allowRetry ? hashToken(rawDeviceKey) : null;
      if (deviceKeyHash) {
        const { data: previousAttempt, error: deviceCheckError } = await admin
          .from('quiz_attempts')
          .select('id')
          .eq('quiz_id', quizId)
          .eq('device_key_hash', deviceKeyHash)
          .limit(1)
          .maybeSingle();
        if (deviceCheckError) throw deviceCheckError;
        if (previousAttempt)
          return NextResponse.json(
            { error: 'This device has already used its attempt.' },
            { status: 409 },
          );
      }
      const suppliedToken =
        typeof body.attemptToken === 'string' ? body.attemptToken : '';
      if (suppliedToken && suppliedToken.length < 48)
        return NextResponse.json(
          { error: 'Invalid attempt token.' },
          { status: 400 },
        );
      const attemptToken =
        suppliedToken || randomBytes(32).toString('base64url');
      const startedAt = new Date().toISOString();
      const questionList = Array.isArray(quiz.questions) ? quiz.questions : [];
      const questionOrder =
        Array.isArray(body.questionOrder) ?
          body.questionOrder.slice(0, 200)
        : [];
      const questionIds = new Set(
        questionList.map((question: any) => String(question.id)),
      );
      if (
        questionOrder.some(
          (id: unknown) => typeof id !== 'string' || !questionIds.has(id),
        ) ||
        new Set(questionOrder).size !== questionOrder.length
      ) {
        return NextResponse.json(
          { error: 'Invalid question order.' },
          { status: 400 },
        );
      }
      const initialAnswersInput =
        (
          body.answers &&
          typeof body.answers === 'object' &&
          !Array.isArray(body.answers)
        ) ?
          body.answers
        : {};
      const initialAnswers = Object.fromEntries(
        Object.entries(initialAnswersInput).filter(
          ([key]) => !RESERVED_ATTEMPT_KEYS.has(key),
        ),
      );
      const answerEntries = Object.entries(initialAnswers);
      if (
        answerEntries.length > questionIds.size ||
        answerEntries.some(
          ([id, value]) =>
            !questionIds.has(id) || JSON.stringify(value).length > 32_000,
        )
      ) {
        return NextResponse.json(
          { error: 'Invalid answer snapshot.' },
          { status: 400 },
        );
      }
      const initialIndex = Math.max(
        0,
        Math.min(
          Number(body.currentQuestionIndex) || 0,
          Math.max(0, questionOrder.length - 1),
        ),
      );
      const initialUserData =
        (
          body.userData &&
          typeof body.userData === 'object' &&
          !Array.isArray(body.userData)
        ) ?
          body.userData
        : {};
      const visitedIds = validIds(body.visitedQuestionIds, questionIds);
      const calculateAllBranches = Boolean(
        body.calculateAllBranches || settings.calculateAllBranches,
      );
      const snapshotIds = new Set(questionList.map((question: any) => String(question.id)));
      const questionSnapshots = Object.fromEntries(
        questionList
          .filter((question: any) => snapshotIds.has(String(question.id)))
          .map((question: any) => [
            String(question.id),
            snapshotQuestion(question),
          ]),
      );
      const signedUser = await getRequestUser(request);
      let signedIdentity: Record<string, unknown> | null = null;
      if (signedUser?.id) {
        const { data: profile } = await admin
          .from('profiles')
          .select('username,display_name,email')
          .eq('id', signedUser.id)
          .maybeSingle();
        signedIdentity = {
          id: signedUser.id,
          username:
            profile?.username || signedUser.user_metadata?.username || '',
          displayName:
            profile?.display_name ||
            signedUser.user_metadata?.display_name ||
            '',
          email: signedUser.email || profile?.email || '',
        };
      }
      const attemptAnswers = {
        ...initialAnswers,
        __visitedQuestionIds: visitedIds,
        __branchHistory: normalizeBranchHistory(
          body.branchHistory,
          questionIds,
        ),
        __questionSnapshots: questionSnapshots,
        __calculateAllBranches: calculateAllBranches,
        __attemptSettings: settings,
        ...(signedIdentity ? { __signedUser: signedIdentity } : {}),
      };
      const { error } = await admin.from('quiz_attempts').insert({
        id: attemptId,
        quiz_id: quizId,
        attempt_token_hash: hashToken(attemptToken),
        device_key_hash: deviceKeyHash,
        started_at: startedAt,
        updated_at: startedAt,
        status: 'in_progress',
        answers: attemptAnswers,
        question_order: questionOrder,
        user_data: initialUserData,
        current_question_index: initialIndex,
      });
      if (error?.code === '23505' && deviceKeyHash) {
        return NextResponse.json(
          { error: 'This device has already used its attempt.' },
          { status: 409 },
        );
      }
      if (error) throw error;
      return NextResponse.json(
        {
          attemptId,
          attemptToken,
          startedAt,
          answers: initialAnswers,
          questionOrder,
          userData: initialUserData,
          currentQuestionIndex: initialIndex,
          remainingSeconds: remainingTime(quiz, startedAt),
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const token =
      typeof body.attemptToken === 'string' ? body.attemptToken : '';
    if (
      !attempt ||
      attempt.quiz_id !== quizId ||
      !token ||
      hashToken(token) !== attempt.attempt_token_hash
    ) {
      return NextResponse.json(
        { error: 'Attempt save was not authorized.' },
        { status: 403 },
      );
    }
    if (attempt.status !== 'in_progress')
      return NextResponse.json(
        { error: 'Attempt is already closed.' },
        { status: 409 },
      );
    const remainingSeconds = remainingTime(quiz, attempt.started_at);

    const questionList = Array.isArray(quiz.questions) ? quiz.questions : [];
    const questionIds = new Set(
      questionList.map((question: any) => String(question.id)),
    );
    const prior = attempt.answers && typeof attempt.answers === 'object' ? attempt.answers : {};
    const oldSnapshots = prior.__questionSnapshots && typeof prior.__questionSnapshots === 'object' ? prior.__questionSnapshots : {};
    const attemptKnownIds = new Set([...questionIds, ...(attempt.question_order || []), ...Object.keys(oldSnapshots)]);
    const answersInput =
      (
        body.answers &&
        typeof body.answers === 'object' &&
        !Array.isArray(body.answers)
      ) ?
        body.answers
      : {};
    const answers = Object.fromEntries(
      Object.entries(answersInput).filter(
        ([key]) => !RESERVED_ATTEMPT_KEYS.has(key),
      ),
    );
    const answerEntries = Object.entries(answers);
    if (
      answerEntries.length > attemptKnownIds.size ||
      answerEntries.some(
        ([id, value]) =>
          !attemptKnownIds.has(id) || JSON.stringify(value).length > 32_000,
      )
    ) {
      return NextResponse.json(
        { error: 'Invalid answer snapshot.' },
        { status: 400 },
      );
    }
    const submittedOrder =
      Array.isArray(body.questionOrder) ?
        body.questionOrder.slice(0, 200)
      : attempt.question_order || [];
    const questionOrder: string[] = attempt.question_order || [];
    if (
      submittedOrder.some(
        (id: unknown) => typeof id !== 'string' || !questionOrder.includes(id),
      ) ||
      new Set(submittedOrder).size !== submittedOrder.length ||
      submittedOrder.some((id: string, index: number) => index > 0 && questionOrder.indexOf(id) <= questionOrder.indexOf(submittedOrder[index - 1]))
    ) {
      return NextResponse.json(
        { error: 'Invalid question order.' },
        { status: 400 },
      );
    }
    const currentQuestionIndex = Math.max(
      0,
      Math.min(
        Number(body.currentQuestionIndex) || 0,
        Math.max(0, submittedOrder.length - 1),
      ),
    );
    if (
      quiz.canGoBack === false &&
      attempt.current_question_index !== null &&
      currentQuestionIndex < Number(attempt.current_question_index)
    ) {
      return NextResponse.json(
        { error: 'Backward navigation is disabled for this attempt.' },
        { status: 409 },
      );
    }
    const userData =
      (
        body.userData &&
        typeof body.userData === 'object' &&
        !Array.isArray(body.userData)
      ) ?
        body.userData
      : attempt.user_data || {};
    const visitedIds = validIds(body.visitedQuestionIds, attemptKnownIds);
    const branchHistory = normalizeBranchHistory(
      body.branchHistory,
      attemptKnownIds,
    );
    const calculateAllBranches = Boolean(
      prior.__calculateAllBranches ?? body.calculateAllBranches,
    );
    const snapshotIds = new Set([
      ...Object.keys(oldSnapshots),
      ...submittedOrder,
      ...visitedIds,
    ]);
    if (
      calculateAllBranches ||
      (prior.__attemptSettings || quiz.settings)?.layout === 'scroll-all'
    )
      questionList.forEach((question: any) =>
        snapshotIds.add(String(question.id)),
      );
    const questionSnapshots = {
      ...Object.fromEntries(
      questionList
        .filter((question: any) => snapshotIds.has(String(question.id)))
        .map((question: any) => [
          String(question.id),
          snapshotQuestion(question),
        ]),
      ),
      ...oldSnapshots,
    };
    const mergedAnswers = {
      ...prior,
      ...answers,
      __visitedQuestionIds: validIds(
        [...validIds(prior.__visitedQuestionIds, attemptKnownIds), ...validIds(body.visitedQuestionIds, attemptKnownIds)],
        attemptKnownIds,
      ),
      __branchHistory:
        normalizeBranchHistory(body.branchHistory, attemptKnownIds).length ? normalizeBranchHistory(body.branchHistory, attemptKnownIds) : prior.__branchHistory || [],
      __questionSnapshots: questionSnapshots,
      __calculateAllBranches: calculateAllBranches,
      __attemptSettings: prior.__attemptSettings || quiz.settings || {},
    };
    const { error } = await admin
      .from('quiz_attempts')
      .update({
        answers: mergedAnswers,
        question_order: questionOrder,
        current_question_index: currentQuestionIndex,
        user_data: userData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', attemptId)
      .eq('status', 'in_progress');
    if (error) throw error;
    return NextResponse.json(
      { success: true, savedAt: new Date().toISOString(), remainingSeconds },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
      return NextResponse.json(
        { error: 'Attempt snapshot is too large.' },
        { status: 413 },
      );
    }
    console.error('[api/quiz-attempts] Attempt persistence failed.');
    return NextResponse.json(
      { error: 'Attempt could not be synchronized.' },
      { status: 503 },
    );
  }
}
