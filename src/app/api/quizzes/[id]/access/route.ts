import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getRequestUser, readJsonWithinLimit } from '@/lib/api-auth';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { issueQuizAccessToken, verifyQuizAccessToken } from '@/lib/quiz/private-access-token';
import { resolveQuizPrivacySettings } from '@/lib/quiz/quiz-privacy';

export const dynamic = 'force-dynamic';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(request);
  if (isRateLimited(ip, 'api:quiz-access', 12, 60_000).limited) {
    return NextResponse.json({ error: 'Too many access attempts. Try again shortly.' }, { status: 429 });
  }
  try {
    const { id } = await context.params;
    if (!uuidPattern.test(id)) return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 });
    const body = await readJsonWithinLimit(request, 4 * 1024) as { key?: unknown; accessToken?: unknown };
    const key = typeof body.key === 'string' ? body.key.trim() : '';
    const admin = getSupabaseAdmin();
    const { data: quiz, error } = await admin.from('quizzes').select('id,user_id,settings,expires_at').eq('id', id).maybeSingle();
    if (error || !quiz || (quiz.expires_at && new Date(quiz.expires_at).getTime() < Date.now())) {
      return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 });
    }
    const settings = await resolveQuizPrivacySettings(admin, { id: quiz.id, user_id: quiz.user_id }, quiz.settings);
    if (settings.moderationStatus === 'under_review') return NextResponse.json({ error: 'Assessment paused for review.' }, { status: 423 });
    if (!settings.isPrivate) return NextResponse.json({ allowed: true }, { headers: { 'Cache-Control': 'no-store' } });

    const existingToken = typeof body.accessToken === 'string' ? verifyQuizAccessToken(body.accessToken, id) : null;
    if (existingToken) return NextResponse.json({ allowed: true, accessToken: body.accessToken }, { headers: { 'Cache-Control': 'no-store' } });

    const user = await getRequestUser(request);
    const allowed = Array.isArray(settings.allowedParticipantUsernames)
      ? settings.allowedParticipantUsernames.filter((name): name is string => typeof name === 'string').map((name) => name.replace(/^@/, '').trim().toLowerCase())
      : [];
    if (user && allowed.length) {
      const { data: profile } = await admin.from('profiles').select('username').eq('id', user.id).maybeSingle();
      const username = typeof profile?.username === 'string' ? profile.username.replace(/^@/, '').trim().toLowerCase() : '';
      if (username && allowed.includes(username)) return NextResponse.json({ allowed: true, accessToken: issueQuizAccessToken(id, user.id) }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const expectedHash = typeof settings.privateKeyHash === 'string' ? settings.privateKeyHash : '';
    if (key && expectedHash && /^[a-f0-9]{64}$/i.test(expectedHash)) {
      const providedHash = createHash('sha256').update(key).digest();
      const expected = Buffer.from(expectedHash, 'hex');
      if (providedHash.length === expected.length && timingSafeEqual(providedHash, expected)) {
        return NextResponse.json({ allowed: true, accessToken: issueQuizAccessToken(id, user?.id || null) }, { headers: { 'Cache-Control': 'no-store' } });
      }
    }
    return NextResponse.json({ error: 'The access key is incorrect or this account is not on the participant list.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') return NextResponse.json({ error: 'Invalid access request.' }, { status: 413 });
    return NextResponse.json({ error: 'Could not verify assessment access.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
