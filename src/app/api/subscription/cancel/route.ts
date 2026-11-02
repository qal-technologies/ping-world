import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { clearExpiredPremiumQuizData } from '@/lib/quiz/clear-expired-premium-data';

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

    const subscriptionId = typeof metadata.stripe_subscription_id === 'string'
      ? metadata.stripe_subscription_id
      : '';
    let billingCancellationConfirmed = !subscriptionId;
    let billingCancellationPending = false;
    const secret = process.env.STRIPE_SECRET_KEY;

    if (subscriptionId && secret) {
      try {
        const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${secret}` },
          signal: AbortSignal.timeout(8_000),
        });
        billingCancellationConfirmed = response.ok;
        billingCancellationPending = !response.ok;
      } catch {
        billingCancellationPending = true;
      }
    } else if (subscriptionId) {
      // No configured billing connection: clear local access now and retain the
      // subscription reference so the scheduled reconciliation can verify it.
      billingCancellationPending = true;
    }

    const nextMetadata = {
      ...metadata,
      tier: 'free',
      tier_expires_at: new Date().toISOString(),
      tier_expired_at: new Date().toISOString(),
      purchased_tools: [],
      auto_renew: false,
      ...(billingCancellationConfirmed ? { stripe_subscription_id: null } : {}),
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
