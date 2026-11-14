import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser, readJsonWithinLimit } from '@/lib/api-auth';
import {
  activeFlexibleEntitlements,
  FLEXIBLE_FEATURES,
  flexibleEntitlementSummary,
  readFlexibleEntitlements,
} from '@/lib/config/premium';
import { clearExpiredPremiumQuizData } from '@/lib/quiz/clear-expired-premium-data';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

/** Cancel exactly one flexible tool subscription and revoke that tool now. */
export async function POST(request: NextRequest) {
  if (
    isRateLimited(getClientIp(request), 'api:flexible-tool-cancel', 5, 60_000)
      .limited
  )
    return NextResponse.json(
      { error: 'Too many plan changes. Try again shortly.' },
      { status: 429 },
    );
  const user = await getRequestUser(request);
  if (!user?.id)
    return NextResponse.json(
      { error: 'Sign in to manage your plan.' },
      { status: 401 },
    );
  let body: { toolId?: unknown };
  try {
    body = (await readJsonWithinLimit(request, 4 * 1024)) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const toolId = typeof body.toolId === 'string' ? body.toolId : '';
  if (!FLEXIBLE_FEATURES.some((feature) => feature.id === toolId))
    return NextResponse.json(
      { error: 'Choose a valid flexible tool.' },
      { status: 400 },
    );

  try {
    const admin = getSupabaseAdmin();
    const { data: account, error } = await admin.auth.admin.getUserById(
      user.id,
    );
    if (error || !account.user) throw error || new Error('Account not found.');
    const metadata = account.user.app_metadata || {};
    if (metadata.tier !== 'flexible')
      return NextResponse.json(
        { error: 'No flexible plan is active.' },
        { status: 409 },
      );
    const current = activeFlexibleEntitlements(metadata);
    const entitlement = current.find((entry) => entry.toolId === toolId);
    if (!entitlement)
      return NextResponse.json(
        { error: 'This tool is not currently active.' },
        { status: 404 },
      );

    if (entitlement.subscriptionId) {
      const secret = process.env.STRIPE_SECRET_KEY;
      if (!secret)
        return NextResponse.json(
          {
            error:
              'The billing connection is unavailable. No changes were made.',
          },
          { status: 503 },
        );
      const headers = { Authorization: `Bearer ${secret}` };
      const verify = await fetch(
        `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(entitlement.subscriptionId)}`,
        {
          headers,
          cache: 'no-store',
          signal: AbortSignal.timeout(8_000),
        },
      );
      const subscription = await verify.json().catch(() => null);
      if (
        !verify.ok ||
        !subscription ||
        subscription.metadata?.user_id !== user.id ||
        String(
          subscription.metadata?.selectedFlexibleToolId ||
            subscription.metadata?.tool_id ||
            '',
        ) !== toolId
      )
        return NextResponse.json(
          {
            error:
              'The selected tool subscription could not be verified. No changes were made.',
          },
          { status: 503 },
        );
      if (
        !['canceled', 'incomplete_expired'].includes(
          String(subscription.status),
        )
      ) {
        const cancellation = await fetch(
          `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(entitlement.subscriptionId)}`,
          {
            method: 'DELETE',
            headers,
            cache: 'no-store',
            signal: AbortSignal.timeout(10_000),
          },
        );
        const canceled = await cancellation.json().catch(() => null);
        if (
          !cancellation.ok ||
          !canceled ||
          !['canceled', 'incomplete_expired'].includes(String(canceled.status))
        )
          return NextResponse.json(
            {
              error:
                'The billing provider did not confirm cancellation. No access was changed.',
            },
            { status: 503 },
          );
      }
    }

    const remaining = readFlexibleEntitlements(metadata).filter(
      (entry) =>
        entry.toolId !== toolId && Date.parse(entry.expiresAt) > Date.now(),
    );
    const summary = flexibleEntitlementSummary(remaining);
    const tier = summary.tools.length ? 'flexible' : 'free';
    const now = new Date().toISOString();
    const nextMetadata = {
      ...metadata,
      tier,
      tier_expires_at: summary.expiresAt || now,
      tier_expired_at: summary.tools.length ? null : now,
      flexible_entitlements: remaining,
      purchased_tools: summary.tools,
      stripe_subscription_ids: summary.active.flatMap((entry) =>
        entry.subscriptionId ? [entry.subscriptionId] : [],
      ),
      stripe_subscription_id: summary.subscriptionId,
      auto_renew: summary.autoRenew,
      billing_cycle:
        summary.active[0]?.billingCycle || metadata.billing_cycle || 'monthly',
    };
    const { error: updateError } = await admin.auth.admin.updateUserById(
      user.id,
      { app_metadata: nextMetadata },
    );
    if (updateError) throw updateError;
    const { error: profileError } = await admin
      .from('profiles')
      .upsert({ id: user.id, tier, updated_at: now });
    if (profileError) throw profileError;
    const cleanup = await clearExpiredPremiumQuizData(
      admin,
      user.id,
      tier,
      summary.tools,
    );
    return NextResponse.json(
      {
        success: true,
        toolId,
        tier,
        purchasedTools: summary.tools,
        cleanedAssessments: cleanup.quizzes,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error(
      '[api/subscription/flexible-tool/cancel] Failed:',
      error instanceof Error ? error.message : 'unknown',
    );
    return NextResponse.json(
      {
        error:
          'The selected tool could not be canceled completely. Please retry.',
      },
      { status: 503 },
    );
  }
}
