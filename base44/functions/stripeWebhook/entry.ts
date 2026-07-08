import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.7.0';

/**
 * Stripe Webhook Handler — OrbitanOS
 *
 * Handles Stripe events for subscription lifecycle:
 *   - checkout.session.completed → Activate tenant subscription
 *   - customer.subscription.updated → Plan changes / renewals
 *   - customer.subscription.deleted → Subscription cancellation
 *
 * Uses constructEventAsync (SubtleCrypto) — Deno does not support
 * synchronous signature verification.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeSecret || !webhookSecret) {
      console.error('[stripeWebhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
      return Response.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2024-12-18.acacia',
    });

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );

    // ── checkout.session.completed → Activate subscription ──
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata || {};
      const { plan_key, tenant_id, tenant_name } = metadata;

      console.log(`[stripeWebhook] checkout.session.completed — plan: ${plan_key}, tenant: ${tenant_id}`);

      if (tenant_id && plan_key) {
        // Update tenant subscription
        await base44.asServiceRole.entities.Tenant.update(tenant_id, {
          subscription_plan: plan_key,
          status: 'active',
        });

        // Update wallet subscription plan if wallet exists
        const wallets = await base44.asServiceRole.entities.OrbitanWallet.filter({
          tenant_id,
        });
        if (wallets && wallets.length > 0) {
          await base44.asServiceRole.entities.OrbitanWallet.update(wallets[0].id, {
            subscription_plan: plan_key,
          });
        }

        // Immutable audit trail
        await base44.asServiceRole.entities.AuditLog.create({
          tenant_id,
          actor_id: 'stripe_webhook',
          actor_name: 'Stripe Billing',
          actor_role: 'system',
          action_type: 'SUBSCRIPTION_ACTIVATED',
          module: 'finance',
          target_entity: 'Tenant',
          target_record_id: tenant_id,
          details: `Subscription activated via Stripe Checkout. Plan: ${plan_key}. Session ID: ${session.id}. Customer: ${session.customer || 'N/A'}.`,
          shield_outcome: 'not_evaluated',
        });

        console.log(`[stripeWebhook] Tenant ${tenant_id} upgraded to ${plan_key}`);
      } else {
        console.warn('[stripeWebhook] Missing tenant_id or plan_key in session metadata');
      }
    }

    // ── customer.subscription.updated → Plan changes (upgrade/downgrade) ──
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const { tenant_id, plan_key } = subscription.metadata || {};

      if (tenant_id && plan_key) {
        await base44.asServiceRole.entities.Tenant.update(tenant_id, {
          subscription_plan: plan_key,
        });

        const wallets = await base44.asServiceRole.entities.OrbitanWallet.filter({ tenant_id });
        if (wallets && wallets.length > 0) {
          await base44.asServiceRole.entities.OrbitanWallet.update(wallets[0].id, {
            subscription_plan: plan_key,
          });
        }

        await base44.asServiceRole.entities.AuditLog.create({
          tenant_id,
          actor_id: 'stripe_webhook',
          actor_name: 'Stripe Billing',
          actor_role: 'system',
          action_type: 'SUBSCRIPTION_UPDATED',
          module: 'finance',
          target_entity: 'Tenant',
          target_record_id: tenant_id,
          details: `Subscription updated via Stripe. Plan: ${plan_key}. Subscription ID: ${subscription.id}.`,
          shield_outcome: 'not_evaluated',
        });

        console.log(`[stripeWebhook] Tenant ${tenant_id} subscription updated to ${plan_key}`);
      }
    }

    // ── customer.subscription.deleted → Mark subscription cancelled ──
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const { tenant_id, plan_key } = subscription.metadata || {};

      if (tenant_id) {
        await base44.asServiceRole.entities.Tenant.update(tenant_id, {
          status: 'cancelled',
        });

        await base44.asServiceRole.entities.AuditLog.create({
          tenant_id,
          actor_id: 'stripe_webhook',
          actor_name: 'Stripe Billing',
          actor_role: 'system',
          action_type: 'SUBSCRIPTION_CANCELLED',
          module: 'finance',
          target_entity: 'Tenant',
          target_record_id: tenant_id,
          details: `Subscription cancelled via Stripe. Previous plan: ${plan_key || 'unknown'}. Subscription ID: ${subscription.id}.`,
          shield_outcome: 'not_evaluated',
        });

        console.log(`[stripeWebhook] Tenant ${tenant_id} subscription cancelled`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('[stripeWebhook] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});