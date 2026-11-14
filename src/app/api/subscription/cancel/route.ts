import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { clearExpiredPremiumQuizData } from '@/lib/quiz/clear-expired-premium-data';
import { readFlexibleEntitlements } from '@/lib/config/premium';

export const dynamic = 'force-dynamic';

/** Immediately end the current paid entitlement, clean tier-gated assessment
 * settings, and attempt to cancel its linked billing subscription. If the
 * billing service cannot be reached, access is still cleared as requested;
 * reconciliation can later restore only a confirmed active entitlement. */
export async function POST(request: NextRequest) {
  if (isRateLimited(getClientIp(request), 'api:subscription-cancel', 5, 60_000).limited)
    return NextResponse.json({ error: 'Too many plan changes. Try again shortly.' }, { status: 429 });

  const user = await getRequestUser(request);
  if (!user?.id) return NextResponse.json({ error: 'Sign in to cancel your plan.' }, { status: 401 });

  try {
    const admin = getSupabaseAdmin();
    const { data: account, error: accountError } = await admin.auth.admin.getUserById(user.id);
    if (accountError || !account?.user) throw accountError || new Error('Account not found.');

    const metadata = account.user.app_metadata || {};
    const currentTier = String(metadata.tier || 'free');
    if (!['flexible', 'standard', 'pro'].includes(currentTier))
      return NextResponse.json({ error: 'There is no active paid plan to cancel.' }, { status: 409 });

    const subscriptionIds = currentTier === 'flexible'
      ? Array.from(new Set(readFlexibleEntitlements(metadata).flatMap((entry) => entry.subscriptionId ? [entry.subscriptionId] : [])))
      : typeof metadata.stripe_subscription_id === 'string' ? [metadata.stripe_subscription_id] : [];
    let billingCancellationConfirmed = subscriptionIds.length === 0;
    let billingCancellationPending = false;
    const secret = process.env.STRIPE_SECRET_KEY;

    if (subscriptionIds.length && secret) {
      const cancellations = await Promise.all(subscriptionIds.map(async (subscriptionId) => {
        const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(8_000),
        }).catch(() => null);
        const result = response ? await response.json().catch(() => null) : null;
        return Boolean(response?.ok && result && ['canceled', 'incomplete_expired'].includes(String(result.status)));
      }));
      billingCancellationConfirmed = cancellations.every(Boolean);
      billingCancellationPending = !billingCancellationConfirmed;
      // Keep entitlements if any independent bill could still be active.
      if (billingCancellationPending)
        return NextResponse.json({ error: 'Not all tool plans were confirmed as canceled. Access was left unchanged; retry shortly.' }, { status: 503 });
    } else if (subscriptionIds.length) {
      // No configured billing connection: clear local access now and retain the
      // subscription reference so the scheduled reconciliation can verify it.
      billingCancellationPending = true;
      return NextResponse.json({ error: 'The billing connection is unavailable. Access was left unchanged; retry when it is restored.' }, { status: 503 });
    }

    const nextMetadata = {
      ...metadata,
      tier: 'free',
      tier_expires_at: new Date().toISOString(),
      tier_expired_at: new Date().toISOString(),
      purchased_tools: [],
      auto_renew: false,
      ...(billingCancellationConfirmed ? { stripe_subscription_id: null } : {}),
      ...(billingCancellationConfirmed ? { stripe_subscription_ids: [], flexible_entitlements: [] } : {}),
      subscription_cancel_pending: billingCancellationPending,
    };
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(user.id, { app_metadata: nextMetadata });
    if (authUpdateError) throw authUpdateError;

    const { error: profileError } = await admin.from('profiles').upsert({
      id: user.id,
      tier: 'free',
      updated_at: new Date().toISOString(),
    });
    if (profileError) throw profileError;

    const cleanup = await clearExpiredPremiumQuizData(admin, user.id, 'free', []);
    return NextResponse.json({
      success: true,
      tier: 'free',
      cleanedAssessments: cleanup.quizzes,
      billingCancellationPending,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[api/subscription/cancel] Cancellation cleanup failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Plan access could not be fully cleared. Please retry.' }, { status: 503 });
  }
}
