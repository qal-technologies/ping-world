import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendPushToUser } from '@/lib/notifications/push-server';

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: batches, error } = await admin.from('notification_batches')
    .select('id,recipient_id,resource_id,pending_count,total_count')
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
      const { data: quiz } = await admin.from('quizzes').select('title').eq('id', batch.resource_id).maybeSingle();
      const { data: account } = await admin.auth.admin.getUserById(batch.recipient_id);
      const preferences = account.user?.user_metadata?.notification_preferences || {};
      if (preferences.assessmentResponses === false) {
        await admin.rpc('ack_notification_batch', { batch_uuid: batch.id, claim_token: claimToken, delivered_count: snapshot });
        continue;
      }
      const { count: currentTotal } = await admin.from('quiz_responses').select('id', { count: 'exact', head: true }).eq('quiz_id', batch.resource_id);
      const result = await sendPushToUser(admin, batch.recipient_id, {
        title: 'Assessment responses',
        body: `${snapshot} new response${snapshot === 1 ? '' : 's'} for “${String(quiz?.title || 'your assessment').slice(0, 100)}”. ${currentTotal || 0} total response${currentTotal === 1 ? '' : 's'}.`,
        url: '/quiz', tag: `assessment-response-${batch.resource_id}`,
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
