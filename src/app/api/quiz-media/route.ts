import { NextRequest, NextResponse } from 'next/server';
import { getRequestUserFromToken, readJsonWithinLimit } from '@/lib/api-auth';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isAllowedObjectPath(path: string, userId: string, quizId: string) {
  if (path.length > 512) return false;
  const segments = path.split('/');
  return segments.length >= 4 && segments.length <= 5 &&
    segments[0] === userId && segments[1] === quizId &&
    segments.every((segment, index) => index === segments.length - 1
      ? /^[A-Za-z0-9_-]+\.[A-Za-z0-9]{1,12}$/.test(segment)
      : /^[A-Za-z0-9_-]{1,100}$/.test(segment));
}

/** Issue a path-scoped Storage upload token; media bytes travel directly to Supabase. */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(ip, 'api:quiz-media-sign', 240, 60_000).limited) {
      return NextResponse.json({ error: 'Too many media uploads. Try again shortly.' }, { status: 429 });
    }

    // Keep large profile metadata tokens out of HTTP headers. Auth is still verified with Supabase.
    const body = await readJsonWithinLimit(request, 256 * 1024) as Record<string, unknown>;
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken : '';
    const user = await getRequestUserFromToken(accessToken);
    if (!user) return NextResponse.json({ error: 'Sign in before saving assessment media.' }, { status: 401 });
    if (isRateLimited(user.id, 'api:quiz-media-sign-account', 600, 60 * 60_000).limited) {
      return NextResponse.json({ error: 'The hourly media upload limit has been reached.' }, { status: 429 });
    }

    const quizId = typeof body.quizId === 'string' ? body.quizId : '';
    const objectPath = typeof body.objectPath === 'string' ? body.objectPath : '';
    const contentType = typeof body.contentType === 'string' ? body.contentType.slice(0, 120) : '';
    if (!UUID.test(quizId) || !isAllowedObjectPath(objectPath, user.id, quizId) || !contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid assessment image upload.' }, { status: 400 });
    }

    const storage = getSupabaseAdmin().storage.from('quiz-media');
    const { data, error } = await storage.createSignedUploadUrl(objectPath, { upsert: true });
    if (error || !data?.token) {
      const message = error?.message || 'Storage did not return an upload token.';
      console.error('[api/quiz-media] Could not create upload token:', {
        status: (error as any)?.status,
        statusCode: (error as any)?.statusCode,
        message,
        bucket: 'quiz-media',
        objectPath,
      });
      const bucketMissing = /bucket.*(not found|does not exist)/i.test(message);
      return NextResponse.json({
        error: bucketMissing
          ? 'The quiz-media bucket is missing. Apply the Storage setup SQL in DATABASE_SETUP.md.'
          : 'Supabase could not authorize this image upload. Check server Storage configuration.',
      }, { status: bucketMissing ? 503 : 502 });
    }

    const { data: publicData } = storage.getPublicUrl(objectPath);
    return NextResponse.json({ token: data.token, path: objectPath, publicUrl: publicData.publicUrl }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
      return NextResponse.json({ error: 'Upload request is too large.' }, { status: 413 });
    }
    if (error instanceof Error && error.message === 'INVALID_JSON') {
      return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
    }
    if (error instanceof Error && /Supabase server credentials are not configured/i.test(error.message)) {
      return NextResponse.json({ error: 'Quiz image storage is not configured on the server.' }, { status: 503 });
    }
    console.error('[api/quiz-media] Signing request failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Could not prepare the quiz image upload.' }, { status: 503 });
  }
}
