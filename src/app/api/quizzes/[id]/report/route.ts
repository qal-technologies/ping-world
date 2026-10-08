import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { getRequestUser, readJsonWithinLimit } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = [
  'Spam',
  'Harassment',
  'Cheating',
  'Inappropriate Content',
  'Copyright',
  'Other',
];

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ip = getClientIp(request);
  if (isRateLimited(ip, 'api:quiz-report', 5, 60_000).limited) {
    return NextResponse.json({ error: 'Too many reports submitted. Try again shortly.' }, { status: 429 });
  }

  try {
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid assessment.' }, { status: 400 });
    }
    const body = (await readJsonWithinLimit(request, 64 * 1024)) as Record<string, unknown>;
    const category = typeof body.category === 'string' && VALID_CATEGORIES.includes(body.category)
      ? body.category
      : 'Other';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!reason || reason.length < 5 || reason.length > 2000) {
      return NextResponse.json(
        { error: 'Please provide a clear reason between 5 and 2000 characters.' },
        { status: 400 },
      );
    }

    const user = await getRequestUser(request).catch(() => null);
    const admin = getSupabaseAdmin();
    const { data: quiz, error: quizError } = await admin.from('quizzes').select('id,settings').eq('id', id).maybeSingle();
    if (quizError || !quiz) return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 });

    const reportId = crypto.randomUUID();
    const reportPayload = {
      id: reportId,
      quiz_id: id,
      category,
      reason,
      reporter_key: user?.id || createHash('sha256').update(ip).digest('hex'),
      reporter_id: user?.id || null,
      created_at: new Date().toISOString(),
      status: 'pending',
    };

    const { error: dbError } = await admin.from('quiz_reports').insert(reportPayload);
    if (dbError && dbError.code !== '23505') {
      console.error('[api/report] Report persistence failed:', dbError.code || 'unknown');
      return NextResponse.json({ error: 'Report storage is not configured. Apply the quiz_reports setup before accepting reports.' }, { status: 503 });
    }

    const { count, error: countError } = await admin.from('quiz_reports').select('id', { count: 'exact', head: true }).eq('quiz_id', id).eq('status', 'pending');
    if (countError) throw countError;
    const reviewPaused = (count || 0) >= 5;
    if (reviewPaused && quiz.settings?.moderationStatus !== 'under_review') {
      const settings = quiz.settings && typeof quiz.settings === 'object' ? quiz.settings : {};
      const { error: pauseError } = await admin.from('quizzes').update({
        settings: { ...settings, moderationStatus: 'under_review', moderationPausedAt: new Date().toISOString() },
      }).eq('id', id);
      if (pauseError) throw pauseError;
    }

    return NextResponse.json({
      success: true,
      reportId,
      reviewPaused,
      message: reviewPaused
        ? 'This assessment has been paused for review after multiple independent reports.'
        : 'Report received. The assessment will be paused for review if it reaches the independent report threshold.',
    });
  } catch (error: unknown) {
    console.error('[api/report] Unexpected error submitting report:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json(
      { error: 'Unable to submit report. Please try again later.' },
      { status: 500 },
    );
  }
}
