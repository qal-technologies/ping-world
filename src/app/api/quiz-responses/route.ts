import { createHash } from 'node:crypto';
import { after, NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { readJsonWithinLimit } from '@/lib/api-auth';
import { getRequestUser } from '@/lib/api-auth';
import { decodeStoredCorrectAnswer } from '@/lib/quiz/quiz-evaluation';
import { resolvePipedText } from '@/lib/quiz/quiz-piping';
import { isNotificationRecipientActive, sendPushToUser } from '@/lib/notifications/push-server';

function sameValue(left: unknown, right: unknown) {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item) => right.some((other) => String(item) === String(other)));
  }
  return String(left ?? '').trim() === String(right ?? '').trim();
}

function hasSubmittedAnswer(answer: any): boolean {
  if (!answer || answer.passed) return false;
  if (answer.fileUrl) return true;
  const value = answer.answer;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return typeof value === 'number' || typeof value === 'boolean';
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(ip, 'api:quiz-response', 12, 60_000).limited) {
    return NextResponse.json({ error: 'Too many submissions. Try again shortly.' }, { status: 429 });
  }
  try {
    const body = await readJsonWithinLimit(request, 2 * 1024 * 1024) as Record<string, unknown>;
    const signedUser = await getRequestUser(request);
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
      const isFinalTimeoutOrViolation = ['timeout', 'violation'].includes(String(submitted.submissionReason));
      if (verifiedAttempt.status === 'submitted') {
        const { data: prior } = await admin.from('quiz_responses').select('id,score,total_questions,user_data').eq('id', submitted.submissionId).eq('quiz_id', quizId).maybeSingle();
        if (prior) return NextResponse.json({ success: true, responseId: prior.id, score: prior.score, totalQuestions: prior.total_questions, answeredQuestions: prior.user_data?.answeredQuestions || 0, scorePossible: prior.user_data?.scorePossible || 0, categoryScores: prior.user_data?.categoryScores || {} }, { status: 200 });
        return NextResponse.json({ error: 'Attempt has already been submitted.' }, { status: 409 });
      }
      if (verifiedAttempt.status === 'expired' && isFinalTimeoutOrViolation) {
        const { data: reopened, error: reopenError } = await admin.from('quiz_attempts').update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', attemptId).eq('quiz_id', quizId).eq('attempt_token_hash', createHash('sha256').update(attemptToken).digest('hex')).eq('status', 'expired').select('*').maybeSingle();
        if (reopenError || !reopened) return NextResponse.json({ error: 'Attempt recovery failed. Please retry.' }, { status: 409 });
        attempt = reopened;
      } else if (verifiedAttempt.status !== 'in_progress') return NextResponse.json({ error: 'Attempt is no longer active.' }, { status: 409 });
      const attemptSettings = verifiedAttempt.answers?.__attemptSettings || (quiz as any).settings || {};
      const timer = attemptSettings?.timer && typeof attemptSettings.timer === 'object' ? attemptSettings.timer : {};
      const rawDuration = timer.hasTimer;
      if (!(rawDuration === false || rawDuration === null || rawDuration === undefined || rawDuration === 0 || rawDuration === '0')) {
        const rawNumber = typeof rawDuration === 'boolean' ? NaN : Number(rawDuration);
        const duration = Number.isFinite(rawNumber) ? rawNumber : Number(timer.duration || 10);
        const unit = attemptSettings?.timerUnit || timer.unit || 'minutes';
        const seconds = duration * (unit === 'seconds' ? 1 : unit === 'hours' ? 3600 : 60);
        if (Date.now() - new Date(verifiedAttempt.started_at).getTime() > seconds * 1000 + 10_000 && !isFinalTimeoutOrViolation) {
          return NextResponse.json({ error: 'Assessment time has expired.' }, { status: 410 });
        }
      }
      const savedAttemptAnswers = verifiedAttempt.answers && typeof verifiedAttempt.answers === 'object' ? verifiedAttempt.answers : {};
      rawAnswers = Object.entries(savedAttemptAnswers).filter(([key]) => !['__visitedQuestionIds', '__branchHistory', '__signedUser', '__questionSnapshots', '__calculateAllBranches', '__attemptSettings'].includes(key)).map(([, value]) => value) as any[];
      const savedQuestionSnapshots = savedAttemptAnswers.__questionSnapshots && typeof savedAttemptAnswers.__questionSnapshots === 'object' ? savedAttemptAnswers.__questionSnapshots : {};
      for (const [questionId, snapshot] of Object.entries(savedQuestionSnapshots)) {
        if (snapshot && typeof snapshot === 'object') questionMap.set(String(questionId), snapshot as Record<string, unknown>);
      }
    }
    if ((quiz.settings as Record<string, unknown> | null)?.isPrivate && !attempt) {
      return NextResponse.json({ error: 'Private assessments require a verified attempt.' }, { status: 403 });
    }
    let answers = rawAnswers.flatMap((raw: unknown) => {
      if (!raw || typeof raw !== 'object') return [];
      const candidate = raw as Record<string, unknown>;
      const questionId = String(candidate.questionId || '');
      const question = questionMap.get(questionId) as Record<string, any> | undefined;
      if (!question) return [];
      const answer = candidate.answer;
      let correctValue = decodeStoredCorrectAnswer(question.correctIndex);
      const hasCorrectAnswer = correctValue !== null && correctValue !== undefined && correctValue !== '' && !(Array.isArray(correctValue) && correctValue.length === 0);
      if (typeof correctValue === 'number' && Array.isArray(question.options)) {
        const option = question.options[correctValue] as any;
        correctValue = option && typeof option === 'object' ? option.id : option;
      }
      if (Array.isArray(correctValue) && Array.isArray(question.options)) {
        correctValue = correctValue.map((value: unknown) => {
          if (typeof value === 'number' || /^\d+$/.test(String(value))) {
            const option = question.options[Number(value)] as any;
            return option && typeof option === 'object' ? option.id : value;
          }
          return value;
        });
      }
      let correct: boolean | undefined;
      let pointsEarned = 0;
      let pointsPossible = 0;
      const hasSubmittedValue = answer !== undefined && answer !== null && answer !== '' && !(Array.isArray(answer) && answer.length === 0);
      if (quiz.type === 'quiz' && question.type === 'upload') {
        const hasUpload = Boolean(candidate.fileUrl || hasSubmittedValue);
        if (hasUpload) {
          correct = true;
          pointsPossible = 1;
          pointsEarned = 1;
        }
      } else if (quiz.type === 'quiz' && !hasCorrectAnswer && hasSubmittedValue && !candidate.passed) {
        // A keyed answer is the only basis for marking something incorrect.
        correct = true;
        pointsPossible = 1;
        pointsEarned = 1;
      } else if (quiz.type === 'quiz' && hasCorrectAnswer) {
        if (question.type === 'input') {
          const actual = String(answer ?? '').trim();
          const rawExpected = String(correctValue ?? '').trim();
          const expected = resolvePipedText(rawExpected, {
            userData: attempt?.user_data || submitted.userData || {},
            userAnswers: rawAnswers as any[],
            questions,
          }, false, rawExpected).trim();
          correct = question.caseSensitive ? actual === expected : actual.toLowerCase() === expected.toLowerCase();
          pointsPossible = 1;
          pointsEarned = correct ? 1 : 0;
        } else {
          correct = question.type === 'true_false'
            ? String(answer ?? '').trim().toLowerCase() === String(correctValue ?? '').trim().toLowerCase()
            : sameValue(answer, correctValue);
          const options = Array.isArray(question.options) ? question.options : [];
          const correctIds = (Array.isArray(correctValue) ? correctValue : [correctValue]).map(String);
          const hasCustomWeights = options.some((option: any) => option?.scoreWeight !== undefined && option?.scoreWeight !== null && option?.scoreWeight !== '' && Number.isFinite(Number(option.scoreWeight)) && Number(option.scoreWeight) >= 0);
          const weightFor = (id: unknown) => {
            const index = options.findIndex((option: any, optionIndex: number) => String(option?.id ?? optionIndex) === String(id) || String(optionIndex) === String(id));
            const weight = Number((options[index] as any)?.scoreWeight);
            return hasCustomWeights && Number.isFinite(weight) && weight >= 0 ? weight : 1;
          };
          if (question.type === 'checkbox') {
            if (hasCustomWeights) {
              pointsPossible = correctIds.reduce((sum, id) => sum + weightFor(id), 0);
              const selectedIds = Array.isArray(answer) ? answer : [];
              pointsEarned = selectedIds.reduce((sum: number, id: unknown) => correctIds.includes(String(id)) ? sum + weightFor(id) : sum, 0);
            } else {
              pointsPossible = 1;
              pointsEarned = correct ? 1 : 0;
            }
          } else {
            pointsPossible = hasCustomWeights ? weightFor(correctValue) : 1;
            pointsEarned = correct ? pointsPossible : 0;
          }
        }
      }
      const cleanAnswer = typeof answer === 'string' ? answer.slice(0, 20_000)
        : Array.isArray(answer) ? answer.filter((value) => typeof value === 'string').slice(0, 100).map((value) => value.slice(0, 2_000))
        : answer && typeof answer === 'object' ? Object.fromEntries(Object.entries(answer as Record<string, unknown>).slice(0, 30))
        : answer;
      // Correctness is derived only from the saved question key on the server;
      // discard any client-supplied `correct` field (including for surveys and
      // questions that intentionally have no answer key).
      const safeCandidate = { ...candidate };
      delete safeCandidate.correct;
      const answerHistory = Array.isArray(candidate.answerHistory)
        ? candidate.answerHistory.slice(-20).flatMap((revision: any) => {
            if (!revision || typeof revision !== 'object') return [];
            const revisionAnswer = typeof revision.answer === 'string' ? revision.answer.slice(0, 20_000)
              : Array.isArray(revision.answer) ? revision.answer.filter((value: unknown) => typeof value === 'string').slice(0, 100).map((value: string) => value.slice(0, 2_000))
              : undefined;
            return [{
              ...(revisionAnswer !== undefined ? { answer: revisionAnswer } : {}),
              ...(typeof revision.fileName === 'string' ? { fileName: revision.fileName.slice(0, 300) } : {}),
              ...(typeof revision.fileType === 'string' ? { fileType: revision.fileType.slice(0, 100) } : {}),
              ...(typeof revision.fileUrl === 'string' ? { fileUrl: revision.fileUrl.slice(0, 2_000_000) } : {}),
              ...(typeof revision.recordedAt === 'string' && Number.isFinite(Date.parse(revision.recordedAt)) ? { recordedAt: new Date(revision.recordedAt).toISOString() } : {}),
            }];
          })
        : [];
      delete safeCandidate.answerHistory;
      const snapshotOptions = (Array.isArray(question.options) ? question.options : []).map((option: any) => ({
        id: String(option?.id ?? ''),
        text: String(option?.text ?? option ?? ''),
        explanation: typeof option?.explanation === 'string' ? option.explanation.slice(0, 2000) : undefined,
        imageUrl: typeof option?.imageUrl === 'string' && !option.imageUrl.startsWith('data:') ? option.imageUrl.slice(0, 2000) : undefined,
        uploadUrl: typeof option?.uploadUrl === 'string' && !option.uploadUrl.startsWith('data:') ? option.uploadUrl.slice(0, 2000) : undefined,
        uploadType: typeof option?.uploadType === 'string' ? option.uploadType.slice(0, 100) : undefined,
        scoreWeight: Number.isFinite(Number(option?.scoreWeight)) ? Number(option.scoreWeight) : undefined,
        skipTo: typeof option?.skipTo === 'string' ? option.skipTo.slice(0, 100) : undefined,
        skipToCat: typeof option?.skipToCat === 'string' ? option.skipToCat.slice(0, 100) : undefined,
      }));
      const questionSnapshot = {
        id: questionId,
        text: String(question.text ?? '').slice(0, 10_000),
        type: String(question.type ?? ''),
        category: typeof question.category === 'string' ? question.category.slice(0, 100) : undefined,
        imageUrl: typeof question.imageUrl === 'string' && !question.imageUrl.startsWith('data:') ? question.imageUrl.slice(0, 2000) : undefined,
        uploadUrl: typeof question.uploadUrl === 'string' && !question.uploadUrl.startsWith('data:') ? question.uploadUrl.slice(0, 2000) : undefined,
        uploadType: typeof question.uploadType === 'string' ? question.uploadType.slice(0, 100) : undefined,
        note: typeof question.note === 'string' ? question.note.slice(0, 5000) : undefined,
        accessory: typeof question.accessory === 'string' ? question.accessory.slice(0, 40) : undefined,
        inputPlaceholder: typeof question.inputPlaceholder === 'string' ? question.inputPlaceholder.slice(0, 500) : undefined,
        caseSensitive: Boolean(question.caseSensitive),
        allowPass: Boolean(question.allowPass),
        skipTo: typeof question.skipTo === 'string' ? question.skipTo.slice(0, 100) : undefined,
        skipToCat: typeof question.skipToCat === 'string' ? question.skipToCat.slice(0, 100) : undefined,
        options: snapshotOptions,
        correctIndex: question.correctIndex ?? null,
        correctExplanation: typeof question.correctExplanation === 'string' ? question.correctExplanation.slice(0, 4000) : undefined,
      };
      return [{ ...safeCandidate, questionId, answer: cleanAnswer, ...(answerHistory.length ? { answerHistory } : {}), questionSnapshot, ...(typeof correct === 'boolean' ? { correct, pointsEarned, pointsPossible } : {}) }];
    });
    const orderedQuestionIds = Array.isArray(attempt?.question_order)
      ? attempt.question_order.map(String)
      : questions.map((question: any) => String(question.id));
    const answerPosition = new Map(orderedQuestionIds.map((questionId, index) => [questionId, index]));
    answers = answers.sort((left: any, right: any) =>
      (answerPosition.get(String(left.questionId)) ?? Number.MAX_SAFE_INTEGER) -
      (answerPosition.get(String(right.questionId)) ?? Number.MAX_SAFE_INTEGER),
    );
    const userDataInput = attempt?.user_data && typeof attempt.user_data === 'object'
      ? attempt.user_data
      : submitted.userData && typeof submitted.userData === 'object' ? submitted.userData as Record<string, unknown> : {};
    const userData: Record<string, unknown> = Object.fromEntries(Object.entries(userDataInput)
      .filter(([key]) => !['categoryScores', 'pingAuthName', 'pingAuthEmail', 'pingAuthDisplayName', 'signedUser', 'isSignedUser'].includes(key))
      .slice(0, 40)
      .map(([key, value]) => [key.slice(0, 100), String(value ?? '').slice(0, 1000)]));
    const retainedSignedIdentity = attempt?.answers?.__signedUser && typeof attempt.answers.__signedUser === 'object' ? attempt.answers.__signedUser : null;
    let signedIdentity: { username: string; displayName: string; email: string } | null = retainedSignedIdentity;
    if (!signedIdentity && signedUser && !(signedUser as any).is_anonymous) {
      const { data: profile } = await admin.from('profiles').select('username,display_name').eq('id', signedUser.id).maybeSingle();
      const metadata = signedUser.user_metadata || {};
      signedIdentity = {
        username: String(profile?.username || metadata.username || signedUser.email?.split('@')[0] || '').slice(0, 80),
        displayName: String(profile?.display_name || metadata.display_name || metadata.full_name || metadata.name || '').slice(0, 120),
        email: String(signedUser.email || '').slice(0, 254),
      };
    }
    const configuredDetails = Array.isArray((quiz.settings as any)?.askDetails) ? (quiz.settings as any).askDetails : [];
    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    for (const detail of configuredDetails) {
      if (detail?.type !== 'dob' || typeof detail.title !== 'string') continue;
      const rawDob = String(userData[detail.title] || '').trim();
      if (!rawDob) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDob)) {
        return NextResponse.json({ error: 'Enter a valid date of birth.' }, { status: 422 });
      }
      const dob = new Date(`${rawDob}T00:00:00.000Z`);
      if (!Number.isFinite(dob.getTime()) || dob.toISOString().slice(0, 10) !== rawDob || dob > todayUtc) {
        return NextResponse.json({ error: 'Date of birth must be a valid date that is not in the future.' }, { status: 422 });
      }
      const minAge = Math.max(0, Math.min(120, Math.floor(Number(detail.minAge) || 0)));
      const cutoff = new Date(todayUtc);
      cutoff.setUTCFullYear(cutoff.getUTCFullYear() - minAge);
      if (minAge > 0 && dob > cutoff) {
        return NextResponse.json({ error: `Participants must be at least ${minAge} years old.` }, { status: 422 });
      }
    }
    const categoryTotals = new Map<string, { correct: number; total: number }>();
    for (const answer of answers) {
      if (typeof answer.correct !== 'boolean') continue;
      const question = questionMap.get(answer.questionId);
      const category = String(question?.category || 'General').slice(0, 100);
      const totals = categoryTotals.get(category) || { correct: 0, total: 0 };
      totals.total += 1;
      if (answer.correct) totals.correct += 1;
      categoryTotals.set(category, totals);
    }
    userData.categoryScores = Object.fromEntries(categoryTotals);
    userData.answeredQuestions = new Set(answers.filter(hasSubmittedAnswer).map((answer: any) => String(answer.questionId))).size;
    const storedVisitedIds = Array.isArray(attempt?.answers?.__visitedQuestionIds) ? attempt.answers.__visitedQuestionIds.map(String) : [];
    const calculateAllBranches = attempt ? attempt.answers?.__calculateAllBranches === true : (quiz.settings as any)?.calculateAllBranches === true;
    const allQuestionsInPath = calculateAllBranches || (attempt ? Boolean(attempt.answers?.__attemptSettings?.quizScroll) && attempt.answers?.__attemptSettings?.quizLayout !== 'scroll_show' : Boolean((quiz.settings as any)?.quizScroll) && (quiz.settings as any)?.quizLayout !== 'scroll_show');
    const currentPathQuestionIds = allQuestionsInPath
      ? (attempt?.question_order || questions.map((question: any) => String(question.id))).map(String)
      : Array.from(new Set([...(attempt ? storedVisitedIds : []), ...answers.map((answer: any) => String(answer.questionId))]));
    const allBranchesCount = currentPathQuestionIds.length;
    const validQuestionIds = new Set([...questions.map((question: any) => String(question.id)), ...questionMap.keys()]);
    const branchHistory = (Array.isArray(attempt?.answers?.__branchHistory) ? attempt.answers.__branchHistory : Array.isArray(submitted.branchHistory) ? submitted.branchHistory : [])
      .slice(-200)
      .flatMap((entry: any) => {
        if (!entry || typeof entry !== 'object' || !validQuestionIds.has(String(entry.fromQuestionId || ''))) return [];
        const questionIds = Array.isArray(entry.questionIds) ? [...new Set(entry.questionIds.map(String).filter((id: string) => validQuestionIds.has(id)))].slice(0, validQuestionIds.size) : [];
        return [{
          fromQuestionId: String(entry.fromQuestionId),
          ...(validQuestionIds.has(String(entry.targetQuestionId || '')) ? { targetQuestionId: String(entry.targetQuestionId) } : {}),
          ...(typeof entry.category === 'string' ? { category: entry.category.slice(0, 100) } : {}),
          questionIds,
          at: typeof entry.at === 'string' && Number.isFinite(Date.parse(entry.at)) ? new Date(entry.at).toISOString() : undefined,
        }];
      });
    let scorePossible = quiz.type === 'quiz' ? answers.reduce((sum, answer: any) => sum + Math.max(0, answer.pointsPossible !== undefined ? Number(answer.pointsPossible) || 0 : (typeof answer.correct === 'boolean' ? 1 : 0)), 0) : 0;
    const pathQuestions = currentPathQuestionIds.map((id: string) => questionMap.get(String(id))).filter(Boolean) as any[];
    if (quiz.type === 'quiz' && allQuestionsInPath) {
      const answeredIds = new Set(answers.map((answer: any) => String(answer.questionId)));
      for (const question of pathQuestions) {
        if (answeredIds.has(String(question.id))) continue;
        const key = decodeStoredCorrectAnswer(question.correctIndex);
        if (question.type === 'upload') { scorePossible += 1; continue; }
        if (key === null || key === undefined || key === '' || (Array.isArray(key) && key.length === 0)) continue;
        if (question.type === 'input') { scorePossible += 1; continue; }
        const options = Array.isArray(question.options) ? question.options : [];
        const normalizedKey = typeof key === 'number' && options[key] ? options[key]?.id ?? key : key;
        const keys = (Array.isArray(normalizedKey) ? normalizedKey : [normalizedKey]).map(String);
        const custom = options.some((option: any) => option?.scoreWeight !== undefined && option?.scoreWeight !== null && option?.scoreWeight !== '' && Number.isFinite(Number(option.scoreWeight)) && Number(option.scoreWeight) >= 0);
        if (!custom) { scorePossible += 1; continue; }
        scorePossible += keys.reduce((sum: number, id: string) => {
          const optionIndex = options.findIndex((option: any, index: number) => String(option?.id ?? index) === id || String(index) === id);
          const weight = Number(options[optionIndex]?.scoreWeight);
          return sum + (Number.isFinite(weight) && weight >= 0 ? weight : 1);
        }, 0);
      }
    } else if (quiz.type === 'quiz') {
      const reachedIds = new Set(answers.map((answer: any) => String(answer.questionId)));
      const reachedQuestionIds = new Set(currentPathQuestionIds.map(String));
      for (const question of pathQuestions) {
        if (!reachedQuestionIds.has(String(question.id)) || reachedIds.has(String(question.id))) continue;
        const key = decodeStoredCorrectAnswer(question.correctIndex);
        if (question.type === 'upload') { scorePossible += 1; continue; }
        if (key === null || key === undefined || key === '' || (Array.isArray(key) && key.length === 0)) continue;
        if (question.type === 'input') { scorePossible += 1; continue; }
        const options = Array.isArray(question.options) ? question.options : [];
        const normalizedKey = typeof key === 'number' && options[key] ? options[key]?.id ?? key : key;
        const keys = (Array.isArray(normalizedKey) ? normalizedKey : [normalizedKey]).map(String);
        const custom = options.some((option: any) => option?.scoreWeight !== undefined && option?.scoreWeight !== null && option?.scoreWeight !== '' && Number.isFinite(Number(option.scoreWeight)) && Number(option.scoreWeight) >= 0);
        if (!custom) { scorePossible += 1; continue; }
        scorePossible += keys.reduce((sum: number, id: string) => {
          const optionIndex = options.findIndex((option: any, index: number) => String(option?.id ?? index) === id || String(index) === id);
          const weight = Number(options[optionIndex]?.scoreWeight);
          return sum + (Number.isFinite(weight) && weight >= 0 ? weight : 1);
        }, 0);
      }
    }
    userData.scorePossible = scorePossible;
    const score = quiz.type === 'quiz' ? answers.reduce((sum, answer: any) => sum + Math.max(0, answer.pointsEarned !== undefined ? Number(answer.pointsEarned) || 0 : (answer.correct ? 1 : 0)), 0) : 0;
    const responseUserData = {
      ...userData,
      answeredQuestions: Number(userData.answeredQuestions) || 0,
      scorePossible: Number(userData.scorePossible) || 0,
      currentPathQuestionIds,
      branchHistory,
      isSignedUser: Boolean(signedIdentity),
      signedUser: signedIdentity,
      startedAt: attempt?.started_at || (typeof submitted.startedAt === 'string' && Number.isFinite(Date.parse(submitted.startedAt)) ? new Date(submitted.startedAt).toISOString() : null),
      durationSeconds: attempt?.started_at ? Math.max(0, Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000)) : null,
      pathQuestionSnapshots: currentPathQuestionIds.map((questionId: string) => {
        const question: any = questionMap.get(questionId);
        if (!question) return null;
        return {
          id: questionId,
          text: String(question.text ?? '').slice(0, 10_000),
          type: String(question.type ?? ''),
          category: typeof question.category === 'string' ? question.category.slice(0, 100) : undefined,
          imageUrl: typeof question.imageUrl === 'string' && !question.imageUrl.startsWith('data:') ? question.imageUrl.slice(0, 2000) : undefined,
          uploadUrl: typeof question.uploadUrl === 'string' && !question.uploadUrl.startsWith('data:') ? question.uploadUrl.slice(0, 2000) : undefined,
          correctIndex: question.correctIndex ?? null,
          correctExplanation: typeof question.correctExplanation === 'string' ? question.correctExplanation.slice(0, 4000) : undefined,
          note: typeof question.note === 'string' ? question.note.slice(0, 5000) : undefined,
          accessory: typeof question.accessory === 'string' ? question.accessory.slice(0, 40) : undefined,
          accessoryNote: typeof question.accessoryNote === 'string' ? question.accessoryNote.slice(0, 5000) : undefined,
          accessoryConfig: question.accessoryConfig && typeof question.accessoryConfig === 'object' ? question.accessoryConfig : undefined,
          inputPlaceholder: typeof question.inputPlaceholder === 'string' ? question.inputPlaceholder.slice(0, 500) : undefined,
          caseSensitive: Boolean(question.caseSensitive),
          allowPass: Boolean(question.allowPass),
          skipTo: typeof question.skipTo === 'string' ? question.skipTo.slice(0, 100) : undefined,
          skipToCat: typeof question.skipToCat === 'string' ? question.skipToCat.slice(0, 100) : undefined,
          inputBranchRules: Array.isArray(question.inputBranchRules) ? question.inputBranchRules.slice(0, 100) : undefined,
          elseSkipTo: typeof question.elseSkipTo === 'string' ? question.elseSkipTo.slice(0, 100) : undefined,
          elseSkipToCat: typeof question.elseSkipToCat === 'string' ? question.elseSkipToCat.slice(0, 100) : undefined,
          options: (Array.isArray(question.options) ? question.options : []).slice(0, 200).map((option: any) => ({ id: String(option?.id ?? ''), text: String(option?.text ?? option ?? '').slice(0, 5000), explanation: typeof option?.explanation === 'string' ? option.explanation.slice(0, 4000) : undefined, imageUrl: typeof option?.imageUrl === 'string' && !option.imageUrl.startsWith('data:') ? option.imageUrl.slice(0, 2000) : undefined, uploadUrl: typeof option?.uploadUrl === 'string' && !option.uploadUrl.startsWith('data:') ? option.uploadUrl.slice(0, 2000) : undefined, uploadType: typeof option?.uploadType === 'string' ? option.uploadType.slice(0, 100) : undefined, scoreWeight: Number.isFinite(Number(option?.scoreWeight)) ? Number(option.scoreWeight) : undefined, skipTo: typeof option?.skipTo === 'string' ? option.skipTo.slice(0, 100) : undefined, skipToCat: typeof option?.skipToCat === 'string' ? option.skipToCat.slice(0, 100) : undefined, evaluation: option?.evaluation && typeof option.evaluation === 'object' ? option.evaluation : undefined })),
        };
      }).filter(Boolean),
      submissionReason: ['timeout', 'self_submit', 'violation'].includes(String(submitted.submissionReason)) ? submitted.submissionReason : 'completion',
    };
    const row = {
      // Attempts own their response ID. Never let the client select an
      // unrelated ID to bypass idempotency or response/attempt linkage.
      id: attempt ? attempt.id : typeof submitted.submissionId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submitted.submissionId) ? submitted.submissionId : crypto.randomUUID(),
      quiz_id: quizId, timestamp: new Date().toISOString(), score,
      total_questions: allBranchesCount, user_data: responseUserData, answers,
    };
    if (attempt) {
      // Store the result and close the attempt in one database transaction. This
      // keeps a saved response from being reported as failed or remaining active
      // if one half of the operation fails.
      const { data: submittedRows, error } = await admin.rpc('submit_quiz_attempt_response', {
        response_uuid: row.id,
        quiz_uuid: quizId,
        response_score: score,
        response_total: allBranchesCount,
        response_user_data: responseUserData,
        response_answers: answers,
        attempt_uuid: attempt.id,
        attempt_token_hash: createHash('sha256').update(String(submitted.attemptToken)).digest('hex'),
      });
      const submittedRow = Array.isArray(submittedRows) ? submittedRows[0] : submittedRows;
      if (error || !submittedRow?.response_id) {
        console.error('[api/quiz-responses] Atomic response save failed:', error?.code || 'unknown');
        // Recover safely if the transactional RPC is missing or temporarily
        // unavailable in a deployment: the attempt was already authenticated
        // above, and the response ID is deterministically bound to that attempt.
        const { error: insertError } = await admin.from('quiz_responses').insert(row);
        let responsePersisted = !insertError;
        if (insertError?.code === '23505') {
          const { data: existing } = await admin.from('quiz_responses').select('id').eq('id', row.id).eq('quiz_id', quizId).maybeSingle();
          responsePersisted = Boolean(existing);
        }
        if (!responsePersisted) {
          console.error('[api/quiz-responses] Recovery insert failed:', insertError?.code || 'unknown');
          return NextResponse.json({ error: 'Could not save this response yet. Your attempt is still available to retry.' }, { status: 503 });
        }
        const { data: closedAttempts, error: closeError } = await admin.from('quiz_attempts').update({ status: 'submitted', answers: {}, user_data: {}, question_order: [], current_question_index: 0, updated_at: new Date().toISOString() })
          .eq('id', attempt.id).eq('quiz_id', quizId).eq('attempt_token_hash', createHash('sha256').update(String(submitted.attemptToken)).digest('hex')).eq('status', 'in_progress').select('id');
        if (closeError || !closedAttempts?.length) {
          const { data: currentAttempt } = await admin.from('quiz_attempts').select('status').eq('id', attempt.id).eq('quiz_id', quizId).maybeSingle();
          if (currentAttempt?.status !== 'submitted') {
            await admin.from('quiz_responses').delete().eq('id', row.id).eq('quiz_id', quizId);
            return NextResponse.json({ error: 'Could not finalize this response yet. Your attempt is still available to retry.' }, { status: 503 });
          }
        }
      }
      else row.id = submittedRow.response_id;
    } else {
      const { error } = await admin.from('quiz_responses').insert(row);
      if (error) {
        if (error.code === '23505') {
          const { data: existing } = await admin.from('quiz_responses').select('id,score,total_questions,user_data')
            .eq('id', row.id).eq('quiz_id', quizId).maybeSingle();
          if (existing) return NextResponse.json({ success: true, responseId: existing.id, score: existing.score, totalQuestions: existing.total_questions, answeredQuestions: existing.user_data?.answeredQuestions || 0, scorePossible: existing.user_data?.scorePossible || 0, categoryScores: existing.user_data?.categoryScores || {} }, { status: 200 });
        }
        console.error('[api/quiz-responses] Insert failed:', error.code || 'unknown');
        return NextResponse.json({ error: 'Could not save this response.' }, { status: 503 });
      }
    }
    if (typeof quiz.user_id === 'string') {
      const { error: notificationError } = await admin.rpc('queue_assessment_response_notification', {
        recipient_uuid: quiz.user_id, quiz_uuid: quizId,
      });
      if (notificationError) console.warn('[api/quiz-responses] Response saved; notification batch enqueue failed:', notificationError.code || 'unknown');
      else after(async () => {
        // Deliver online push promptly while retaining the durable one-row batch
        // and its claim/ack protocol for retries and offline recipients.
        const { data: account } = await admin.auth.admin.getUserById(quiz.user_id);
        if (account.user?.user_metadata?.notification_preferences?.assessmentResponses !== false) {
          const { data: batch } = await admin.from('notification_batches').select('id').eq('recipient_id', quiz.user_id)
            .eq('resource_id', quizId).eq('notification_type', 'assessment_response').maybeSingle();
          if (batch?.id) {
            const claimToken = crypto.randomUUID();
            const { data: claimed } = await admin.rpc('claim_notification_batch', { batch_uuid: batch.id, claim_token: claimToken });
            if (claimed?.length) {
              const pending = Math.max(1, Number(claimed[0].pending_count) || 1);
              try {
                if (await isNotificationRecipientActive(admin, quiz.user_id)) {
                  await admin.rpc('ack_notification_batch', { batch_uuid: batch.id, claim_token: claimToken, delivered_count: pending });
                  return;
                }
                const { count } = await admin.from('quiz_responses').select('id', { count: 'exact', head: true }).eq('quiz_id', quizId);
                const delivery = await sendPushToUser(admin, quiz.user_id, {
                  title: 'Assessment responses',
                  body: `${pending} new response${pending === 1 ? '' : 's'} for “${String(quiz.title || 'your assessment').slice(0, 100)}”. ${count || 0} total.`,
                  url: '/quiz',
                  tag: `assessment-response-${quizId}`,
                });
                if (delivery.delivered > 0) await admin.rpc('ack_notification_batch', { batch_uuid: batch.id, claim_token: claimToken, delivered_count: pending });
                else await admin.rpc('release_notification_batch', { batch_uuid: batch.id, claim_token: claimToken });
              } catch {
                await admin.rpc('release_notification_batch', { batch_uuid: batch.id, claim_token: claimToken });
              }
            }
          }
        }
      });
    }
    return NextResponse.json({ success: true, responseId: row.id, score, totalQuestions: allBranchesCount, answeredQuestions: responseUserData.answeredQuestions, scorePossible: responseUserData.scorePossible, categoryScores: userData.categoryScores }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
      return NextResponse.json({ error: 'Submission is too large.' }, { status: 413 });
    }
    console.error('[api/quiz-responses] Submission failed.');
    return NextResponse.json({ error: 'Could not save this response.' }, { status: 503 });
  }
}
