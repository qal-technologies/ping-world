import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';

/**
 * GET /api/cleanup-quizzes
 * Deletes Supabase quiz entries older than their expires_at timestamp.
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
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const now = new Date().toISOString();

    // Delete expired quizzes from Supabase
    const { data: deleted, error } = await supabase
      .from('quizzes')
      .delete()
      .lt('expires_at', now)
      .not('expires_at', 'is', null)
      .select('id');

    if (error) {
      console.error('[cleanup-quizzes] Supabase delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const count = deleted?.length ?? 0;
    console.info(
      `[cleanup-quizzes] Purged ${count} expired quiz(es) at ${now}`,
    );

    return NextResponse.json({
      success: true,
      deletedCount: count,
      purgedAt: now,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
