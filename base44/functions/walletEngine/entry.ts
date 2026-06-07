// ============================================================
// ORBITAN WALLET ENGINE — Backend Function
// Handles: credit debit, points allocation, wallet reads,
// usage tracking, and reward tier computation.
// Called by: AI modules, marketplace, subscription gating.
// EXIT-READY: Pure Deno, zero external deps.
// ============================================================

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Reward tier thresholds (lifetime points)
const REWARD_TIERS = [
  { tier: 'orbitan_elite', min: 50000 },
  { tier: 'platinum',      min: 20000 },
  { tier: 'gold',          min: 5000  },
  { tier: 'silver',        min: 1000  },
  { tier: 'bronze',        min: 0     },
];

// Monthly credit quotas per subscription plan
const PLAN_QUOTAS = {
  orbitan_free:       50,
  orbitan_starter:    150,
  orbitan_growth:     500,
  orbitan_business:   2000,
  orbitan_enterprise: 10000,
};

// Points earned per event type
const POINTS_RULES = {
  referral:          500,
  training_complete: 100,
  renewal_monthly:   200,
  renewal_annual:    2500,
  review_submitted:  150,
  sop_approved:      75,
  compliance_passed: 50,
};

function computeRewardTier(lifetimePoints) {
  for (const { tier, min } of REWARD_TIERS) {
    if (lifetimePoints >= min) return tier;
  }
  return 'bronze';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, tenant_id, amount, currency, reason, reference_id, reference_type, metadata } = body;

    const targetTenantId = tenant_id || user.data?.tenant_id;

    if (!targetTenantId) {
      return Response.json({ error: 'tenant_id required' }, { status: 400 });
    }

    // Only admin or tenant_admin can operate on wallet
    const isAdmin = user.role === 'admin';
    const isTenantAdmin = user.data?.role === 'tenant_admin' && user.data?.tenant_id === targetTenantId;
    if (!isAdmin && !isTenantAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- GET WALLET ---
    if (action === 'get_wallet') {
      const wallets = await base44.asServiceRole.entities.OrbitanWallet.filter({ tenant_id: targetTenantId });
      if (!wallets || wallets.length === 0) {
        return Response.json({ wallet: null, message: 'No wallet found for tenant' });
      }
      const wallet = wallets[0];
      const quota = PLAN_QUOTAS[wallet.subscription_plan] || 150;
      const usage_pct = quota > 0 ? Math.round((wallet.credits_used_this_month / quota) * 100) : 0;
      return Response.json({ wallet, usage_pct, quota });
    }

    // --- GET TRANSACTIONS ---
    if (action === 'get_transactions') {
      const transactions = await base44.asServiceRole.entities.WalletTransaction.filter(
        { tenant_id: targetTenantId },
        '-created_date',
        50
      );
      return Response.json({ transactions });
    }

    // --- DEBIT CREDITS ---
    if (action === 'debit_credits') {
      if (!amount || amount <= 0) return Response.json({ error: 'Invalid amount' }, { status: 400 });

      const wallets = await base44.asServiceRole.entities.OrbitanWallet.filter({ tenant_id: targetTenantId });
      if (!wallets || wallets.length === 0) return Response.json({ error: 'Wallet not found' }, { status: 404 });

      const wallet = wallets[0];
      if (wallet.balance_credits < amount) {
        return Response.json({ error: 'Insufficient credits', balance: wallet.balance_credits }, { status: 402 });
      }

      const newBalance = wallet.balance_credits - amount;
      const newUsed = (wallet.credits_used_this_month || 0) + amount;
      const newAICalls = reason?.includes('ai') ? (wallet.ai_calls_this_month || 0) + 1 : wallet.ai_calls_this_month;
      const newAILifetime = reason?.includes('ai') ? (wallet.ai_calls_lifetime || 0) + 1 : wallet.ai_calls_lifetime;

      await base44.asServiceRole.entities.OrbitanWallet.update(wallet.id, {
        balance_credits: newBalance,
        credits_used_this_month: newUsed,
        ai_calls_this_month: newAICalls,
        ai_calls_lifetime: newAILifetime,
      });

      // Log transaction
      await base44.asServiceRole.entities.WalletTransaction.create({
        tenant_id: targetTenantId,
        wallet_id: wallet.id,
        transaction_type: reason || 'credit_debit_ai',
        amount: -amount,
        currency: 'credits',
        balance_after: newBalance,
        description: `Credit debit: ${reason || 'AI usage'}`,
        reference_id,
        reference_type,
        triggered_by: user.id,
        triggered_by_name: user.full_name,
        status: 'completed',
        metadata,
      });

      return Response.json({ success: true, balance_after: newBalance, debited: amount });
    }

    // --- TOPUP CREDITS ---
    if (action === 'topup_credits') {
      if (!isAdmin) return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
      if (!amount || amount <= 0) return Response.json({ error: 'Invalid amount' }, { status: 400 });

      const wallets = await base44.asServiceRole.entities.OrbitanWallet.filter({ tenant_id: targetTenantId });
      if (!wallets || wallets.length === 0) return Response.json({ error: 'Wallet not found' }, { status: 404 });

      const wallet = wallets[0];
      const newBalance = wallet.balance_credits + amount;

      await base44.asServiceRole.entities.OrbitanWallet.update(wallet.id, {
        balance_credits: newBalance,
        last_credit_topup_date: new Date().toISOString(),
        last_credit_topup_amount: amount,
      });

      await base44.asServiceRole.entities.WalletTransaction.create({
        tenant_id: targetTenantId,
        wallet_id: wallet.id,
        transaction_type: 'credit_topup',
        amount,
        currency: 'credits',
        balance_after: newBalance,
        description: `Credit top-up: ${amount} credits`,
        reference_id,
        triggered_by: user.id,
        triggered_by_name: user.full_name,
        status: 'completed',
      });

      return Response.json({ success: true, balance_after: newBalance, topped_up: amount });
    }

    // --- EARN POINTS ---
    if (action === 'earn_points') {
      const pointEvent = reason || 'training_complete';
      const pointsToAdd = POINTS_RULES[pointEvent] || 50;

      const wallets = await base44.asServiceRole.entities.OrbitanWallet.filter({ tenant_id: targetTenantId });
      if (!wallets || wallets.length === 0) return Response.json({ error: 'Wallet not found' }, { status: 404 });

      const wallet = wallets[0];
      const newPoints = (wallet.loyalty_points || 0) + pointsToAdd;
      const newLifetime = (wallet.lifetime_points_earned || 0) + pointsToAdd;
      const newTier = computeRewardTier(newLifetime);

      await base44.asServiceRole.entities.OrbitanWallet.update(wallet.id, {
        loyalty_points: newPoints,
        lifetime_points_earned: newLifetime,
        reward_tier: newTier,
      });

      await base44.asServiceRole.entities.WalletTransaction.create({
        tenant_id: targetTenantId,
        wallet_id: wallet.id,
        transaction_type: `points_earned_${pointEvent}`,
        amount: pointsToAdd,
        currency: 'points',
        balance_after: newPoints,
        description: `Points earned: ${pointEvent} (+${pointsToAdd} pts)`,
        reference_id,
        triggered_by: user.id,
        triggered_by_name: user.full_name,
        status: 'completed',
      });

      return Response.json({ success: true, points_earned: pointsToAdd, new_balance: newPoints, new_tier: newTier });
    }

    // --- PROVISION NEW WALLET ---
    if (action === 'provision_wallet') {
      if (!isAdmin) return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
      const existing = await base44.asServiceRole.entities.OrbitanWallet.filter({ tenant_id: targetTenantId });
      if (existing && existing.length > 0) {
        return Response.json({ wallet: existing[0], message: 'Wallet already exists' });
      }
      const plan = body.subscription_plan || 'orbitan_starter';
      const quota = PLAN_QUOTAS[plan] || 150;
      const wallet = await base44.asServiceRole.entities.OrbitanWallet.create({
        tenant_id: targetTenantId,
        tenant_name: body.tenant_name || targetTenantId,
        subscription_plan: plan,
        balance_credits: quota,
        credits_quota_monthly: quota,
        loyalty_points: 0,
        reward_tier: 'bronze',
        is_active: true,
      });
      return Response.json({ wallet, message: 'Wallet provisioned successfully' });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});