import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser, readJsonWithinLimit } from '@/lib/api-auth';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { activeFlexibleEntitlements, FLEXIBLE_FEATURES, PREMIUM_TIERS, readFlexibleTools } from '@/lib/config/premium';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

interface CheckoutBody {
  tier: string;
  billingCycle: 'monthly' | 'yearly';
  selectedFlexibleToolId?: string;
  autoRenew?: boolean;
  price?: number;
  currency?: string;
}

async function addFlexibleToolToActivePlan(
  userId: string,
  toolId: string,
  billingCycle: 'monthly' | 'yearly',
  stripeKey: string,
) {
  const admin = getSupabaseAdmin();
  const { data: account, error: accountError } = await admin.auth.admin.getUserById(userId);
  if (accountError || !account.user) throw new Error('Could not verify the current plan.');
  const metadata = account.user.app_metadata || {};
  const subscriptionId = String(metadata.stripe_subscription_id || '');
  const currentTools = readFlexibleTools(metadata);
  if (String(metadata.tier || '') !== 'flexible' || !subscriptionId || !currentTools.length)
    throw new Error('The current flexible plan could not be verified.');
  if (currentTools.includes(toolId)) throw new Error('This tool is already included in your plan.');
  if (Date.parse(String(metadata.tier_expires_at || '')) <= Date.now())
    throw new Error('The current plan has expired. Refresh your plan status and try again.');

  const headers = { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' };
  const subscriptionResponse = await fetch(
    `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=items.data.price.product`,
    { headers: { Authorization: `Bearer ${stripeKey}` }, cache: 'no-store', signal: AbortSignal.timeout(8_000) },
  );
  const subscription = await subscriptionResponse.json().catch(() => null);
  if (!subscriptionResponse.ok || !subscription)
    throw new Error('Could not verify the current billing status. Try again shortly.');
  if (
    subscription.metadata?.user_id !== userId ||
    subscription.metadata?.tier !== 'flexible' ||
    !['active', 'trialing'].includes(String(subscription.status)) ||
    subscription.cancel_at_period_end === true ||
    !Number.isFinite(Number(subscription.current_period_end)) ||
    Number(subscription.current_period_end) * 1000 <= Date.now()
  ) throw new Error('The current plan is not active for additional tools.');

  const subscriptionTools = readFlexibleTools(subscription.metadata);
  const attachedTools = Array.from(new Set((subscription.items?.data || [])
    .map((item: any) => String(item?.price?.product?.metadata?.tool_id || ''))
    .filter((value: string) => FLEXIBLE_FEATURES.some((feature) => feature.id === value))));
  if (subscriptionTools.includes(toolId) || attachedTools.includes(toolId)) {
    const syncedTools = Array.from(new Set([...currentTools, ...subscriptionTools, ...attachedTools]));
    if (!subscriptionTools.includes(toolId)) {
      const syncStripeMetadata = await fetch(
        `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
        {
          method: 'POST', headers,
          body: new URLSearchParams({
            'metadata[flexibleTools]': JSON.stringify(syncedTools),
            'metadata[selectedFlexibleToolId]': toolId,
          }).toString(),
          signal: AbortSignal.timeout(8_000),
        },
      );
      if (!syncStripeMetadata.ok) throw new Error('The paid tool is still syncing with your plan. Refresh shortly.');
    }
    const { error } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...metadata,
        tier: 'flexible',
        tier_expires_at: new Date(Number(subscription.current_period_end) * 1000).toISOString(),
        purchased_tools: syncedTools,
        stripe_subscription_id: subscriptionId,
      },
    });
    if (error) throw new Error('The tool payment is confirmed, but access is still syncing. Refresh shortly.');
    return {
      success: true,
      updated: true,
      tier: 'flexible',
      purchasedTools: syncedTools,
      tierExpiresAt: new Date(Number(subscription.current_period_end) * 1000).toISOString(),
    };
  }

  const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;
  const expectedInterval = billingCycle === 'yearly' ? 'year' : 'month';
  if (interval !== expectedInterval)
    throw new Error(`Additional tools must use the current ${interval === 'year' ? 'yearly' : 'monthly'} billing cycle.`);
  const currency = String(subscription.items?.data?.[0]?.price?.currency || '').toLowerCase();
  if (!/^[a-z]{3}$/.test(currency)) throw new Error('The current plan currency could not be verified.');

  const feature = FLEXIBLE_FEATURES.find((item) => item.id === toolId);
  if (!feature) throw new Error('Choose a valid tool plan.');
  const addOnKey = `flex-addon-${subscriptionId}-${toolId}`;
  const productResponse = await fetch('https://api.stripe.com/v1/products', {
    method: 'POST', headers: { ...headers, 'Idempotency-Key': `${addOnKey}-product` },
    body: new URLSearchParams({
      name: `Ping World ${feature.label}`,
      description: `Additional flexible plan access: ${feature.label}.`,
      'metadata[user_id]': userId,
      'metadata[tool_id]': toolId,
    }).toString(),
    signal: AbortSignal.timeout(8_000),
  });
  const product = await productResponse.json().catch(() => null);
  if (!productResponse.ok || !product?.id)
    throw new Error(product?.error?.message || 'Could not prepare the selected tool for billing.');

  const priceResponse = await fetch('https://api.stripe.com/v1/prices', {
    method: 'POST', headers: { ...headers, 'Idempotency-Key': `${addOnKey}-price` },
    body: new URLSearchParams({
      product: String(product.id),
      currency,
      unit_amount: String(Math.round(feature[billingCycle] * 100)),
      'recurring[interval]': expectedInterval,
      'metadata[tool_id]': toolId,
    }).toString(),
    signal: AbortSignal.timeout(8_000),
  });
  const price = await priceResponse.json().catch(() => null);
  if (!priceResponse.ok || !price?.id)
    throw new Error(price?.error?.message || 'Could not prepare the selected tool price.');

  const itemResponse = await fetch('https://api.stripe.com/v1/subscription_items', {
    method: 'POST', headers: { ...headers, 'Idempotency-Key': addOnKey },
    body: new URLSearchParams({
      subscription: subscriptionId,
      price: String(price.id),
      proration_behavior: 'always_invoice',
      payment_behavior: 'error_if_incomplete',
    }).toString(),
    signal: AbortSignal.timeout(12_000),
  });
  const item = await itemResponse.json().catch(() => null);
  if (!itemResponse.ok || !item?.id)
    throw new Error(item?.error?.message || 'Payment for the additional tool could not be confirmed.');

  const nextTools = Array.from(new Set([...currentTools, ...subscriptionTools, ...attachedTools, toolId]));
  const metadataUpdate = await fetch(
    `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: 'POST', headers,
      body: new URLSearchParams({
        'metadata[flexibleTools]': JSON.stringify(nextTools),
        'metadata[selectedFlexibleToolId]': toolId,
        'metadata[user_id]': userId,
        'metadata[tier]': 'flexible',
      }).toString(),
      signal: AbortSignal.timeout(8_000),
    },
  );
  const updatedSubscription = await metadataUpdate.json().catch(() => null);
  if (!metadataUpdate.ok || !updatedSubscription) {
    await fetch(`https://api.stripe.com/v1/subscription_items/${encodeURIComponent(String(item.id))}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${stripeKey}` },
      body: new URLSearchParams({ proration_behavior: 'none' }).toString(),
      signal: AbortSignal.timeout(8_000),
    }).catch(() => null);
    throw new Error(updatedSubscription?.error?.message || 'The new tool could not be attached to the current plan.');
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...metadata,
      tier: 'flexible',
      tier_expires_at: new Date(Number(updatedSubscription.current_period_end) * 1000).toISOString(),
      purchased_tools: nextTools,
      stripe_subscription_id: subscriptionId,
      auto_renew: !updatedSubscription.cancel_at_period_end,
      billing_cycle: billingCycle,
    },
  });
  if (updateError) throw new Error('The payment was accepted, but tool access is still syncing. Refresh shortly.');
  return {
    success: true,
    updated: true,
    tier: 'flexible',
    purchasedTools: nextTools,
    tierExpiresAt: new Date(Number(updatedSubscription.current_period_end) * 1000).toISOString(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip, 'api:checkout', 5, 60_000).limited) {
      return NextResponse.json(
        { success: false, error: 'Too many requests.' },
        { status: 429 },
      );
    }
    const requestUser = await getRequestUser(req);
    if (
      !requestUser ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        requestUser.id,
      )
    ) {
      return NextResponse.json(
        { success: false, error: 'Sign in to start checkout.' },
        { status: 401 },
      );
    }
    if (!requestUser.email_confirmed_at) {
      return NextResponse.json(
        {
          success: false,
          error: 'Verify your email before starting a subscription.',
        },
        { status: 403 },
      );
    }
    if (
      isRateLimited(requestUser.id, 'api:checkout-account', 5, 60_000).limited
    ) {
      return NextResponse.json(
        { success: false, error: 'Checkout request limit reached.' },
        { status: 429 },
      );
    }
    const body = (await readJsonWithinLimit(req, 8 * 1024)) as CheckoutBody;
    const { tier, billingCycle, selectedFlexibleToolId, currency = 'USD', autoRenew = true } = body;
    if (
      !['flexible', 'standard', 'pro'].includes(tier) ||
      !['monthly', 'yearly'].includes(billingCycle) || typeof autoRenew !== 'boolean'
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan selection.' },
        { status: 400 },
      );
    }
    const currentMetadata = requestUser.app_metadata || {};
    const currentTier = String(currentMetadata.tier || 'free');
    const currentExpiry = Date.parse(String(currentMetadata.tier_expires_at || ''));
    const activeFlexible = currentTier === 'flexible' ? activeFlexibleEntitlements(currentMetadata) : [];
    const currentPlanActive = currentTier === 'flexible'
      ? activeFlexible.length > 0
      : ['standard', 'pro'].includes(currentTier) && Number.isFinite(currentExpiry) && currentExpiry > Date.now();
    const addingFlexibleTool = currentPlanActive && currentTier === 'flexible' && tier === 'flexible';
    if (currentPlanActive && !addingFlexibleTool)
      return NextResponse.json(
        { success: false, error: 'Cancel your current plan before selecting another plan.' },
        { status: 409 },
      );
    const checkoutToolId = tier === 'flexible' ? selectedFlexibleToolId as string : '';
    let amount =
      PREMIUM_TIERS[tier as keyof typeof PREMIUM_TIERS].price[billingCycle];
    if (tier === 'flexible') {
      if (typeof selectedFlexibleToolId !== 'string' || !selectedFlexibleToolId.trim()) {
        return NextResponse.json({ success: false, error: 'Choose one tool for the flexible plan.' }, { status: 400 });
      }
      const feature = FLEXIBLE_FEATURES.find(
        (item) => item.id === selectedFlexibleToolId,
      );
      if (!feature)
        return NextResponse.json(
          { success: false, error: 'Choose a valid tool plan.' },
          { status: 400 },
        );
      amount = feature[billingCycle];
      if (addingFlexibleTool && activeFlexible.some((entry) => entry.toolId === selectedFlexibleToolId))
        return NextResponse.json(
          { success: false, error: 'This tool is already included in your current plan.' },
          { status: 409 },
        );
    }
    if (!amount || !/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json(
        { success: false, error: 'Invalid checkout currency or plan.' },
        { status: 400 },
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({
        success: true, sandbox: true, url: null, tier,
        selectedFlexibleToolId: tier === 'flexible' ? selectedFlexibleToolId : null,
        autoRenew,
        message: 'Sandbox checkout is enabled for testing.',
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (stripeSecretKey) {
      // Live Stripe Checkout Session Creation via direct HTTP API
      const safeOrigin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
      const params = new URLSearchParams();
      params.append('payment_method_types[]', 'card');
      params.append('mode', 'subscription');
      params.append(
        'success_url',
        `${safeOrigin}/pricing?checkout_success=true&tier=${encodeURIComponent(tier)}`,
      );
      params.append(
        'cancel_url',
        `${safeOrigin}/pricing?checkout_canceled=true`,
      );
      params.append('client_reference_id', requestUser.id);
      params.append(
        'line_items[0][price_data][currency]',
        currency.toLowerCase(),
      );
      params.append(
        'line_items[0][price_data][product_data][name]',
        `Ping World ${tier.toUpperCase()} Plan (${tier === 'flexible' ? selectedFlexibleToolId : 'All Tools'})`,
      );
      params.append(
        'line_items[0][price_data][product_data][description]',
        `${billingCycle.toUpperCase()} subscription to Ping World tools.`,
      );
      params.append(
        'line_items[0][price_data][unit_amount]',
        String(Math.round(amount * 100)),
      );
      params.append(
        'line_items[0][price_data][recurring][interval]',
        billingCycle === 'yearly' ? 'year' : 'month',
      );
      params.append('line_items[0][quantity]', '1');
      params.append('metadata[tier]', tier);
      params.append('metadata[selectedFlexibleToolId]', checkoutToolId);
      params.append('metadata[billingCycle]', billingCycle);
      params.append('metadata[user_id]', requestUser.id);
      params.append('subscription_data[metadata][user_id]', requestUser.id);
      params.append('subscription_data[metadata][tier]', tier);
      params.append(
        'subscription_data[metadata][selectedFlexibleToolId]',
        checkoutToolId,
      );
      params.append(
        'subscription_data[metadata][flexibleTools]',
        tier === 'flexible' ? JSON.stringify([checkoutToolId]) : '[]',
      );
      params.append('subscription_data[metadata][billingCycle]', billingCycle);
      params.append('metadata[autoRenew]', String(autoRenew));
      params.append('subscription_data[metadata][autoRenew]', String(autoRenew));
      if (!autoRenew) params.append('subscription_data[cancel_at_period_end]', 'true');

      const stripeRes = await fetch(
        'https://api.stripe.com/v1/checkout/sessions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        },
      );

      const session = await stripeRes.json().catch(() => null);

      if (!stripeRes.ok) {
        throw new Error(
          session?.error?.message ||
            'Failed to initialize Stripe checkout session.',
        );
      }

      return NextResponse.json({ success: true, url: session.url });
    }

    return NextResponse.json({ success: false, error: 'Payment gateway is unavailable.' }, { status: 503 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'PAYLOAD_TOO_LARGE') {
      return NextResponse.json(
        { success: false, error: 'Request is too large.' },
        { status: 413 },
      );
    }
    console.error('[/api/checkout/session] Request failed:', err);
    const message =
      process.env.NODE_ENV !== 'production' && err instanceof Error
        ? err.message
        : 'Failed to initialize payment gateway.';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
