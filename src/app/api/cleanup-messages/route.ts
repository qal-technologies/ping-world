import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';

/**
 * GET /api/cleanup-messages
 *
 * Scheduled via Vercel Cron (vercel.json) to run daily at 2:00 AM UTC.
 * Deletes all anonymous messages that have passed their `expires_at` timestamp
 * from the Supabase `messages` table. Safe to run manually or via cron.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  // Limit to 5 requests per minute per IP to prevent brute force / DDOS
  const { limited } = isRateLimited(ip, 'api:cleanup-messages', 5, 60 * 1000);
  if (limited) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Protect this endpoint with a secret header to prevent public abuse
  const authHeader = req.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized cron request' },
      { status: 401 },
    );
  }

  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('messages')
      .delete()
      .lt('expires_at', now)
      .select('id');

    if (error) {
      console.error('[cleanup-messages] Supabase delete error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    const deletedCount = data?.length ?? 0;
    console.info(
      `[cleanup-messages] Removed ${deletedCount} expired messages at ${now}`,
    );

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      timestamp: now,
    });
  } catch (err: any) {
    console.error('[cleanup-messages] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Unknown error' },
      { status: 500 },
    );
  }
}
