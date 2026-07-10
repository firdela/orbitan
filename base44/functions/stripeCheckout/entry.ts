import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.7.0';

// ── Stripe Plan Lookup Keys ────────────────────────────────────────────────
// Using lookup keys (not hardcoded price IDs) so the same code works in both
// Live and Test mode — Stripe resolves the lookup key to the correct price
// for whichever environment the STRIPE_SECRET_KEY belongs to.
//
// Source of truth: src/lib/orbitan-config.js → SUBSCRIPTION_PLANS
const PLAN_LOOKUP_KEYS = {
  orbitan_starter: 'orbitanos_starter_monthly',
  orbitan_growth: 'orbitanos_growth_monthly',
  orbitan_business: 'orbitanos_business_monthly',
};

const PLAN_NAMES = {
  orbitan_starter: 'OrbitanOS Starter',
  orbitan_growth: 'OrbitanOS Growth',
  orbitan_business: 'OrbitanOS Business',
};

/**
 * Resolves a Stripe Price ID from a lookup key.
 * Works automatically in Live or Test mode based on the active API key.
 */
async function resolvePriceId(stripe, lookupKey) {
  const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  if (!prices.data || prices.data.length === 0) {
    throw new Error(`No Stripe price found for lookup key: ${lookupKey}. Ensure the price exists in your ${stripe._key?.startsWith('sk_test') ? 'Test' : 'Live'} Stripe environment.`);
  }
  return prices.data[0].id;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { plan_key, tenant_id, tenant_name } = body;

    if (!plan_key || !PLAN_LOOKUP_KEYS[plan_key]) {
      return Response.json(
        { error: `Invalid plan_key. Must be one of: ${Object.keys(PLAN_LOOKUP_KEYS).join(', ')}` },
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

    // Resolve the price ID via lookup key — works in both Live and Test mode
    const priceId = await resolvePriceId(stripe, PLAN_LOOKUP_KEYS[plan_key]);

    const origin = req.headers.get('origin') || 'https://app.orbitan.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
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