import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser, readJsonWithinLimit } from '@/lib/api-auth';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { FLEXIBLE_FEATURES, PREMIUM_TIERS } from '@/lib/config/premium';

interface CheckoutBody {
  tier: string;
  billingCycle: 'monthly' | 'yearly';
  selectedFlexibleToolId?: string;
  price?: number;
  currency?: string;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip, 'api:checkout', 5, 60_000).limited) {
      return NextResponse.json({ success: false, error: 'Too many requests.' }, { status: 429 });
    }
    const requestUser = await getRequestUser(req);
    if (!requestUser) {
      return NextResponse.json({ success: false, error: 'Sign in to start checkout.' }, { status: 401 });
    }
    if (!requestUser.email_confirmed_at) {
      return NextResponse.json({ success: false, error: 'Verify your email before starting a subscription.' }, { status: 403 });
    }
    if (isRateLimited(requestUser.id, 'api:checkout-account', 5, 60_000).limited) {
      return NextResponse.json({ success: false, error: 'Checkout request limit reached.' }, { status: 429 });
    }
    const body = await readJsonWithinLimit(req, 8 * 1024) as CheckoutBody;
    const { tier, billingCycle, selectedFlexibleToolId = 'all', currency = 'USD' } = body;
    if (!['flexible', 'standard', 'pro'].includes(tier) || !['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json({ success: false, error: 'Invalid plan selection.' }, { status: 400 });
    }
    let amount = PREMIUM_TIERS[tier as keyof typeof PREMIUM_TIERS].price[billingCycle];
    if (tier === 'flexible') {
      const feature = FLEXIBLE_FEATURES.find((item) => item.id === selectedFlexibleToolId);
      if (!feature) return NextResponse.json({ success: false, error: 'Choose a valid tool plan.' }, { status: 400 });
      amount = feature[billingCycle];
    }
    if (!amount || !/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json({ success: false, error: 'Invalid checkout currency or plan.' }, { status: 400 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (stripeSecretKey) {
      // Live Stripe Checkout Session Creation via direct HTTP API
      const params = new URLSearchParams();
      params.append('payment_method_types[]', 'card');
      params.append('mode', 'subscription');
      params.append('success_url', `${req.nextUrl.origin}/pricing?checkout_success=true&tier=${tier}`);
      params.append('cancel_url', `${req.nextUrl.origin}/pricing?checkout_canceled=true`);
      params.append('client_reference_id', requestUser.id);
      params.append('line_items[0][price_data][currency]', currency.toLowerCase());
      params.append('line_items[0][price_data][product_data][name]', `Ping World ${tier.toUpperCase()} Plan (${selectedFlexibleToolId !== 'all' ? selectedFlexibleToolId : 'All Tools'})`);
      params.append('line_items[0][price_data][product_data][description]', `${billingCycle.toUpperCase()} subscription to Ping World tools.`);
      params.append('line_items[0][price_data][unit_amount]', String(Math.round(amount * 100)));
      params.append('line_items[0][price_data][recurring][interval]', billingCycle === 'yearly' ? 'year' : 'month');
      params.append('line_items[0][quantity]', '1');
      params.append('metadata[tier]', tier);
      params.append('metadata[selectedFlexibleToolId]', selectedFlexibleToolId);
      params.append('metadata[billingCycle]', billingCycle);
      params.append('metadata[user_id]', requestUser.id);
      params.append('subscription_data[metadata][user_id]', requestUser.id);
      params.append('subscription_data[metadata][tier]', tier);
      params.append('subscription_data[metadata][selectedFlexibleToolId]', selectedFlexibleToolId);
      params.append('subscription_data[metadata][billingCycle]', billingCycle);

      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const session = await stripeRes.json();

      if (!stripeRes.ok) {
        throw new Error(session.error?.message || 'Failed to initialize Stripe checkout session.');
      }

      return NextResponse.json({ success: true, url: session.url });
    }

    // Sandbox Simulated Fallback (No live Stripe key set)
    return NextResponse.json({
      success: true,
      sandbox: true,
      url: null,
      message: 'Simulated Sandbox Checkout mode. Provide STRIPE_SECRET_KEY in environment variables for live billing.',
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'PAYLOAD_TOO_LARGE') {
      return NextResponse.json({ success: false, error: 'Request is too large.' }, { status: 413 });
    }
    console.error('[/api/checkout/session] Request failed.');
    return NextResponse.json(
      { success: false, error: 'Failed to initialize payment gateway.' },
      { status: 500 }
    );
  }
}
