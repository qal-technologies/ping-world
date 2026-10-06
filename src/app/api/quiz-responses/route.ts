import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { readJsonWithinLimit } from '@/lib/api-auth';
import { decodeStoredCorrectAnswer } from '@/lib/quiz/quiz-evaluation';

function sameValue(left: unknown, right: unknown) {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item) => right.some((other) => String(item) === String(other)));
  }
  return String(left ?? '').trim() === String(right ?? '').trim();
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(ip, 'api:quiz-response', 12, 60_000).limited) {
    return NextResponse.json({ error: 'Too many submissions. Try again shortly.' }, { status: 429 });
  }
  try {
    const body = await readJsonWithinLimit(request, 2 * 1024 * 1024) as Record<string, unknown>;
    const quizId = typeof body.quizId === 'string' ? body.quizId : '';
    const submitted = body.response && typeof body.response === 'object' ? body.response as Record<string, unknown> : null;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(quizId) || !submitted) {
      return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 });
    }
    const admin = getSupabaseAdmin();
    const { data: quiz, error: quizError } = await admin.from('quizzes')
      .select('id,user_id,title,type,questions,settings,expires_at').eq('id', quizId).maybeSingle();
    if (quizError || !quiz || (quiz.expires_at && new Date(quiz.expires_at).getTime() < Date.now())) {
      return NextResponse.json({ error: 'Assessment not found or expired.' }, { status: 404 });
    }
    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    const questionMap = new Map(questions.map((question: Record<string, unknown>) => [String(question.id), question]));
    let rawAnswers = Array.isArray(submitted.answers) ? submitted.answers.slice(0, questions.length) : [];
    let attempt: Record<string, any> | null = null;
    if (typeof submitted.attemptId === 'string' || typeof submitted.attemptToken === 'string') {
      const attemptId = String(submitted.attemptId || '');
      const attemptToken = String(submitted.attemptToken || '');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId) || attemptToken.length < 48) {
        return NextResponse.json({ error: 'Attempt authorization failed.' }, { status: 403 });
      }
      const { data, error } = await admin.from('quiz_attempts').select('*').eq('id', attemptId).eq('quiz_id', quizId).maybeSingle();
      if (error || !data || createHash('sha256').update(attemptToken).digest('hex') !== data.attempt_token_hash) {
        return NextResponse.json({ error: 'Attempt authorization failed.' }, { status: 403 });
      }
      const verifiedAttempt = data;
      attempt = verifiedAttempt;
      if (verifiedAttempt.status === 'submitted') {
        const { data: prior } = await admin.from('quiz_responses').select('score,total_questions,user_data').eq('id', submitted.submissionId).eq('quiz_id', quizId).maybeSingle();
        if (prior) return NextResponse.json({ success: true, score: prior.score, totalQuestions: prior.total_questions, categoryScores: prior.user_data?.categoryScores || {} }, { status: 200 });
        return NextResponse.json({ error: 'Attempt has already been submitted.' }, { status: 409 });
      }
      if (verifiedAttempt.status !== 'in_progress') return NextResponse.json({ error: 'Attempt is no longer active.' }, { status: 409 });
      const duration = (quiz as any).settings?.timer?.hasTimer;
      if (duration) {
        const unit = (quiz as any).settings?.timerUnit || (quiz as any).settings?.timer?.unit || 'minutes';
        const seconds = Number(duration) * (unit === 'seconds' ? 1 : unit === 'hours' ? 3600 : 60);
        if (Date.now() - new Date(verifiedAttempt.started_at).getTime() > seconds * 1000 + 10_000) {
          await admin.from('quiz_attempts').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', attemptId);
          return NextResponse.json({ error: 'Assessment time has expired.' }, { status: 410 });
        }
      }
      rawAnswers = Object.values(verifiedAttempt.answers || {}).slice(0, questions.length) as any[];
    }
    const answers = rawAnswers.flatMap((raw: unknown) => {
      if (!raw || typeof raw !== 'object') return [];
      const candidate = raw as Record<string, unknown>;
      const questionId = String(candidate.questionId || '');
      const question = questionMap.get(questionId);
      if (!question) return [];
      const answer = candidate.answer;
      let correctValue = decodeStoredCorrectAnswer(question.correctIndex);
      let correct = false;
      if (quiz.type === 'quiz' && question.type === 'input' && (correctValue === null || correctValue === '')) {
        correct = true;
      } else if (quiz.type === 'quiz' && question.type === 'upload') {
        correct = Boolean((candidate as Record<string, any>).fileUrl || answer);
      } else if (quiz.type === 'quiz' && correctValue !== null) {
        if (question.type === 'input') {
          const actual = String(answer ?? '').trim();
          const expected = String(correctValue ?? '').trim();
          correct = question.caseSensitive ? actual === expected : actual.toLowerCase() === expected.toLowerCase();
        } else {
          correct = sameValue(answer, correctValue);
        }
      }
      const cleanAnswer = typeof answer === 'string' ? answer.slice(0, 20_000)
        : Array.isArray(answer) ? answer.filter((value) => typeof value === 'string').slice(0, 100).map((value) => value.slice(0, 2_000))
        : answer && typeof answer === 'object' ? Object.fromEntries(Object.entries(answer as Record<string, unknown>).slice(0, 30))
        : answer;
      return [{ ...candidate, questionId, answer: cleanAnswer, correct }];
    });
    const userDataInput = attempt?.user_data && typeof attempt.user_data === 'object'
      ? attempt.user_data
      : submitted.userData && typeof submitted.userData === 'object' ? submitted.userData as Record<string, unknown> : {};
    const userData: Record<string, unknown> = Object.fromEntries(Object.entries(userDataInput)
      .filter(([key]) => key !== 'categoryScores')
      .slice(0, 40)
      .map(([key, value]) => [key.slice(0, 100), String(value ?? '').slice(0, 1000)]));
    const categoryTotals = new Map<string, { correct: number; total: number }>();
    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      const category = String(question?.category || 'General').slice(0, 100);
      const totals = categoryTotals.get(category) || { correct: 0, total: 0 };
      totals.total += 1;
      if (answer.correct) totals.correct += 1;
      categoryTotals.set(category, totals);
    }
    userData.categoryScores = Object.fromEntries(categoryTotals);
    userData.answeredQuestions = answers.length;
    const score = quiz.type === 'quiz' ? answers.filter((answer) => answer.correct).length : 0;
    const row = {
      id: typeof submitted.submissionId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submitted.submissionId) ? submitted.submissionId : crypto.randomUUID(),
      quiz_id: quizId, timestamp: new Date().toISOString(), score,
      total_questions: questions.length, user_data: userData, answers,
    };
    const { error } = await admin.from('quiz_responses').insert(row);
    if (error) {
      if (error.code === '23505') {
        const { data: existing } = await admin.from('quiz_responses').select('score,total_questions,user_data')
          .eq('id', row.id).eq('quiz_id', quizId).maybeSingle();
        if (existing) return NextResponse.json({ success: true, score: existing.score, totalQuestions: existing.total_questions, categoryScores: existing.user_data?.categoryScores || {} }, { status: 200 });
      }
      console.error('[api/quiz-responses] Insert failed:', error.code || 'unknown');
      return NextResponse.json({ error: 'Could not save this response.' }, { status: 503 });
    }
    if (attempt) {
      const { error: closeError } = await admin.from('quiz_attempts').update({ status: 'submitted', updated_at: new Date().toISOString() })
        .eq('id', attempt.id).eq('status', 'in_progress');
      if (closeError) console.error('[api/quiz-responses] Response stored; attempt close pending:', closeError.code || 'unknown');
    }
    if (typeof quiz.user_id === 'string') {
      const { error: notificationError } = await admin.rpc('queue_assessment_response_notification', {
        recipient_uuid: quiz.user_id, quiz_uuid: quizId,
      });
      if (notificationError) console.warn('[api/quiz-responses] Response saved; notification batch enqueue failed:', notificationError.code || 'unknown');
    }
    return NextResponse.json({ success: true, score, totalQuestions: questions.length, categoryScores: userData.categoryScores }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
      return NextResponse.json({ error: 'Submission is too large.' }, { status: 413 });
    }
    console.error('[api/quiz-responses] Submission failed.');
    return NextResponse.json({ error: 'Could not save this response.' }, { status: 503 });
  }
}
