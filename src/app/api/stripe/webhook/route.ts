import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendThemedEmail } from '@/lib/email/resend';
import { FLEXIBLE_FEATURES } from '@/lib/config/premium';
import { clearExpiredPremiumQuizData } from '@/lib/quiz/clear-expired-premium-data';

export const runtime = 'nodejs';

function validStripeSignature(rawBody: string, signature: string, secret: string) {
  const fields = signature.split(',').map((part) => part.split('=', 2));
  const timestamp = fields.find(([key]) => key === 't')?.[1];
  const signatures = fields.filter(([key]) => key === 'v1').map(([, value]) => value).filter(Boolean);
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 || signatures.length === 0) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest();
  return signatures.some((value) => {
    if (!/^[a-f0-9]{64}$/i.test(value)) return false;
    const candidate = Buffer.from(value, 'hex');
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature') || '';
  if (!secret) return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 });
  if (Number(request.headers.get('content-length') || 0) > 1_000_000) return NextResponse.json({ error: 'Webhook payload is too large.' }, { status: 413 });
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > 1_000_000 || !validStripeSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }

  try {
    const event = JSON.parse(rawBody) as { type?: string; data?: { object?: Record<string, any> } };
    const admin = getSupabaseAdmin();
    if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
      const subscription = event.data?.object;
      if (!subscription) return NextResponse.json({ error: 'Subscription event is incomplete.' }, { status: 400 });
      const userId = String(subscription?.metadata?.user_id || '');
      if (!/^[0-9a-f-]{36}$/i.test(userId)) return NextResponse.json({ received: true });
      const subscriptionActive = event.type === 'customer.subscription.updated' &&
        ['active', 'trialing'].includes(String(subscription?.status)) &&
        Number.isFinite(Number(subscription?.current_period_end));
      const tier = subscriptionActive && ['flexible', 'standard', 'pro'].includes(String(subscription?.metadata?.tier))
        ? String(subscription.metadata.tier) : 'free';
      const expiresAt = subscriptionActive
        ? new Date(Number(subscription.current_period_end) * 1000).toISOString()
        : new Date().toISOString();
      const selectedTool = String(subscription?.metadata?.selectedFlexibleToolId || '');
      const tools = tier === 'free' ? [] : tier === 'flexible'
        ? (FLEXIBLE_FEATURES.some((feature) => feature.id === selectedTool) ? [selectedTool] : [])
        : ['all'];
      const { data: account, error: accountError } = await admin.auth.admin.getUserById(userId);
      if (accountError || !account.user) return NextResponse.json({ error: 'Subscription account is unavailable.' }, { status: 503 });
      const { error } = await admin.auth.admin.updateUserById(userId, {
        app_metadata: { ...account.user.app_metadata, tier, tier_expires_at: expiresAt, tier_expired_at: tier === 'free' ? expiresAt : null, purchased_tools: tools },
      });
      if (error) return NextResponse.json({ error: 'Could not update subscription status.' }, { status: 503 });
      await admin.from('profiles').upsert({ id: userId, tier, updated_at: new Date().toISOString() });
      if (tier === 'free') {
        try { await clearExpiredPremiumQuizData(admin, userId); }
        catch (cleanupError) {
          console.error('[stripe/webhook] Premium quiz cleanup failed:', cleanupError instanceof Error ? cleanupError.message : 'unknown');
          return NextResponse.json({ error: 'Plan changed, but premium quiz cleanup will retry.' }, { status: 503 });
        }
      }
      return NextResponse.json({ received: true });
    }
    if (event.type !== 'checkout.session.completed') return NextResponse.json({ received: true });
    const session = event.data?.object;
    if (!session || session.mode !== 'subscription' || !['paid', 'no_payment_required'].includes(session.payment_status)) {
      return NextResponse.json({ received: true });
    }
    const userId = String(session.metadata?.user_id || session.client_reference_id || '');
    const tier = String(session.metadata?.tier || '');
    const selectedTool = String(session.metadata?.selectedFlexibleToolId || 'all');
    if (!/^[0-9a-f-]{36}$/i.test(userId) || !['flexible', 'standard', 'pro'].includes(tier) || typeof session.subscription !== 'string') {
      return NextResponse.json({ error: 'Invalid checkout metadata.' }, { status: 400 });
    }
    if (tier === 'flexible' && !FLEXIBLE_FEATURES.some((feature) => feature.id === selectedTool)) {
      return NextResponse.json({ error: 'Invalid flexible plan feature.' }, { status: 400 });
    }
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return NextResponse.json({ error: 'Billing is not configured.' }, { status: 503 });
    const subscriptionResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(session.subscription)}`, {
      headers: { Authorization: `Bearer ${stripeKey}` }, signal: AbortSignal.timeout(8_000),
    });
    if (!subscriptionResponse.ok) return NextResponse.json({ error: 'Could not verify subscription status.' }, { status: 503 });
    const subscription = await subscriptionResponse.json();
    if (!['active', 'trialing'].includes(subscription.status) || !Number.isFinite(subscription.current_period_end)) {
      return NextResponse.json({ received: true });
    }

    const { data: account, error: userError } = await admin.auth.admin.getUserById(userId);
    if (userError || !account.user?.email || !account.user.email_confirmed_at) return NextResponse.json({ error: 'Subscription account is unavailable.' }, { status: 503 });
    const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { ...account.user.app_metadata, tier, tier_expires_at: expiresAt, tier_expired_at: null, purchased_tools: tier === 'flexible' ? [selectedTool] : ['all'], stripe_customer_id: String(session.customer || ''), stripe_subscription_id: session.subscription },
      user_metadata: { ...account.user.user_metadata, tier, tier_expires_at: expiresAt, tier_expired_at: null, purchased_tools: tier === 'flexible' ? [selectedTool] : ['all'] },
    });
    if (updateError) return NextResponse.json({ error: 'Could not apply subscription.' }, { status: 503 });

    const emailKey = `subscription:${session.id}`;
    const { error: claimError } = await admin.from('transactional_email_events').insert({ owner_id: userId, event_key: emailKey, email_type: 'subscription_confirmed', status: 'pending' });
    if (!claimError) {
      try {
        await sendThemedEmail(account.user.email, 'Your Ping World subscription is active', 'Subscription confirmed', `Your ${tier} subscription is active through ${new Date(expiresAt).toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' })}. Your plan features are now available in Ping World.`, emailKey);
        await admin.from('transactional_email_events').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('event_key', emailKey);
      } catch {
        await admin.from('transactional_email_events').delete().eq('event_key', emailKey).eq('status', 'pending');
        return NextResponse.json({ error: 'Subscription applied, email delivery will retry.' }, { status: 503 });
      }
    } else if (claimError.code !== '23505') {
      return NextResponse.json({ error: 'Subscription applied, email could not be queued.' }, { status: 503 });
    }
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 503 });
  }
}
