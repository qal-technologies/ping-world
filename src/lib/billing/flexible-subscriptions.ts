import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  activeFlexibleEntitlements,
  FLEXIBLE_FEATURES,
  flexibleEntitlementSummary,
  readFlexibleEntitlements,
  type FlexibleToolEntitlement,
} from '@/lib/config/premium';
import { clearExpiredPremiumQuizData } from '@/lib/quiz/clear-expired-premium-data';

type BillingSubscription = Record<string, any>;

/** Apply one independently billed flexible tool without changing any other
 * tool's start date, billing interval, or expiry. */
export async function syncFlexibleSubscription(
  userId: string,
  subscription: BillingSubscription,
  mode: 'upsert' | 'delete' = 'upsert',
) {
  const subscriptionId = String(subscription.id || '');
  const toolId = String(
    subscription.metadata?.selectedFlexibleToolId ||
      subscription.metadata?.tool_id ||
      '',
  );
  if (
    !subscriptionId ||
    !FLEXIBLE_FEATURES.some((feature) => feature.id === toolId)
  )
    throw new Error('Flexible subscription identity could not be verified.');

  const admin = getSupabaseAdmin();
  const { data: account, error: accountError } =
    await admin.auth.admin.getUserById(userId);
  if (accountError || !account.user)
    throw accountError || new Error('Subscription account is unavailable.');
  const previous = account.user.app_metadata || {};
  const stored = readFlexibleEntitlements(previous);
  const previousEntry = stored.find(
    (entry) => entry.subscriptionId === subscriptionId,
  );
  const createdSeconds = Number(subscription.created);
  const startsAt =
    createdSeconds > 0 ?
      new Date(createdSeconds * 1000).toISOString()
    : previousEntry?.startsAt || new Date().toISOString();
  const newerSameTool = stored.find(
    (entry) =>
      entry.toolId === toolId &&
      entry.subscriptionId !== subscriptionId &&
      Date.parse(entry.startsAt) > Date.parse(startsAt),
  );
  // A delayed event from an older, canceled purchase must not overwrite or
  // remove a newer purchase of the same tool.
  if (newerSameTool)
    return {
      tier: previous.tier,
      purchasedTools: previous.purchased_tools || [],
      tierExpiresAt: previous.tier_expires_at,
      entitlements: activeFlexibleEntitlements(previous),
    };
  const all = stored.filter(
    (entry) =>
      entry.subscriptionId !== subscriptionId &&
      (mode === 'delete' || entry.toolId !== toolId),
  );
  const endSeconds = Number(subscription.current_period_end);
  const endMs = Number.isFinite(endSeconds) ? endSeconds * 1000 : 0;
  const currentStatus = String(subscription.status || '');

  if (mode !== 'delete') {
    if (['active', 'trialing'].includes(currentStatus) && endMs > Date.now()) {
      const interval = String(
        subscription.items?.data?.[0]?.price?.recurring?.interval || '',
      );
      all.push({
        toolId,
        subscriptionId,
        startsAt,
        expiresAt: new Date(endMs).toISOString(),
        billingCycle:
          interval === 'year' ? 'yearly'
          : interval === 'month' ? 'monthly'
          : previousEntry?.billingCycle || 'monthly',
        autoRenew: subscription.cancel_at_period_end !== true,
      });
    } else if (
      previousEntry &&
      Date.parse(previousEntry.expiresAt) > Date.now()
    ) {
      // A temporary payment-state change does not erase already-paid time.
      // Keep access only until the last confirmed period end, and don't claim
      // renewal until a successful billing event confirms it.
      all.push({ ...previousEntry, autoRenew: false });
    }
  }

  const summary = flexibleEntitlementSummary(all);
  const normalized = summary.active;
  const nextMetadata = {
    ...previous,
    tier: summary.tools.length ? 'flexible' : 'free',
    tier_started_at:
      normalized.length ?
        normalized.reduce(
          (earliest, entry) =>
            Date.parse(entry.startsAt) < Date.parse(earliest) ?
              entry.startsAt
            : earliest,
          normalized[0].startsAt,
        )
      : previous.tier_started_at || null,
    tier_expires_at: summary.expiresAt || new Date().toISOString(),
    tier_expired_at: summary.tools.length ? null : new Date().toISOString(),
    flexible_entitlements: all,
    purchased_tools: summary.tools,
    stripe_subscription_ids: normalized.flatMap((entry) =>
      entry.subscriptionId ? [entry.subscriptionId] : [],
    ),
    stripe_subscription_id: summary.subscriptionId,
    stripe_customer_id: String(
      subscription.customer?.id ||
        subscription.customer ||
        previous.stripe_customer_id ||
        '',
    ),
    auto_renew: summary.autoRenew,
    billing_cycle:
      normalized[0]?.billingCycle || previous.billing_cycle || 'monthly',
  };
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: nextMetadata,
  });
  if (updateError) throw updateError;
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({
      id: userId,
      tier: nextMetadata.tier,
      updated_at: new Date().toISOString(),
    });
  if (profileError) throw profileError;
  await clearExpiredPremiumQuizData(
    admin,
    userId,
    nextMetadata.tier,
    summary.tools,
  );
  return {
    tier: nextMetadata.tier,
    purchasedTools: summary.tools,
    tierExpiresAt: summary.expiresAt,
    entitlements: normalized,
  };
}

/** Refresh each flexible tool independently; outages preserve only unexpired,
 * previously confirmed access. Expired tools fail closed until payment confirms renewal. */
export async function reconcileFlexibleSubscriptions(
  userId: string,
  stripeKey?: string,
) {
  const admin = getSupabaseAdmin();
  const { data: account, error } = await admin.auth.admin.getUserById(userId);
  if (error || !account.user)
    throw error || new Error('Subscription account is unavailable.');
  const metadata = account.user.app_metadata || {};
  const existing = readFlexibleEntitlements(metadata);
  const refreshed: FlexibleToolEntitlement[] = [];
  for (const entry of existing) {
    if (!stripeKey) {
      if (Date.parse(entry.expiresAt) > Date.now()) refreshed.push(entry);
      continue;
    }
    if (!entry.subscriptionId) {
      if (Date.parse(entry.expiresAt) > Date.now()) refreshed.push(entry);
      continue;
    }
    try {
      const response = await fetch(
        `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(entry.subscriptionId)}`,
        {
          headers: { Authorization: `Bearer ${stripeKey}` },
          cache: 'no-store',
          signal: AbortSignal.timeout(8_000),
        },
      );
      const subscription = await response.json().catch(() => null);
      if (!response.ok || !subscription)
        throw new Error('Flexible tool billing status could not be verified.');
      const verifiedEnd = Number(subscription.current_period_end) * 1000;
      if (
        ['active', 'trialing'].includes(String(subscription.status)) &&
        verifiedEnd > Date.now()
      ) {
        const interval = String(
          subscription.items?.data?.[0]?.price?.recurring?.interval || '',
        );
        refreshed.push({
          ...entry,
          startsAt:
            Number(subscription.created) > 0 ?
              new Date(Number(subscription.created) * 1000).toISOString()
            : entry.startsAt,
          expiresAt: new Date(verifiedEnd).toISOString(),
          billingCycle:
            interval === 'year' ? 'yearly'
            : interval === 'month' ? 'monthly'
            : entry.billingCycle,
          autoRenew: subscription.cancel_at_period_end !== true,
        });
      } else if (
        Date.parse(entry.expiresAt) > Date.now() &&
        Number.isFinite(verifiedEnd) &&
        verifiedEnd > Date.now()
      ) {
        // Canceled at period end: keep the paid access until that exact end.
        refreshed.push({
          ...entry,
          expiresAt: new Date(verifiedEnd).toISOString(),
          autoRenew: false,
        });
      }
    } catch (lookupError) {
      if (Date.parse(entry.expiresAt) > Date.now()) refreshed.push(entry);
      else
        console.warn(
          '[subscription-reconcile] Expired flexible tool could not be renewed:',
          entry.toolId,
          lookupError instanceof Error ? lookupError.message : 'lookup failed',
        );
    }
  }
  const summary = flexibleEntitlementSummary(refreshed);
  const active = summary.active;
  const nextMetadata = {
    ...metadata,
    tier: summary.tools.length ? 'flexible' : 'free',
    tier_expires_at: summary.expiresAt || new Date().toISOString(),
    tier_expired_at: summary.tools.length ? null : new Date().toISOString(),
    flexible_entitlements: refreshed,
    purchased_tools: summary.tools,
    stripe_subscription_ids: active.flatMap((entry) =>
      entry.subscriptionId ? [entry.subscriptionId] : [],
    ),
    stripe_subscription_id: summary.subscriptionId,
    auto_renew: summary.autoRenew,
    billing_cycle:
      active[0]?.billingCycle || metadata.billing_cycle || 'monthly',
  };
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: nextMetadata,
  });
  if (updateError) throw updateError;
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({
      id: userId,
      tier: nextMetadata.tier,
      updated_at: new Date().toISOString(),
    });
  if (profileError) throw profileError;
  await clearExpiredPremiumQuizData(
    admin,
    userId,
    nextMetadata.tier,
    summary.tools,
  );
  return {
    tier: nextMetadata.tier,
    purchasedTools: summary.tools,
    tierExpiresAt: summary.expiresAt,
  };
}
