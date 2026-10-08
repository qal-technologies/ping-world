import { createHmac, timingSafeEqual } from 'node:crypto';

type QuizAccessPayload = { quizId: string; subject: string | null; expiresAt: number };

function getSigningKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Server signing key is not configured.');
  return key;
}

function sign(payload: string) {
  return createHmac('sha256', getSigningKey()).update(payload).digest('base64url');
}

export function issueQuizAccessToken(quizId: string, subject: string | null) {
  const payload: QuizAccessPayload = { quizId, subject, expiresAt: Date.now() + 12 * 60 * 60 * 1000 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifyQuizAccessToken(token: string | null | undefined, quizId: string): QuizAccessPayload | null {
  if (!token || token.length > 2048) return null;
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra) return null;
  try {
    const expected = Buffer.from(sign(encoded));
    const supplied = Buffer.from(signature);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as QuizAccessPayload;
    if (payload.quizId !== quizId || !Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
