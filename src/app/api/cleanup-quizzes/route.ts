import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';

/**
 * GET /api/cleanup-quizzes
 * Deletes Supabase quiz entries expired for more than 48 hours.
 * Called by Vercel Cron Job (see vercel.json). Protected by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  // Limit to 5 requests per minute per IP to prevent brute force / DDOS
  const { limited } = isRateLimited(ip, 'api:cleanup-quizzes', 5, 60 * 1000);
  if (limited) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Verify this is a legitimate cron invocation
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date().toISOString();
    const admin = getSupabaseAdmin();
    const { data: expired, error: selectError } = await admin.from('quizzes')
      .select('id').not('expires_at', 'is', null)
      .lt('expires_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .order('expires_at', { ascending: true }).limit(100);
    if (selectError) throw selectError;
    const quizIds = (expired || []).map((quiz) => quiz.id).filter(Boolean);

    // Delete files through Storage API first; only then delete quiz rows.
    // If file cleanup fails, leave the quiz rows for a safe retry next run.
    if (quizIds.length) {
      const { data: media, error: mediaError } = await admin.rpc('list_expired_quiz_media', { p_quiz_ids: quizIds });
      if (mediaError) throw mediaError;
      const byBucket = new Map<string, string[]>();
      for (const item of media || []) {
        const bucket = String(item.bucket_id || '');
        const name = String(item.object_name || '');
        if (!['quiz-media', 'quiz-response-media'].includes(bucket) || !name) continue;
        byBucket.set(bucket, [...(byBucket.get(bucket) || []), name]);
      }
      for (const [bucket, paths] of byBucket) {
        for (let offset = 0; offset < paths.length; offset += 100) {
          const { error } = await admin.storage.from(bucket).remove(paths.slice(offset, offset + 100));
          if (error) throw error;
        }
      }
      const { data: deletedCount, error } = await admin.rpc('cleanup_expired_quizzes', { p_quiz_ids: quizIds });
      if (error) throw error;
      const count = Number(deletedCount) || 0;
      console.info(`[cleanup-quizzes] Purged ${count} quiz(es) and related media at ${now}`);
      return NextResponse.json({ success: true, deletedCount: count, mediaDeleted: [...byBucket.values()].reduce((sum, paths) => sum + paths.length, 0), purgedAt: now });
    }

    const deletedCount = 0;

    return NextResponse.json({
      success: true,
      deletedCount,
      mediaDeleted: 0,
      purgedAt: now,
    });
  } catch (err: unknown) {
    console.error('[cleanup-quizzes] Unexpected cleanup failure.');
    return NextResponse.json({ error: 'Cleanup failed.' }, { status: 500 });
  }
}
