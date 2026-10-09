import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { clearExpiredPremiumQuizData } from '@/lib/quiz/clear-expired-premium-data';
import { FLEXIBLE_FEATURES, PREMIUM_TIERS } from '@/lib/config/premium';


export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Runs daily. Auth app_metadata is authoritative; expired accounts are
 * downgraded first, then their Pro-only quiz settings and branding objects are
 * removed. Quiz/response content is preserved. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const now = Date.now();
  let page = 1;
  let scanned = 0;
  let downgraded = 0;
  let cleaned = 0;
  const failures: string[] = [];

  try {
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 500 });
      if (error) throw error;
      const users = data.users || [];
      scanned += users.length;
      const expired = users.filter((user) => {
        const metadata = user.app_metadata || {};
        const tier = String(metadata.tier || 'free');
        const expiry = typeof metadata.tier_expires_at === 'string' ? Date.parse(metadata.tier_expires_at) : Number.NaN;
        const legacyExpiredAt = typeof metadata.tier_expired_at === 'string' ? Date.parse(metadata.tier_expired_at) : Number.NaN;
        const effectiveExpiry = Number.isFinite(expiry) ? expiry : legacyExpiredAt;
        const cleanup = typeof metadata.premium_quiz_cleanup_at === 'string' ? Date.parse(metadata.premium_quiz_cleanup_at) : 0;
        return Number.isFinite(effectiveExpiry) && effectiveExpiry <= now && cleanup < effectiveExpiry && (tier !== 'free' || Number.isFinite(legacyExpiredAt));
      });

      for (let offset = 0; offset < expired.length; offset += 8) {
        const batch = expired.slice(offset, offset + 8);
        const results = await Promise.allSettled(batch.map(async (user) => {
          let currentUser = user;
          let metadata = currentUser.app_metadata || {};
          let expiry = typeof metadata.tier_expires_at === 'string' ? metadata.tier_expires_at : String(metadata.tier_expired_at);
          const subscriptionId = typeof metadata.stripe_subscription_id === 'string' ? metadata.stripe_subscription_id : '';
          if (subscriptionId && stripeKey) {
            const stripeResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
              headers: { Authorization: `Bearer ${stripeKey}` }, signal: AbortSignal.timeout(10_000), cache: 'no-store',
            });
            const stripeSubscription = await stripeResponse.json().catch(() => null);
            if (!stripeResponse.ok || !stripeSubscription) throw new Error('Could not verify Stripe subscription before expiry cleanup.');
            if (['active', 'trialing', 'past_due', 'unpaid', 'incomplete'].includes(String(stripeSubscription.status))) {
              const stripeEnd = Number(stripeSubscription.current_period_end);
              if (Number.isFinite(stripeEnd) && stripeEnd * 1000 > now) {
                expiry = new Date(stripeEnd * 1000).toISOString();
                const tier = ['flexible', 'standard', 'pro'].includes(String(metadata.tier)) ? String(metadata.tier) : 'free';
                const selectedTool = String(stripeSubscription.metadata?.selectedFlexibleToolId || metadata.purchased_tools?.[0] || '');
                const tools = tier === 'flexible' ? (FLEXIBLE_FEATURES.some((feature) => feature.id === selectedTool) ? [selectedTool] : []) : tier === 'free' ? [] : ['all'];
                const { data: account, error: lookupError } = await admin.auth.admin.getUserById(user.id);
                if (lookupError || !account.user) throw lookupError || new Error('Could not load subscription account.');
                const refreshedMetadata = { ...metadata, tier, tier_expires_at: expiry, tier_expired_at: null, purchased_tools: tools, stripe_subscription_id: subscriptionId, auto_renew: !stripeSubscription.cancel_at_period_end };
                const { error: refreshError } = await admin.auth.admin.updateUserById(user.id, { app_metadata: refreshedMetadata });
                if (refreshError) throw refreshError;
                await admin.from('profiles').upsert({ id: user.id, tier, updated_at: new Date().toISOString() });
                await clearExpiredPremiumQuizData(admin, user.id).catch(() => undefined);
                return user.id;
              }
              if (['active', 'trialing'].includes(String(stripeSubscription.status))) {
                throw new Error('Stripe reports an active subscription but no valid future period end. Cleanup deferred.');
              }
            }
          } else if (subscriptionId && !stripeKey) {
            throw new Error('Stripe is not configured; refusing to clear a Stripe-backed entitlement.');
          }
          if (String(metadata.tier || 'free') !== 'free') {
            const nextAppMetadata = { ...metadata, tier: 'free', purchased_tools: [], tier_expired_at: expiry };
            const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
              app_metadata: nextAppMetadata,
              user_metadata: { ...(user.user_metadata || {}), tier: 'free', purchased_tools: [], tier_expires_at: expiry },
            });
            if (updateError) throw updateError;
            const { error: profileError } = await admin.from('profiles').upsert({ id: user.id, tier: 'free', updated_at: new Date().toISOString() });
            if (profileError) throw profileError;
          }
          await clearExpiredPremiumQuizData(admin, user.id);
          return user.id;
        }));
        for (let index = 0; index < results.length; index++) {
          const result = results[index];
          if (result.status === 'fulfilled') {
            cleaned++;
            if (String(batch[index].app_metadata?.tier || 'free') !== 'free') downgraded++;
          } else {
            failures.push(`${batch[index].id}: ${result.reason instanceof Error ? result.reason.message : 'cleanup failed'}`);
          }
        }
      }
      if (users.length < 500) break;
      page++;
    }
    if (failures.length) {
      console.error('[cleanup-premium] Some expired accounts need retry:', failures.slice(0, 10));
      return NextResponse.json({ success: false, scanned, downgraded, cleaned, failed: failures.length }, { status: 503 });
    }
    return NextResponse.json({ success: true, scanned, downgraded, cleaned, checkedAt: new Date(now).toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[cleanup-premium] Sweep failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Premium account cleanup failed.', scanned, downgraded, cleaned }, { status: 503 });
  }
}
