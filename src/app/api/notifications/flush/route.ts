import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isNotificationRecipientActive, sendPushToUser } from '@/lib/notifications/push-server';

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { error: presenceCleanupError } = await admin.from('notification_presence')
    .delete().lt('active_until', new Date().toISOString());
  if (presenceCleanupError) console.warn('[notifications/flush] Presence cleanup skipped:', presenceCleanupError.code || 'unknown');
  const { data: batches, error } = await admin.from('notification_batches')
    .select('id,recipient_id,resource_id,notification_type,payload,pending_count,total_count')
    .gt('pending_count', 0).lte('last_event_at', new Date(Date.now() - 60_000).toISOString())
    .or(`claim_until.is.null,claim_until.lt.${new Date().toISOString()}`).limit(50);
  if (error) return NextResponse.json({ error: 'Could not load notification batches.' }, { status: 503 });

  let delivered = 0;
  for (const batch of batches || []) {
    const claimToken = crypto.randomUUID();
    const { data: claimed, error: claimError } = await admin.rpc('claim_notification_batch', {
      batch_uuid: batch.id, claim_token: claimToken,
    });
    if (claimError || !claimed?.length) continue;
    const snapshot = Number(claimed[0].pending_count) || 0;
    try {
      const { data: account } = await admin.auth.admin.getUserById(batch.recipient_id);
      const preferences = account.user?.user_metadata?.notification_preferences || {};
      if (batch.notification_type === 'assessment_response' && preferences.assessmentResponses === false) {
        await admin.rpc('ack_notification_batch', { batch_uuid: batch.id, claim_token: claimToken, delivered_count: snapshot });
        continue;
      }
      if (await isNotificationRecipientActive(admin, batch.recipient_id)) {
        await admin.rpc('ack_notification_batch', { batch_uuid: batch.id, claim_token: claimToken, delivered_count: snapshot });
        continue;
      }
      const payload = batch.payload && typeof batch.payload === 'object' ? batch.payload as Record<string, unknown> : {};
      const rawAction = payload.action && typeof payload.action === 'object' ? payload.action as Record<string, unknown> : {};
      const rawUrl = typeof rawAction.href === 'string' ? rawAction.href : '/dashboard';
      const safeUrl = rawUrl.startsWith('/') && !rawUrl.startsWith('//') ? rawUrl : '/dashboard';
      let title = typeof payload.title === 'string' ? payload.title.slice(0, 100) : 'Pingwrld update';
      let body = typeof payload.body === 'string' ? payload.body.slice(0, 240) : `${snapshot} new update${snapshot === 1 ? '' : 's'}.`;
      if (batch.notification_type === 'assessment_response') {
        const { data: quiz } = await admin.from('quizzes').select('title').eq('id', batch.resource_id).maybeSingle();
        const { count: currentTotal } = await admin.from('quiz_responses').select('id', { count: 'exact', head: true }).eq('quiz_id', batch.resource_id);
        title = 'Assessment responses';
        body = `${snapshot} new response${snapshot === 1 ? '' : 's'} for “${String(quiz?.title || 'your assessment').slice(0, 100)}”. ${currentTotal || 0} total response${currentTotal === 1 ? '' : 's'}.`;
      }
      const result = await sendPushToUser(admin, batch.recipient_id, {
        title, body, url: safeUrl, tag: `pingwrld-${batch.notification_type}-${batch.resource_id}`,
      });
      if (result.delivered > 0) {
        await admin.rpc('ack_notification_batch', { batch_uuid: batch.id, claim_token: claimToken, delivered_count: snapshot });
        delivered += 1;
      } else {
        await admin.rpc('release_notification_batch', { batch_uuid: batch.id, claim_token: claimToken });
      }
    } catch {
      await admin.rpc('release_notification_batch', { batch_uuid: batch.id, claim_token: claimToken });
    }
  }
  return NextResponse.json({ processed: delivered }, { headers: { 'Cache-Control': 'no-store' } });
}
