import { NextRequest, NextResponse } from 'next/server';
import { getRequestUserFromToken, readJsonWithinLimit } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { queueInAppNotification } from '@/lib/notifications/in-app';
import { after } from 'next/server';
import { isNotificationRecipientActive, sendPushToUser } from '@/lib/notifications/push-server';

export const dynamic = 'force-dynamic';

/** Authenticated, self-targeted entry point for app features to create a durable
 * in-app notification. Other users' IDs can never be supplied as recipients. */
export async function POST(request: NextRequest) {
  if (isRateLimited(getClientIp(request), 'api:notification-emit', 30, 60_000).limited) {
    return NextResponse.json({ error: 'Too many notification requests.' }, { status: 429 });
  }
  try {
    const body = await readJsonWithinLimit(request, 12 * 1024) as Record<string, unknown>;
    const token = typeof body.accessToken === 'string' ? body.accessToken : '';
    if (!token || token.length > 16 * 1024) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const user = await getRequestUserFromToken(token);
    if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    if (isRateLimited(user.id, 'api:notification-emit:user', 30, 60_000).limited) {
      return NextResponse.json({ error: 'Too many notification requests.' }, { status: 429 });
    }
    const resourceId = typeof body.resourceId === 'string' ? body.resourceId : '';
    const type = typeof body.type === 'string' ? body.type : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const message = typeof body.body === 'string' ? body.body.trim() : '';
    if (!/^[0-9a-f-]{36}$/i.test(resourceId) || !/^[a-z][a-z0-9_]{1,63}$/.test(type) || !title || title.length > 160 || message.length > 1000) {
      return NextResponse.json({ error: 'Invalid notification.' }, { status: 400 });
    }
    const action = body.action && typeof body.action === 'object' ? body.action as Record<string, unknown> : null;
    const label = typeof action?.label === 'string' ? action.label.slice(0, 40) : undefined;
    const href = typeof action?.href === 'string' ? action.href : undefined;
    const admin = getSupabaseAdmin();
    const preferences = user.user_metadata?.notification_preferences;
    const preferenceKey = type === 'assessment_response' ? 'assessmentResponses' : type;
    if (preferences && typeof preferences === 'object' && ((preferences as Record<string, unknown>)[preferenceKey] === false || ((preferences as Record<string, unknown>).tools as Record<string, unknown> | undefined)?.[type] === false)) {
      return NextResponse.json({ success: true, disabled: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const { data, error } = await queueInAppNotification(admin, {
      recipientId: user.id,
      resourceId,
      type,
      title,
      body: message,
      action: href && label ? { href, label } : undefined,
      icon: typeof body.icon === 'string' ? body.icon.slice(0, 40) : undefined,
    });
    if (error) throw error;
    const id = Array.isArray(data) ? data[0]?.id : data;
    if (typeof id !== 'string') throw new Error('Notification queue did not return an ID.');
    const { data: batch, error: readError } = await admin.from('notification_batches')
      .select('id,total_count,read_count,payload').eq('id', id).eq('recipient_id', user.id).maybeSingle();
    if (readError || !batch) throw readError || new Error('Notification batch was not available after enqueue.');
    after(async () => {
      // Active clients receive the durable row through realtime/polling; inactive
      // clients receive Web Push. The batch is acknowledged only after delivery.
      let claimToken: string | null = null;
      try {
        if (await isNotificationRecipientActive(admin, user.id)) return;
        claimToken = crypto.randomUUID();
        const { data: claimed } = await admin.rpc('claim_notification_batch', { batch_uuid: id, claim_token: claimToken });
        if (!claimed?.length) return;
        const pending = Math.max(1, Number(claimed[0].pending_count) || 1);
        const delivery = await sendPushToUser(admin, user.id, {
          title,
          body: message,
          url: href && href.startsWith('/') ? href : '/dashboard',
          tag: `app-${type}-${resourceId}`,
        });
        if (delivery.delivered > 0) await admin.rpc('ack_notification_batch', { batch_uuid: id, claim_token: claimToken, delivered_count: pending });
        else await admin.rpc('release_notification_batch', { batch_uuid: id, claim_token: claimToken });
      } catch (pushError) {
        console.warn('[api/notifications/emit] Push deferred to batch retry:', pushError instanceof Error ? pushError.message : 'unknown');
        if (claimToken) await admin.rpc('release_notification_batch', { batch_uuid: id, claim_token: claimToken });
      }
    });
    return NextResponse.json({ success: true, id, totalCount: batch.total_count, unreadCount: Math.max(0, Number(batch.total_count) - Number(batch.read_count || 0)), payload: batch.payload }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[api/notifications/emit] Failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Could not create notification.' }, { status: 503 });
  }
}
