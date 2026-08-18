import { NextRequest, NextResponse } from 'next/server';

interface CheckoutBody {
  tier: string;
  billingCycle: 'monthly' | 'yearly';
  selectedFlexibleToolId?: string;
  price?: number;
  currency?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: CheckoutBody = await req.json();
    const { tier, billingCycle, selectedFlexibleToolId = 'all', price, currency = 'USD' } = body;

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (stripeSecretKey) {
      // Live Stripe Checkout Session Creation via direct HTTP API
      const params = new URLSearchParams();
      params.append('payment_method_types[]', 'card');
      params.append('mode', 'subscription');
      params.append('success_url', `${req.nextUrl.origin}/pricing?checkout_success=true&tier=${tier}`);
      params.append('cancel_url', `${req.nextUrl.origin}/pricing?checkout_canceled=true`);
      params.append('line_items[0][price_data][currency]', currency.toLowerCase());
      params.append('line_items[0][price_data][product_data][name]', `Ping World ${tier.toUpperCase()} Plan (${selectedFlexibleToolId !== 'all' ? selectedFlexibleToolId : 'All Tools'})`);
      params.append('line_items[0][price_data][product_data][description]', `${billingCycle.toUpperCase()} subscription to Ping World tools.`);
      params.append('line_items[0][price_data][unit_amount]', String(Math.round((price || 9.99) * 100)));
      params.append('line_items[0][price_data][recurring][interval]', billingCycle === 'yearly' ? 'year' : 'month');
      params.append('line_items[0][quantity]', '1');
      params.append('metadata[tier]', tier);
      params.append('metadata[selectedFlexibleToolId]', selectedFlexibleToolId);
      params.append('metadata[billingCycle]', billingCycle);

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
  } catch (err: any) {
    console.error('[/api/checkout/session] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to initialize payment gateway.' },
      { status: 500 }
    );
  }
}
