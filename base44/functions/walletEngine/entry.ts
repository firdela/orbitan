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
    const { action, tenant_id, amount, currency, reason, reference_id, reference_type, metadata, outlet_id } = body;

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

    // --- DEBIT PROCUREMENT (SGD) — Wallet-Native Ledger ---
    // Called when a PurchaseOrder is marked "received". Posts an immutable
    // WalletTransaction (procurement_debit_sgd) and creates a FinanceSyncQueue
    // entry for future ERP bridging. Evaluates the Dynamic Trust governance
    // threshold from the tenant's ActivationRegistry:
    //   - PO total <= threshold → auto-approve (status=completed)
    //   - PO total > threshold  → pending_approval + GovernanceOverride created
    if (action === 'debit_procurement_sgd') {
      if (!amount || amount <= 0) {
        return Response.json({ error: 'Invalid amount' }, { status: 400 });
      }
      if (!reference_id) {
        return Response.json({ error: 'reference_id (PurchaseOrder ID) is required' }, { status: 400 });
      }

      const wallets = await base44.asServiceRole.entities.OrbitanWallet.filter({ tenant_id: targetTenantId });
      if (!wallets || wallets.length === 0) {
        return Response.json({ error: 'Wallet not found' }, { status: 404 });
      }
      const wallet = wallets[0];

      // ── Resolve governance threshold from ActivationRegistry ──
      // Fetch the tenant's industry pack to resolve the registry manifest
      const tenants = await base44.asServiceRole.entities.Tenant.filter({ id: targetTenantId });
      const tenant = tenants && tenants.length > 0 ? tenants[0] : null;
      const tenantIndustry = tenant?.industry || 'other';

      // Find the ActivationRegistry record matching this tenant's industry
      const registries = await base44.asServiceRole.entities.ActivationRegistry.filter({ industry: tenantIndustry });
      const registry = registries && registries.length > 0 ? registries[0] : null;

      const threshold = registry?.governance_threshold_sgd ?? 200;
      const ledgerMode = registry?.ledger_sync_mode ?? 'internal';
      const aboveThreshold = amount > threshold;

      // ── Create FinanceSyncQueue entry (ERP bridge — always, even in internal mode) ──
      const syncQueueEntry = await base44.asServiceRole.entities.FinanceSyncQueue.create({
        tenant_id: targetTenantId,
        outlet_id: outlet_id || null,
        queue_type: 'po_sync',
        source_entity: 'PurchaseOrder',
        source_record_id: reference_id,
        erp_target: 'xero',
        payload: {
          po_id: reference_id,
          total_amount_sgd: amount,
          supplier_id: metadata?.supplier_id || null,
          supplier_name: metadata?.supplier_name || null,
          items: metadata?.items || [],
        },
        financial_impact_sgd: amount,
        impact_category: 'expense',
        threshold_applied: aboveThreshold,
        threshold_value_sgd: threshold,
        status: 'pending',
        priority: aboveThreshold ? 'immediate' : 'end_of_shift',
        created_by_id: user.id,
        notes: aboveThreshold
          ? `PO SGD ${amount.toFixed(2)} exceeds governance threshold (SGD ${threshold}). Pending manager approval.`
          : `PO SGD ${amount.toFixed(2)} within governance threshold (SGD ${threshold}). Auto-approved.`,
      });

      // ── Create WalletTransaction (immutable ledger entry) ──
      const txnStatus = aboveThreshold ? 'pending_approval' : 'completed';
      const txn = await base44.asServiceRole.entities.WalletTransaction.create({
        tenant_id: targetTenantId,
        outlet_id: outlet_id || null,
        wallet_id: wallet.id,
        transaction_type: 'procurement_debit_sgd',
        amount: -amount,
        currency: 'sgd',
        balance_after: aboveThreshold ? null : amount, // No aggregate SGD balance field on wallet yet; track via transactions
        description: `Procurement: PO ${metadata?.po_number || reference_id} — ${metadata?.supplier_name || 'Supplier'} (SGD ${amount.toFixed(2)})`,
        reference_id,
        reference_type: 'PurchaseOrder',
        triggered_by: user.id,
        triggered_by_name: user.full_name,
        module_used: 'procurement',
        governance_threshold_applied: true,
        threshold_value_sgd: threshold,
        finance_sync_queue_id: syncQueueEntry.id,
        status: txnStatus,
        metadata,
      });

      // ── If above threshold, create a GovernanceOverride request ──
      let overrideId = null;
      if (aboveThreshold) {
        const override = await base44.asServiceRole.entities.GovernanceOverride.create({
          tenant_id: targetTenantId,
          outlet_id: outlet_id || null,
          request_type: 'finance_threshold',
          target_entity: 'PurchaseOrder',
          target_record_id: reference_id,
          policy_name: 'procurement_spend_threshold',
          block_reason: `PO total (SGD ${amount.toFixed(2)}) exceeds governance threshold (SGD ${threshold}) for industry "${tenantIndustry}".`,
          requested_by_id: user.id,
          requested_by_name: user.full_name,
          requested_by_role: user.role,
          requested_date: new Date().toISOString(),
          status: 'pending',
          shield_mode: 'auditor',
          severity: amount > threshold * 3 ? 'high' : 'medium',
          notes: `Auto-generated by Wallet-Native Ledger. Linked WalletTransaction: ${txn.id}`,
        });
        overrideId = override.id;

        // Link override back to the transaction
        await base44.asServiceRole.entities.WalletTransaction.update(txn.id, {
          governance_override_id: overrideId,
        });
      }

      // ── Audit log ──
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          tenant_id: targetTenantId,
          outlet_id: outlet_id || null,
          actor_id: user.id,
          actor_name: user.full_name,
          actor_role: user.role,
          action_type: 'PROCUREMENT_WALLET_DEBIT',
          module: 'procurement',
          target_entity: 'PurchaseOrder',
          target_record_id: reference_id,
          new_state: { amount_sgd: amount, threshold, above_threshold: aboveThreshold, status: txnStatus, wallet_transaction_id: txn.id },
          details: `Procurement debit posted to wallet: SGD ${amount.toFixed(2)} for PO ${metadata?.po_number || reference_id}. Threshold: SGD ${threshold}. Status: ${txnStatus}.`,
          shield_outcome: aboveThreshold ? 'override_requested' : 'pass',
        });
      } catch (auditErr) {
        console.error('[walletEngine] AuditLog write failed:', auditErr?.message);
      }

      return Response.json({
        success: true,
        wallet_transaction_id: txn.id,
        finance_sync_queue_id: syncQueueEntry.id,
        governance_override_id: overrideId,
        status: txnStatus,
        threshold_applied: threshold,
        above_threshold: aboveThreshold,
        ledger_sync_mode: ledgerMode,
        message: aboveThreshold
          ? `PO exceeds governance threshold (SGD ${threshold}). Manager approval required.`
          : `Procurement debit posted successfully (SGD ${amount.toFixed(2)}).`,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});