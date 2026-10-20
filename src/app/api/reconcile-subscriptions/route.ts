import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { FLEXIBLE_FEATURES } from '@/lib/config/premium';
import { clearExpiredPremiumQuizData } from '@/lib/quiz/clear-expired-premium-data';

type SubscriptionSnapshot = {
  current_period_end?: number | string;
  status?: string;
  customer?: string | { id?: string };
  cancel_at_period_end?: boolean;
  metadata?: Record<string, unknown>;
};

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Daily reconciliation is a recovery path for missed/delayed Stripe webhooks. */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  // Sandbox deployments have no remote subscription provider. The separate
  // daily expiry cleanup still downgrades accounts at their stored expiry.
  if (!stripeKey) return NextResponse.json({ success: true, skipped: true, reason: 'Subscription provider is not configured; stored expiry cleanup remains active.' }, { headers: { 'Cache-Control': 'no-store' } });

  const admin = getSupabaseAdmin();
  const now = Date.now();
  let page = 1;
  let scanned = 0;
  let refreshed = 0;
  let downgraded = 0;
  const failures: string[] = [];
  try {
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 500 });
      if (error) throw error;
      const users = (data.users || []).filter((user) => typeof user.app_metadata?.stripe_subscription_id === 'string' && user.app_metadata.stripe_subscription_id);
      scanned += users.length;
      for (let offset = 0; offset < users.length; offset += 6) {
        const batch = users.slice(offset, offset + 6);
        const results = await Promise.allSettled(batch.map(async (user) => {
          const previous = user.app_metadata || {};
          const subscriptionId = String(previous.stripe_subscription_id);
          let response: Response;
          let subscription: SubscriptionSnapshot | null;
          try {
            response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
              headers: { Authorization: `Bearer ${stripeKey}` }, signal: AbortSignal.timeout(10_000), cache: 'no-store',
            });
            subscription = await response.json().catch(() => null) as SubscriptionSnapshot | null;
            if (!response.ok || !subscription) throw new Error('Subscription lookup failed.');
          } catch (lookupError) {
            const storedExpiry = typeof previous.tier_expires_at === 'string' ? Date.parse(previous.tier_expires_at) : Number.NaN;
            if (!Number.isFinite(storedExpiry) || storedExpiry > now) throw lookupError;
            // Once the last confirmed paid period has ended, fail closed if
            // the provider cannot confirm a renewal. A later successful
            // webhook or reconciliation can restore the verified entitlement.
            const expiredAt = new Date(storedExpiry).toISOString();
            const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
              app_metadata: { ...previous, tier: 'free', tier_expires_at: expiredAt, tier_expired_at: expiredAt, purchased_tools: [], auto_renew: false },
            });
            if (updateError) throw updateError;
            const { error: profileError } = await admin.from('profiles').upsert({ id: user.id, tier: 'free', updated_at: new Date().toISOString() });
            if (profileError) throw profileError;
            await clearExpiredPremiumQuizData(admin, user.id);
            return { refreshed: true, downgraded: true };
          }
          const periodEnd = Number(subscription.current_period_end);
          const validEnd = Number.isFinite(periodEnd) && periodEnd > 0 ? new Date(periodEnd * 1000).toISOString() : null;
          const entitledThroughPeriod = ['active', 'trialing'].includes(String(subscription.status)) && validEnd && periodEnd * 1000 > now;

          if (entitledThroughPeriod) {
            const requestedTier = String(subscription.metadata?.tier || previous.tier || 'free');
            const tier = ['flexible', 'standard', 'pro'].includes(requestedTier) ? requestedTier : 'free';
            const selectedTool = String(subscription.metadata?.selectedFlexibleToolId || previous.purchased_tools?.[0] || '');
            const purchasedTools = tier === 'free' ? [] : tier === 'flexible'
              ? (FLEXIBLE_FEATURES.some((feature) => feature.id === selectedTool) ? [selectedTool] : [])
              : ['all'];
            if (tier === 'flexible' && purchasedTools.length === 0) throw new Error('Flexible subscription has no valid tool entitlement.');
            const tierRank: Record<string, number> = { free: 0, flexible: 1, standard: 2, pro: 3 };
            const previousTools = Array.isArray(previous.purchased_tools) ? previous.purchased_tools.map(String) : [];
            const hadQuizEntitlement = previous.tier === 'pro' || previous.tier === 'standard' || (previous.tier === 'flexible' && previousTools.some((tool) => ['quizzable', 'quiz', 'quiz-builder'].includes(tool.toLowerCase())));
            const hasQuizEntitlement = tier === 'pro' || tier === 'standard' || (tier === 'flexible' && purchasedTools.some((tool) => ['quizzable', 'quiz', 'quiz-builder'].includes(tool.toLowerCase())));
            const downgraded = (tierRank[tier] ?? 0) < (tierRank[String(previous.tier || 'free')] ?? 0) || (hadQuizEntitlement && !hasQuizEntitlement);
            const stripeCustomer = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
            const nextMetadata = { ...previous, tier, tier_expires_at: validEnd, tier_expired_at: null, purchased_tools: purchasedTools, stripe_customer_id: String(stripeCustomer || previous.stripe_customer_id || ''), auto_renew: !subscription.cancel_at_period_end };
            const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { app_metadata: nextMetadata });
            if (updateError) throw updateError;
            const { error: profileError } = await admin.from('profiles').upsert({ id: user.id, tier, updated_at: new Date().toISOString() });
            if (profileError) throw profileError;
            if (downgraded) await clearExpiredPremiumQuizData(admin, user.id, tier, purchasedTools);
            return { refreshed: true, downgraded };
          }

          // Keep access only through a Stripe-confirmed paid period. A canceled,
          // incomplete, or expired subscription is downgraded after that end.
          if (previous.tier && previous.tier !== 'free') {
            const endedAt = validEnd || new Date(now).toISOString();
            const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
              app_metadata: { ...previous, tier: 'free', tier_expires_at: endedAt, tier_expired_at: endedAt, purchased_tools: [], auto_renew: false },
            });
            if (updateError) throw updateError;
            const { error: profileError } = await admin.from('profiles').upsert({ id: user.id, tier: 'free', updated_at: new Date().toISOString() });
            if (profileError) throw profileError;
            await clearExpiredPremiumQuizData(admin, user.id);
            return { refreshed: true, downgraded: true };
          }
          return { refreshed: false, downgraded: false };
        }));
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            if (result.value.refreshed) refreshed++;
            if (result.value.downgraded) downgraded++;
          } else failures.push(`${batch[index].id}: ${result.reason instanceof Error ? result.reason.message : 'reconciliation failed'}`);
        });
      }
      if ((data.users || []).length < 500) break;
      page++;
    }
    return NextResponse.json({ success: failures.length === 0, scanned, refreshed, downgraded, failed: failures.length, checkedAt: new Date(now).toISOString() }, { status: failures.length ? 503 : 200, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Subscription reconciliation failed.', scanned, refreshed, downgraded }, { status: 503 });
  }
}
