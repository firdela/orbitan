import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.7.0';

// ── Stripe Price Map: plan_key → Stripe Price ID ─────────────────────────────
// Starter is free (no Stripe checkout). Enterprise is custom (contact sales).
const PRICE_MAP = {
  orbitan_growth: 'price_1TqdJoDap39FEFGJwNccaO12',
  orbitan_business: 'price_1TqdJoDap39FEFGJDYVJYLDR',
};

const PLAN_NAMES = {
  orbitan_growth: 'OrbitanOS Growth',
  orbitan_business: 'OrbitanOS Business',
};

/**
 * Stripe Checkout — OrbitanOS Subscription Billing
 *
 * Creates a Stripe Checkout Session for subscription plan purchase.
 * Public endpoint (no auth required) — tenant context is passed as parameters.
 *
 * Payload:
 *   - plan_key: 'orbitan_growth' | 'orbitan_business'
 *   - tenant_id: (optional) existing tenant to link subscription to
 *   - tenant_name: (optional) org name for display
 */
Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { plan_key, tenant_id, tenant_name } = body;

    if (!plan_key || !PRICE_MAP[plan_key]) {
      return Response.json(
        { error: `Invalid plan_key. Must be one of: ${Object.keys(PRICE_MAP).join(', ')}` },
        { status: 400 }
      );
    }

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) {
      console.error('[stripeCheckout] STRIPE_SECRET_KEY not set');
      return Response.json({ error: 'Payment system not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2024-12-18.acacia',
    });

    const origin = req.headers.get('origin') || 'https://app.orbitan.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: PRICE_MAP[plan_key], quantity: 1 }],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancelled`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
        plan_key,
        tenant_id: tenant_id || '',
        tenant_name: tenant_name || '',
      },
      subscription_data: {
        metadata: {
          plan_key,
          tenant_id: tenant_id || '',
          tenant_name: tenant_name || '',
        },
      },
      allow_promotion_codes: true,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('[stripeCheckout] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});