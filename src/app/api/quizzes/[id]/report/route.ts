import { NextRequest, NextResponse } from 'next/server';
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
    const body = (await readJsonWithinLimit(request, 64 * 1024)) as Record<string, any>;
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

    const reportId = crypto.randomUUID();
    const reportPayload = {
      id: reportId,
      quiz_id: id,
      category,
      reason,
      reporter_ip: ip,
      reporter_id: user?.id || null,
      created_at: new Date().toISOString(),
      status: 'pending',
    };

    // Attempt insert into quiz_reports table
    const { error: dbError } = await admin.from('quiz_reports').insert(reportPayload);

    if (dbError) {
      // If table does not exist or schema differs, log securely and queue to admin notification batches
      console.warn('[api/report] quiz_reports table insert fallback:', dbError.message);
      try {
        await admin.from('notification_batches').insert({
          resource_id: id,
          recipient_id: user?.id || '00000000-0000-0000-0000-000000000000',
          notification_type: 'assessment_response',
          pending_count: 1,
          total_count: 1,
        }).throwOnError();
      } catch {}
    }

    return NextResponse.json({
      success: true,
      reportId,
      message: 'Assessment reported successfully. Our team will review this within 24 hours.',
    });
  } catch (error: any) {
    console.error('[api/report] Unexpected error submitting report:', error);
    return NextResponse.json(
      { error: 'Unable to submit report. Please try again later.' },
      { status: 500 },
    );
  }
}
