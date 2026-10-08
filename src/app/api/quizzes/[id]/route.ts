import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { getRequestUser } from '@/lib/api-auth';
import { verifyQuizAccessToken } from '@/lib/quiz/private-access-token';
import { resolveQuizPrivacySettings } from '@/lib/quiz/quiz-privacy';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ip = getClientIp(request);
  if (isRateLimited(ip, 'api:public-quiz', 60, 60_000).limited) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  try {
    const { id } = await context.params;
    const ownerUsername = request.nextUrl.searchParams.get('owner');
    const admin = getSupabaseAdmin();
    let query = admin.from('quizzes').select('*');
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      ) &&
      !ownerUsername
    ) {
      query = query.eq('id', id);
    } else {
      query = query.eq('custom_id', id);
      if (ownerUsername) {
        const { data: profile } = await admin
          .from('profiles')
          .select('id')
          .eq('username', ownerUsername)
          .maybeSingle();
        if (!profile?.id)
          return NextResponse.json(
            { error: 'Assessment not found.' },
            { status: 404 },
          );
        query = query.eq('user_id', profile.id);
      }
    }
    const { data: row, error } = await query.maybeSingle();
    if (
      error ||
      !row ||
      (row.expires_at && new Date(row.expires_at).getTime() < Date.now())
    ) {
      return NextResponse.json(
        { error: 'Assessment not found or expired.' },
        { status: 404 },
      );
    }
    let settings =
      row.settings && typeof row.settings === 'object' ? row.settings : {};
    settings = await resolveQuizPrivacySettings(admin, { id: row.id, user_id: row.user_id }, settings);
    if (settings.moderationStatus === 'under_review') {
      return NextResponse.json(
        { error: 'This assessment is paused while it is reviewed.' },
        { status: 423, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const isPrivate = Boolean(settings.isPrivate);
    const accessToken = request.headers.get('x-quiz-access-token');
    const accessGranted = !isPrivate || Boolean(verifyQuizAccessToken(accessToken, row.id));
    if (isPrivate && !accessGranted) {
      return NextResponse.json({
        code: 'PRIVATE_ACCESS_REQUIRED',
        error: 'Private assessment access is required.',
        quiz: { id: row.id, title: row.title || settings.title || 'Assessment', description: row.description || settings.description || '', type: row.type || settings.type || 'quiz', questions: [], isPrivate: true },
      }, { status: 423, headers: { 'Cache-Control': 'private, no-store' } });
    }
    const questions = Array.isArray(row.questions) ? row.questions : [];
    const sanitizedQuestions = questions.map(
      (question: Record<string, unknown>) => ({
        ...question,
        correctIndex: null,
      }),
    );
    const columns = { ...row };
    delete columns.settings;
    delete columns.responses;
    delete columns.user_id;
    // Settings contain owner-only data (private-key hash, allowlist, moderation
    // metadata, etc.). Only expose quiz-taking settings and an access flag.
    const publicSettings = { ...settings } as Record<string, unknown>;
    delete publicSettings.privateKey;
    delete publicSettings.privateKeyHash;
    delete publicSettings.allowedParticipantUsernames;
    delete publicSettings.moderationStatus;
    delete publicSettings.moderationPausedAt;
    const safeQuiz = {
      ...columns,
      ...publicSettings,
      id: row.id,
      title: row.title || settings.title || 'Assessment',
      description: row.description || settings.description || '',
      type: row.type || settings.type || 'quiz',
      questions: sanitizedQuestions,
      endScreen: row.endScreen || settings.endScreen,
      customUrl: row.custom_id || '',
      isPrivate,
      accessGranted,
      responses: [],
    };
    return NextResponse.json(
      { quiz: safeQuiz },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    console.error('[api/quizzes] Public quiz read failed.');
    return NextResponse.json(
      { error: 'Assessment is temporarily unavailable.' },
      { status: 503 },
    );
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid assessment.' }, { status: 400 });
    }
    const admin = getSupabaseAdmin();
    const { data: quiz, error: readError } = await admin.from('quizzes').select('id').eq('id', id).eq('user_id', user.id).maybeSingle();
    if (readError || !quiz) return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 });
    const { error: notificationError } = await admin.from('notification_batches').delete().eq('resource_id', id).eq('recipient_id', user.id);
    if (notificationError) throw notificationError;
    const { error } = await admin.from('quizzes').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[api/quizzes] Delete failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Could not delete assessment.' }, { status: 503 });
  }
}
