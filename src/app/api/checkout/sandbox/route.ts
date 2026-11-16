import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { activeFlexibleEntitlements, FLEXIBLE_FEATURES, flexibleEntitlementSummary, readFlexibleEntitlements } from '@/lib/config/premium';
import { clearExpiredPremiumQuizData } from '@/lib/quiz/clear-expired-premium-data';

export async function POST(request: NextRequest) {
  // Block sandbox upgrades in production or when live Stripe billing is configured.
  // This prevents any authenticated user from granting themselves a free pro tier
  // by calling this endpoint in a live environment.
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.STRIPE_SECRET_KEY
  ) {
    return NextResponse.json(
      {
        error:
          'Sandbox tier changes are available only in local development without live billing.',
      },
      { status: 404 },
    );
  }
  const limited = isRateLimited(
    getClientIp(request),
    'api:sandbox-tier',
    5,
    60_000,
  );
  if (limited.limited)
    return NextResponse.json(
      { error: 'Too many sandbox tier changes.' },
      { status: 429 },
    );
  const user = await getRequestUser(request);
  if (!user?.email_confirmed_at)
    return NextResponse.json(
      { error: 'A verified account is required.' },
      { status: 401 },
    );
  try {
    const body = (await request.json()) as {
      tier?: unknown;
      selectedFlexibleToolId?: unknown;
      billingCycle?: unknown;
      autoRenew?: unknown;
    };
    const tier = body.tier === 'free' ? 'free' : String(body.tier || '');
    if (!['free', 'flexible', 'standard', 'pro'].includes(tier))
      return NextResponse.json(
        { error: 'Invalid sandbox tier.' },
        { status: 400 },
      );
    const selectedTool =
      typeof body.selectedFlexibleToolId === 'string' ?
        body.selectedFlexibleToolId
      : '';
    if (
      tier === 'flexible' &&
      (!selectedTool || !FLEXIBLE_FEATURES.some((tool) => tool.id === selectedTool))
    ) {
      return NextResponse.json(
        { error: 'Choose a valid tool plan.' },
        { status: 400 },
      );
    }
    const admin = getSupabaseAdmin();
    const { data: account, error: accountError } =
      await admin.auth.admin.getUserById(user.id);
    if (accountError || !account.user)
      throw accountError || new Error('Account not found.');
    const existingMetadata = account.user.app_metadata || {};
    const existingTier = String(existingMetadata.tier || 'free');
    const existingExpiry = Date.parse(String(existingMetadata.tier_expires_at || ''));
    const activeFlexible = existingTier === 'flexible' ? activeFlexibleEntitlements(existingMetadata) : [];
    const currentPlanActive = existingTier === 'flexible' ? activeFlexible.length > 0
      : ['standard', 'pro'].includes(existingTier) && Number.isFinite(existingExpiry) && existingExpiry > Date.now();
    if (tier === 'free' && currentPlanActive)
      return NextResponse.json({ error: 'Use the plan cancellation action to remove current entitlements.' }, { status: 409 });
    if (currentPlanActive && !(existingTier === 'flexible' && tier === 'flexible'))
      return NextResponse.json({ error: 'Cancel your current plan before selecting another plan.' }, { status: 409 });
    if (tier === 'flexible' && activeFlexible.some((entry) => entry.toolId === selectedTool))
      return NextResponse.json({ error: 'This tool is already included in your current plan.' }, { status: 409 });
    const billingCycle = body.billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const autoRenew = body.autoRenew !== false;
    const proposedExpiry = tier === 'free' ? new Date().toISOString() : (() => {
      const date = new Date();
      const day = date.getDate();
      date.setDate(1);
      if (billingCycle === 'yearly') date.setFullYear(date.getFullYear() + 1);
      else date.setMonth(date.getMonth() + 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      date.setDate(Math.min(day, lastDay));
      return date.toISOString();
    })();
    const newEntitlement = tier === 'flexible' ? {
      toolId: selectedTool,
      subscriptionId: null,
      startsAt: new Date().toISOString(),
      expiresAt: proposedExpiry,
      billingCycle,
      autoRenew,
    } as const : null;
    const entitlements = tier === 'flexible'
      ? [...readFlexibleEntitlements(existingMetadata).filter((entry) =>
          entry.toolId !== selectedTool && Date.parse(entry.expiresAt) > Date.now()), newEntitlement!]
      : [];
    const summary = flexibleEntitlementSummary(entitlements);
    const purchasedTools = tier === 'free' ? [] : tier === 'flexible' ? summary.tools : ['all'];
    const expiry = tier === 'flexible' ? summary.expiresAt || proposedExpiry : proposedExpiry;
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...account.user.app_metadata,
        tier: tier === 'flexible' && purchasedTools.length === 0 ? 'free' : tier,
        tier_expires_at: expiry,
        tier_expired_at: null,
        flexible_entitlements: entitlements,
        tier_started_at: tier === 'flexible' ? new Date().toISOString() : new Date().toISOString(),
        auto_renew: tier === 'flexible' ? summary.autoRenew : autoRenew,
        billing_cycle: tier === 'flexible' ? (summary.active[0]?.billingCycle || billingCycle) : billingCycle,
        stripe_subscription_id: null,
        purchased_tools: purchasedTools,
      },
    });
    if (error) throw error;
    await admin
      .from('profiles')
      .upsert({ id: user.id, tier: tier === 'flexible' && purchasedTools.length === 0 ? 'free' : tier, updated_at: new Date().toISOString() });
    if (tier === 'free') await clearExpiredPremiumQuizData(admin, user.id, 'free', []);
    return NextResponse.json(
      { success: true, tier: tier === 'flexible' && purchasedTools.length === 0 ? 'free' : tier, tierExpiresAt: expiry, purchasedTools },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    console.error('[api/checkout/sandbox] Tier update failed.');
    return NextResponse.json(
      { error: 'Could not update the sandbox plan.' },
      { status: 503 },
    );
  }
}
