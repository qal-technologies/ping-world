import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { readJsonWithinLimit } from '@/lib/api-auth';
import { verifyQuizAccessToken } from '@/lib/quiz/private-access-token';

export const dynamic = 'force-dynamic';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');

function durationSeconds(quiz: Record<string, any>) {
  const settings = quiz.settings && typeof quiz.settings === 'object' ? quiz.settings : {};
  const timer = settings.timer && typeof settings.timer === 'object' ? settings.timer : {};
  const raw = timer.hasTimer;
  if (!raw) return null;
  const value = typeof raw === 'number' ? raw : Number(timer.duration || 10);
  const unit = settings.timerUnit || timer.unit || 'minutes';
  return Math.max(1, value) * (unit === 'seconds' ? 1 : unit === 'hours' ? 3600 : 60);
}

function remainingTime(quiz: Record<string, any>, startedAt: string) {
  const duration = durationSeconds(quiz);
  return duration === null ? null : Math.max(0, duration - Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(ip, 'api:quiz-attempt', 60, 60_000).limited) {
    return NextResponse.json({ error: 'Too many attempt saves. Try again shortly.' }, { status: 429 });
  }

  try {
    const body = await readJsonWithinLimit(request, 512 * 1024) as Record<string, any>;
    const quizId = typeof body.quizId === 'string' ? body.quizId : '';
    const attemptId = typeof body.attemptId === 'string' ? body.attemptId : '';
    if (!uuidPattern.test(quizId) || !uuidPattern.test(attemptId)) {
      return NextResponse.json({ error: 'Invalid attempt.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: quiz, error: quizError } = await admin.from('quizzes')
      .select('id,questions,settings,expires_at,"canGoBack",allowRetry').eq('id', quizId).maybeSingle();
    if (quizError || !quiz || (quiz.expires_at && new Date(quiz.expires_at).getTime() < Date.now())) {
      return NextResponse.json({ error: 'Assessment not found or expired.' }, { status: 404 });
    }
    if (quiz.settings?.moderationStatus === 'under_review') {
      return NextResponse.json({ error: 'This assessment is paused while it is reviewed.' }, { status: 423 });
    }

    const action = body.action === 'start' ? 'start' : 'save';
    const { data: attempt, error: attemptError } = await admin.from('quiz_attempts')
      .select('*').eq('id', attemptId).maybeSingle();
    if (attemptError) throw attemptError;

    if (action === 'start') {
      if (attempt) {
        const token = typeof body.attemptToken === 'string' ? body.attemptToken : '';
        if (!token || hashToken(token) !== attempt.attempt_token_hash || attempt.quiz_id !== quizId) {
          return NextResponse.json({ error: 'Attempt recovery failed.' }, { status: 403 });
        }
        if (attempt.status !== 'in_progress') return NextResponse.json({ error: 'Attempt is already closed.' }, { status: 409 });
        const remainingSeconds = remainingTime(quiz, attempt.started_at);
        if (remainingSeconds === 0) {
          await admin.from('quiz_attempts').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', attemptId);
          return NextResponse.json({ error: 'Assessment time has expired.' }, { status: 410 });
        }
        if (body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)) {
          const questionIds = new Set((Array.isArray(quiz.questions) ? quiz.questions : []).map((question: any) => String(question.id)));
          const submittedOrder = Array.isArray(body.questionOrder) ? body.questionOrder : attempt.question_order || [];
          const answers = body.answers as Record<string, unknown>;
          if (JSON.stringify(submittedOrder) !== JSON.stringify(attempt.question_order || []) ||
            Object.entries(answers).length > questionIds.size ||
            Object.entries(answers).some(([id, value]) => !questionIds.has(id) || JSON.stringify(value).length > 32_000)) {
            return NextResponse.json({ error: 'Invalid attempt snapshot.' }, { status: 400 });
          }
          const currentQuestionIndex = Math.max(0, Math.min(Number(body.currentQuestionIndex) || 0, Math.max(0, submittedOrder.length - 1)));
          if (quiz.canGoBack === false && currentQuestionIndex < Number(attempt.current_question_index || 0)) {
            return NextResponse.json({ error: 'Backward navigation is disabled for this attempt.' }, { status: 409 });
          }
          const { error } = await admin.from('quiz_attempts').update({
            answers, user_data: body.userData || attempt.user_data || {}, current_question_index: currentQuestionIndex,
            updated_at: new Date().toISOString(),
          }).eq('id', attemptId).eq('status', 'in_progress');
          if (error) throw error;
          attempt.answers = answers;
          attempt.user_data = body.userData || attempt.user_data || {};
          attempt.current_question_index = currentQuestionIndex;
        }
        return NextResponse.json({
          attemptId, attemptToken: token, startedAt: attempt.started_at,
          answers: attempt.answers || {}, questionOrder: attempt.question_order || [],
          userData: attempt.user_data || {}, currentQuestionIndex: attempt.current_question_index || 0,
          remainingSeconds,
        }, { headers: { 'Cache-Control': 'no-store' } });
      }
      const settings = quiz.settings && typeof quiz.settings === 'object' ? quiz.settings : {};
      if (settings.isPrivate && !verifyQuizAccessToken(typeof body.privateQuizAccessToken === 'string' ? body.privateQuizAccessToken : '', quizId)) {
        return NextResponse.json({ error: 'Private assessment access is required.' }, { status: 403 });
      }
      const allowRetry = Boolean(settings.allowRetry ?? quiz.allowRetry);
      const rawDeviceKey = typeof body.deviceKey === 'string' ? body.deviceKey : '';
      if (!allowRetry && rawDeviceKey.length < 48) {
        return NextResponse.json({ error: 'Browser storage is required for this one-attempt assessment.' }, { status: 400 });
      }
      const deviceKeyHash = !allowRetry ? hashToken(rawDeviceKey) : null;
      if (deviceKeyHash) {
        const { data: previousAttempt, error: deviceCheckError } = await admin.from('quiz_attempts')
          .select('id').eq('quiz_id', quizId).eq('device_key_hash', deviceKeyHash).limit(1).maybeSingle();
        if (deviceCheckError) throw deviceCheckError;
        if (previousAttempt) return NextResponse.json({ error: 'This device has already used its attempt.' }, { status: 409 });
      }
      const suppliedToken = typeof body.attemptToken === 'string' ? body.attemptToken : '';
      if (suppliedToken && suppliedToken.length < 48) return NextResponse.json({ error: 'Invalid attempt token.' }, { status: 400 });
      const attemptToken = suppliedToken || randomBytes(32).toString('base64url');
      const startedAt = new Date().toISOString();
      const questionOrder = Array.isArray(body.questionOrder) ? body.questionOrder.slice(0, 200) : [];
      const questionIds = new Set((Array.isArray(quiz.questions) ? quiz.questions : []).map((question: any) => String(question.id)));
      if (questionOrder.some((id: unknown) => typeof id !== 'string' || !questionIds.has(id)) || new Set(questionOrder).size !== questionOrder.length) {
        return NextResponse.json({ error: 'Invalid question order.' }, { status: 400 });
      }
      const initialAnswers = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers : {};
      const answerEntries = Object.entries(initialAnswers);
      if (answerEntries.length > questionIds.size || answerEntries.some(([id, value]) => !questionIds.has(id) || JSON.stringify(value).length > 32_000)) {
        return NextResponse.json({ error: 'Invalid answer snapshot.' }, { status: 400 });
      }
      const initialIndex = Math.max(0, Math.min(Number(body.currentQuestionIndex) || 0, Math.max(0, questionOrder.length - 1)));
      const initialUserData = body.userData && typeof body.userData === 'object' && !Array.isArray(body.userData) ? body.userData : {};
      const { error } = await admin.from('quiz_attempts').insert({
        id: attemptId, quiz_id: quizId, attempt_token_hash: hashToken(attemptToken),
        device_key_hash: deviceKeyHash,
        started_at: startedAt, updated_at: startedAt, status: 'in_progress',
        answers: initialAnswers, question_order: questionOrder, user_data: initialUserData, current_question_index: initialIndex,
      });
      if (error?.code === '23505' && deviceKeyHash) {
        return NextResponse.json({ error: 'This device has already used its attempt.' }, { status: 409 });
      }
      if (error) throw error;
      return NextResponse.json({ attemptId, attemptToken, startedAt, answers: initialAnswers, questionOrder, userData: initialUserData, currentQuestionIndex: initialIndex, remainingSeconds: remainingTime(quiz, startedAt) }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const token = typeof body.attemptToken === 'string' ? body.attemptToken : '';
    if (!attempt || attempt.quiz_id !== quizId || !token || hashToken(token) !== attempt.attempt_token_hash) {
      return NextResponse.json({ error: 'Attempt save was not authorized.' }, { status: 403 });
    }
    if (attempt.status !== 'in_progress') return NextResponse.json({ error: 'Attempt is already closed.' }, { status: 409 });
    const remainingSeconds = remainingTime(quiz, attempt.started_at);
    if (remainingSeconds === 0) {
      await admin.from('quiz_attempts').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', attemptId);
      return NextResponse.json({ error: 'Assessment time has expired.' }, { status: 410 });
    }

    const questionIds = new Set((Array.isArray(quiz.questions) ? quiz.questions : []).map((question: any) => String(question.id)));
    const answers = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers : {};
    const answerEntries = Object.entries(answers);
    if (answerEntries.length > questionIds.size || answerEntries.some(([id, value]) => !questionIds.has(id) || JSON.stringify(value).length > 32_000)) {
      return NextResponse.json({ error: 'Invalid answer snapshot.' }, { status: 400 });
    }
    const submittedOrder = Array.isArray(body.questionOrder) ? body.questionOrder.slice(0, 200) : attempt.question_order || [];
    const questionOrder: string[] = attempt.question_order || [];
    if (submittedOrder.some((id: unknown) => typeof id !== 'string' || !questionIds.has(id)) ||
      new Set(submittedOrder).size !== submittedOrder.length ||
      JSON.stringify(submittedOrder) !== JSON.stringify(questionOrder)) {
      return NextResponse.json({ error: 'Invalid question order.' }, { status: 400 });
    }
    const currentQuestionIndex = Math.max(0, Math.min(Number(body.currentQuestionIndex) || 0, Math.max(0, questionOrder.length - 1)));
    if (quiz.canGoBack === false && attempt.current_question_index !== null && currentQuestionIndex < Number(attempt.current_question_index)) {
      return NextResponse.json({ error: 'Backward navigation is disabled for this attempt.' }, { status: 409 });
    }
    const userData = body.userData && typeof body.userData === 'object' && !Array.isArray(body.userData) ? body.userData : attempt.user_data || {};
    const { error } = await admin.from('quiz_attempts').update({
      answers, question_order: questionOrder, current_question_index: currentQuestionIndex,
      user_data: userData, updated_at: new Date().toISOString(),
    }).eq('id', attemptId).eq('status', 'in_progress');
    if (error) throw error;
    return NextResponse.json({ success: true, savedAt: new Date().toISOString(), remainingSeconds }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
      return NextResponse.json({ error: 'Attempt snapshot is too large.' }, { status: 413 });
    }
    console.error('[api/quiz-attempts] Attempt persistence failed.');
    return NextResponse.json({ error: 'Attempt could not be synchronized.' }, { status: 503 });
  }
}
