import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { readJsonWithinLimit } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedContentType = /^(image\/(jpeg|png|webp|avif|gif|bmp|svg\+xml)|audio\/[a-z0-9.+-]+|video\/[a-z0-9.+-]+|application\/(pdf|json|zip|x-zip-compressed|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation))|text\/(plain|csv))$/i;

const safeSegment = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100) || 'media';
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

/** Issue attempt-scoped signed uploads for private taker attachments. */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(ip, 'api:quiz-response-media', 40, 60_000).limited) {
    return NextResponse.json({ error: 'Too many response file uploads. Try again shortly.' }, { status: 429 });
  }

  try {
    const body = await readJsonWithinLimit(request, 16 * 1024) as Record<string, unknown>;
    const quizId = typeof body.quizId === 'string' ? body.quizId : '';
    const attemptId = typeof body.attemptId === 'string' ? body.attemptId : '';
    const attemptToken = typeof body.attemptToken === 'string' ? body.attemptToken : '';
    const questionId = typeof body.questionId === 'string' ? body.questionId : '';
    const objectPath = typeof body.objectPath === 'string' ? body.objectPath : '';
    const contentType = typeof body.contentType === 'string' ? body.contentType.slice(0, 120).trim().toLowerCase() : '';
    if (!UUID.test(quizId) || !UUID.test(attemptId) || attemptToken.length < 40 || attemptToken.length > 256 ||
      !questionId || questionId.length > 100 || !allowedContentType.test(contentType)) {
      return NextResponse.json({ error: 'Invalid response file upload.' }, { status: 400 });
    }
    const pathParts = objectPath.split('/');
    const leafPattern = new RegExp(`^${safeSegment(questionId)}-[a-zA-Z0-9_-]{1,100}\\.[a-zA-Z0-9]{1,12}$`);
    if (objectPath.length > 512 || pathParts.length !== 3 || pathParts[0] !== quizId || pathParts[1] !== attemptId || !leafPattern.test(pathParts[2])) {
      return NextResponse.json({ error: 'Invalid response file path.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const [{ data: attempt, error: attemptError }, { data: quiz, error: quizError }] = await Promise.all([
      admin.from('quiz_attempts').select('id,quiz_id,attempt_token_hash,status,started_at').eq('id', attemptId).maybeSingle(),
      admin.from('quizzes').select('id,questions,settings,expires_at').eq('id', quizId).maybeSingle(),
    ]);
    if (attemptError || quizError) throw attemptError || quizError;
    if (!attempt || attempt.quiz_id !== quizId || attempt.status !== 'in_progress' ||
      tokenHash(attemptToken) !== attempt.attempt_token_hash) {
      return NextResponse.json({ error: 'This assessment attempt is no longer authorized for uploads.' }, { status: 403 });
    }
    if (!quiz || (quiz.expires_at && new Date(quiz.expires_at).getTime() < Date.now())) {
      return NextResponse.json({ error: 'Assessment not found or expired.' }, { status: 404 });
    }
    const question = (Array.isArray(quiz.questions) ? quiz.questions : []).find((item: any) => String(item?.id) === questionId);
    if (!question || question.type !== 'upload') {
      return NextResponse.json({ error: 'This question does not accept file uploads.' }, { status: 400 });
    }
    const settings = quiz.settings && typeof quiz.settings === 'object' ? quiz.settings : {};
    const timer = settings.timer && typeof settings.timer === 'object' ? settings.timer : {};
    const rawTimer = timer.hasTimer;
    const timerValue = rawTimer
      ? typeof rawTimer === 'number' ? rawTimer : Number(timer.duration || 10)
      : 0;
    if (timerValue > 0) {
      const unit = settings.timerUnit || timer.unit || 'minutes';
      const durationMs = timerValue * (unit === 'seconds' ? 1000 : unit === 'hours' ? 3_600_000 : 60_000);
      if (Date.now() - new Date(attempt.started_at).getTime() > durationMs + 10_000) {
        return NextResponse.json({ error: 'Assessment time has expired.' }, { status: 410 });
      }
    }
    const { data, error } = await admin.storage.from('quiz-response-media').createSignedUploadUrl(objectPath, { upsert: true });
    if (error || !data?.token) {
      console.error('[api/quiz-response-media] Could not sign upload:', { code: error?.name, message: error?.message });
      return NextResponse.json({ error: 'Could not authorize response file storage. Check the quiz-response-media bucket setup.' }, { status: 503 });
    }
    return NextResponse.json({ token: data.token, path: objectPath }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
      return NextResponse.json({ error: 'Upload request is too large.' }, { status: 413 });
    }
    if (error instanceof Error && error.message === 'INVALID_JSON') {
      return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
    }
    if (error instanceof Error && /Supabase server credentials are not configured/i.test(error.message)) {
      return NextResponse.json({ error: 'Quiz response storage is not configured on the server.' }, { status: 503 });
    }
    console.error('[api/quiz-response-media] Signing failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Could not prepare response file storage.' }, { status: 503 });
  }
}
