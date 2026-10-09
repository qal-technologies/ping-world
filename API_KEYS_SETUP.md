# External API keys and payment setup

This repository reads the following server-side environment variables:

| Variable | Used for | Required when |
| --- | --- | --- |
| `GEMINI_API_KEY` | Gemini requests from `/api/ai` and the composer | Gemini AI features are enabled |
| `RESEND_API_KEY` | Transactional email | Email sending is enabled |
| `RESEND_FROM_EMAIL` | Verified sender address used by Resend | Email sending is enabled |
| `STRIPE_SECRET_KEY` | Creating hosted Checkout subscriptions | Live Stripe billing is enabled |
| `STRIPE_WEBHOOK_SECRET` | Verifying Stripe webhook signatures | Live Stripe billing is enabled |

Put development values in `.env.local` at the project root. Add production values
to the deployment platform's encrypted environment-variable settings, then
redeploy. Never prefix these secrets with `NEXT_PUBLIC_`, commit them, or send
them to browser code. Keep separate development/test and production values.

## Gemini

1. Sign in to [Google AI Studio](https://aistudio.google.com/).
2. Open **API keys**. If the project is not listed, import the Google Cloud
   project first; otherwise create a project and generate a key.
3. Create a current authorization key and keep it server-side. The Gemini API
   documentation says new AI Studio keys default to authorization keys and that
   standard keys are being rejected starting September 2026.
4. Set `GEMINI_API_KEY` in `.env.local` and the production secret store. Check
   AI Studio usage and configure billing/quotas as appropriate.

Google's [Gemini API key guide](https://ai.google.dev/gemini-api/docs/api-key)
has the current key types, restrictions, and rotation steps.

## Resend

1. Create an account at [Resend](https://resend.com/).
2. Add a sending domain in the Resend dashboard and publish its requested DNS
   records (including SPF and DKIM). Wait for the domain to verify.
3. Under **API Keys**, create a key with **Sending access**, restricted to the
   verified sending domain where possible.
4. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (for example,
   `PingWorld <hello@example.com>`) in `.env.local` and production. The From
   address must use the verified domain.

Resend documents [scoped API key permissions](https://resend.com/changelog/new-api-key-permissions)
and [domain setup](https://resend.com/docs/dashboard/domains/introduction).

## Stripe

1. Create a Stripe account in the legal business country where PingWorld is
   established. Complete Stripe's business profile and identity verification,
   provide the requested beneficial-owner/director details, and connect an
   eligible payout bank account. Exact requirements depend on country and
   business structure; Stripe displays the required verification items in the
   Dashboard.
2. Use **test mode** while integrating. Copy the test secret key into
   `STRIPE_SECRET_KEY`. The app creates subscription prices dynamically from its
   server-side plan catalog; never accept a price or tier entitlement from the
   browser as authoritative.
3. Register a webhook endpoint at
   `https://<your-host>/api/stripe/webhook`. Subscribe to
   `checkout.session.completed`, `customer.subscription.updated`, and
   `customer.subscription.deleted`. Copy that endpoint's signing secret to
   `STRIPE_WEBHOOK_SECRET` (for local testing, use Stripe CLI's forwarded
   endpoint secret).
4. Run test subscriptions through checkout, verify webhook deliveries and
   renewal/cancellation behavior, and confirm the app updates the authenticated
   account's server-owned `app_metadata` only after verified Stripe events.
5. Before launch, finish account verification, switch to live keys, create a
   live webhook endpoint and secret, configure allowed redirect URLs, publish
   clear pricing/cancellation/refund terms and contact details, and verify the
   account can receive payouts. Rotate any key that was exposed.

The app currently falls back to its sandbox checkout when no Stripe secret is
configured. Sandbox checkout is intentionally enabled for testing; restore the
environment guard in `src/app/api/checkout/sandbox/route.ts` before relying on
that endpoint for a public production launch.

### Is Stripe a good fit for a Nigerian startup?

Stripe's current global availability page lists Nigeria under **Extended
network**, rather than the main supported-country list. Confirm that your
specific Nigerian business can onboard, accept the currencies/payment methods
you need, and receive payouts under the current extended-network terms before
building your launch around it. Stripe Atlas is a separate option for founders
who intentionally establish a US company, but adds incorporation, banking,
tax, compliance, and ongoing operating costs.

Stripe offers a strong hosted checkout, subscription lifecycle, webhook, and
fraud tooling, which suits this app's recurring tiers. Its fees are not one
universal number: Stripe's US page currently lists 2.9% + $0.30 for a successful
domestic online card payment, with additional international-card and currency
conversion fees; Stripe Billing pay-as-you-go lists 0.7% of Billing volume.
Rates vary by merchant country, so compare the final local quote and payout
arrangements with Nigerian providers such as Paystack or Flutterwave before
choosing. For this app, Stripe is a good technical fit, but its Nigeria
onboarding/payout path needs to be confirmed first.

See [Stripe global availability](https://stripe.com/global),
[Stripe pricing](https://stripe.com/pricing),
[Stripe account requirements](https://docs.stripe.com/get-started/account/activate),
and [webhook signature verification](https://docs.stripe.com/webhooks/signature).

No need to mention or api or tools names to the user 
things like stripe and the tools we used isnt professional and might make users find walkaround for that tool because they know it.

If stripe is not configured or unreachable default to clearing, this is to avoid users using more of time, and if stripe comes back, it'll enventually reupdate the tier so we are still safer clearing it and later when stripe is back it updates the correct tier. or the new check is done.

