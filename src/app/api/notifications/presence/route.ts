import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser, readJsonWithinLimit } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (isRateLimited(getClientIp(request), 'api:notification-presence', 120, 60_000).limited) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const body = await readJsonWithinLimit(request, 1024) as { active?: unknown };
    if (body.active !== true) return NextResponse.json({ success: true });
    const admin = getSupabaseAdmin();
    const { error } = await admin.from('notification_presence').upsert({
      recipient_id: user.id,
      active_until: new Date(Date.now() + 90_000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'recipient_id' });
    if (error) throw error;
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[api/notifications/presence] Update failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Could not update notification presence.' }, { status: 503 });
  }
}
