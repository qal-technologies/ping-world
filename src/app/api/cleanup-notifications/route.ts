import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Remove notification batches that have been inactive for at least 30 days. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await getSupabaseAdmin()
      .from('notification_batches')
      .delete({ count: 'exact' })
      .lt('last_event_at', cutoff);
    if (error) throw error;
    return NextResponse.json({ success: true, deleted: count || 0, cutoff }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[cleanup-notifications] Sweep failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Notification cleanup failed.' }, { status: 503 });
  }
}
