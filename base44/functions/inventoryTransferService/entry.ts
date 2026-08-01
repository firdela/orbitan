/**
 * OrbitanOS — Inventory Transfer Service (Build #27H + #27H.1)
 * ──────────────────────────────────────────────────
 * Server-side authoritative lifecycle for inter-outlet stock transfers.
 *
 * Build #27H.1: Structured error contract — all error responses now
 * return { error: { code, message, retryable } } instead of plain
 * strings. No stack traces, internal paths, or secrets exposed.
 *
 * Canonical Lifecycle:
 *   Draft → Requested → Approved → Preparing → Dispatched
 *         → (Partially Received | Received) → Reconciled
 *   Cancelled is valid from any pre-reconciliation state.
 *
 * Ledger Integrity:
 *   • Draft / Requested / Approved / Preparing → no stock change
 *   • Dispatched → deduct dispatched_qty from SOURCE outlet InventoryItem
 *   • Partial / Full Receive → add received_qty to DESTINATION outlet InventoryItem
 *   • Reconciliation → closes outstanding discrepancies (no stock change)
 *   • Cancellation after dispatch → reverses source deduction (if not yet received)
 *
 * Audit: Every sensitive transition writes a canonical AuditLog via
 *   writeAuditCritical (fail-closed). If the audit write fails, the
 *   mutation is rolled back.
 *
 * Idempotency: Status is re-validated before every transition. A repeat
 *   request for the same target status is rejected as a no-op.
 *
 * Exit-Ready: pure business logic over Base44 entities; portable.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { serviceError, createAuditWriter } from '../../shared/serviceUtils.ts';

// ── Role matrix ──────────────────────────────────────────────────
const MANAGE_ROLES = ['admin', 'tenant_admin', 'outlet_manager', 'supervisor'];
const APPROVE_ROLES = ['admin', 'tenant_admin', 'outlet_manager'];
const RECONCILE_ROLES = ['admin', 'tenant_admin', 'outlet_manager'];

// ── Canonical transition map ──────────────────────────────────────
const TRANSITIONS = {
  draft: {
    requested: { roles: MANAGE_ROLES },
    cancelled: { roles: MANAGE_ROLES },
  },
  requested: {
    approved: { roles: APPROVE_ROLES },
    cancelled: { roles: APPROVE_ROLES },
  },
  approved: {
    preparing: { roles: MANAGE_ROLES },
    cancelled: { roles: APPROVE_ROLES },
  },
  preparing: {
    dispatched: { roles: MANAGE_ROLES },
    cancelled: { roles: APPROVE_ROLES },
  },
  dispatched: {
    partially_received: { roles: MANAGE_ROLES },
    received: { roles: MANAGE_ROLES },
    cancelled: { roles: APPROVE_ROLES },
  },
  partially_received: {
    received: { roles: MANAGE_ROLES },
    cancelled: { roles: APPROVE_ROLES },
  },
  received: {
    reconciled: { roles: RECONCILE_ROLES },
  },
};

const VALID_STATUSES = new Set([
  'draft', 'requested', 'approved', 'preparing', 'dispatched',
  'partially_received', 'received', 'reconciled', 'cancelled',
]);

const writeAuditCritical = createAuditWriter({
  module: 'inventory',
  category: 'operational',
  event_source: 'inventoryTransferService',
  target_entity: 'InventoryTransfer',
  related_workflow: 'inventory_transfer',
});

function generateTransferNumber() {
  const now = new Date();
  const pad = (n, l) => String(n).padStart(l, '0');
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `IT-${now.getFullYear()}-${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}-${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}${rand}`;
}

async function validateOutlets(base44, tenantId, sourceOutletId, destOutletId) {
  if (sourceOutletId === destOutletId) {
    return { valid: false, code: 'SAME_OUTLET', message: 'Source and destination outlets must differ' };
  }
  const outlets = await base44.asServiceRole.entities.Outlet.filter({ tenant_id: tenantId });
  const outletIds = new Set(outlets.map((o) => o.id));
  if (!outletIds.has(sourceOutletId)) {
    return { valid: false, code: 'SAME_OUTLET', message: 'Source outlet does not belong to this tenant' };
  }
  if (!outletIds.has(destOutletId)) {
    return { valid: false, code: 'SAME_OUTLET', message: 'Destination outlet does not belong to this tenant' };
  }
  return { valid: true };
}

async function resolveDestinationItem(base44, tenantId, destOutletId, sourceItem) {
  const candidates = await base44.asServiceRole.entities.InventoryItem.filter({
    tenant_id: tenantId,
    outlet_id: destOutletId,
    name: sourceItem.inventory_item_name,
    status: 'active',
  });
  if (candidates && candidates.length > 0) {
    return candidates[0];
  }
  const created = await base44.asServiceRole.entities.InventoryItem.create({
    tenant_id: tenantId,
    outlet_id: destOutletId,
    name: sourceItem.inventory_item_name,
    sku: sourceItem.sku || '',
    unit: sourceItem.unit || 'piece',
    current_stock: 0,
    status: 'active',
    is_ingredient: true,
  });
  return created;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return serviceError('PERMISSION_DENIED', 'You do not have permission to perform this action.', 401);

    let payload = {};
    try { payload = await req.json(); } catch (e) {}
    const action = payload.action;
    const userTenantId = user?.data?.tenant_id;

    // ══════════════════════════════════════════════════════════════
    // ACTION: create
    // ══════════════════════════════════════════════════════════════
    if (action === 'create') {
      if (!MANAGE_ROLES.includes(user.role)) {
        return serviceError('PERMISSION_DENIED', 'You do not have permission to create transfers.', 403);
      }

      const tenantId = payload.tenant_id || userTenantId;
      if (!tenantId) {
        return serviceError('TENANT_CONTEXT_REQUIRED', 'Select a tenant before managing this transfer.', 400);
      }

      const sourceOutletId = payload.source_outlet_id;
      const destOutletId = payload.destination_outlet_id;
      const items = payload.items || [];

      const outletCheck = await validateOutlets(base44, tenantId, sourceOutletId, destOutletId);
      if (!outletCheck.valid) {
        return serviceError(outletCheck.code, outletCheck.message, 400);
      }

      if (items.length === 0) {
        return serviceError('INVALID_QUANTITY', 'At least one transfer item is required.', 400);
      }
      for (const it of items) {
        if (!it.inventory_item_id || !it.inventory_item_name) {
          return serviceError('INVALID_QUANTITY', 'Each item must have an inventory_item_id and inventory_item_name.', 400);
        }
        const qty = Number(it.requested_qty);
        if (isNaN(qty) || qty <= 0) {
          return serviceError('INVALID_QUANTITY', `Requested quantity must be positive for ${it.inventory_item_name}.`, 400);
        }
      }

      const outlets = await base44.asServiceRole.entities.Outlet.filter({ tenant_id: tenantId });
      const sourceName = outlets.find((o) => o.id === sourceOutletId)?.name || '';
      const destName = outlets.find((o) => o.id === destOutletId)?.name || '';

      const status = payload.submit ? 'requested' : 'draft';
      const transferNumber = generateTransferNumber();

      const transfer = await base44.asServiceRole.entities.InventoryTransfer.create({
        tenant_id: tenantId,
        source_outlet_id: sourceOutletId,
        source_outlet_name: sourceName,
        destination_outlet_id: destOutletId,
        destination_outlet_name: destName,
        transfer_number: transferNumber,
        items: items.map((it) => ({
          inventory_item_id: it.inventory_item_id,
          inventory_item_name: it.inventory_item_name,
          requested_qty: Number(it.requested_qty),
          unit: it.unit || '',
        })),
        status,
        requester_id: user.id,
        requester_name: user.full_name || user.email,
        request_date: new Date().toISOString().split('T')[0],
        required_date: payload.required_date || undefined,
        notes: payload.notes || undefined,
      });

      try {
        await writeAuditCritical(base44, {
          tenant_id: tenantId,
          outlet_id: sourceOutletId,
          actor_id: user.id,
          actor_name: user.full_name || user.email,
          actor_role: user.role,
          action_type: status === 'requested' ? 'transfer_requested' : 'transfer_created',
          severity: 'info',
          target_record_id: transfer.id,
          previous_state: null,
          new_state: { transfer_number: transferNumber, status, source: sourceName, destination: destName, item_count: items.length },
          details: `Transfer ${transferNumber} ${status === 'requested' ? 'created and submitted' : 'created as draft'}: ${sourceName} → ${destName} (${items.length} items).`,
        });
      } catch (auditErr) {
        try { await base44.asServiceRole.entities.InventoryTransfer.delete(transfer.id); } catch (e) {}
        return serviceError('AUDIT_FAILURE', 'Critical audit write failed — transfer creation rolled back.', 500);
      }

      return Response.json({ success: true, transfer });
    }

    // ══════════════════════════════════════════════════════════════
    // ACTION: transition
    // ══════════════════════════════════════════════════════════════
    if (action === 'transition') {
      if (!MANAGE_ROLES.includes(user.role)) {
        return serviceError('PERMISSION_DENIED', 'You do not have permission to transition transfers.', 403);
      }

      const transferId = payload.transfer_id;
      const targetStatus = payload.target_status;
      const receiptData = payload.receipt_items || null;
      const cancelReason = payload.cancel_reason || '';

      if (!transferId || !targetStatus) {
        return serviceError('INVALID_REQUEST', 'transfer_id and target_status are required.', 400);
      }
      if (!VALID_STATUSES.has(targetStatus)) {
        return serviceError('INVALID_TRANSITION', `Invalid target status: ${targetStatus}.`, 400);
      }

      const transfer = await base44.asServiceRole.entities.InventoryTransfer.get(transferId);
      if (!transfer) {
        return serviceError('NOT_FOUND', 'Transfer not found.', 404);
      }

      const tenantId = payload.tenant_id || userTenantId;
      if (user.role === 'admin') {
        if (!payload.tenant_id) {
          return serviceError('TENANT_CONTEXT_REQUIRED', 'Platform admin must specify explicit tenant_id for transfer operations.', 400);
        }
        if (payload.tenant_id !== transfer.tenant_id) {
          return serviceError('CROSS_TENANT_DENIED', 'Transfer does not belong to specified tenant.', 403);
        }
      } else {
        if (transfer.tenant_id !== userTenantId) {
          return serviceError('CROSS_TENANT_DENIED', 'Transfer belongs to a different tenant.', 403);
        }
      }

      // Idempotency: already in target status → no-op success
      if (transfer.status === targetStatus) {
        return Response.json({ success: true, message: 'Transfer already in target status', transfer, idempotent: true });
      }

      // Validate cancellation is allowed from current state
      if (targetStatus === 'cancelled' && (transfer.status === 'reconciled' || transfer.status === 'received')) {
        return serviceError('CANCELLATION_NOT_ALLOWED', `Cannot cancel a transfer in '${transfer.status}' status.`, 400);
      }

      const allowed = TRANSITIONS[transfer.status]?.[targetStatus];
      if (!allowed) {
        return serviceError('INVALID_TRANSITION', `This transfer has changed and this action is no longer available. Current status: ${transfer.status}.`, 400);
      }

      if (!allowed.roles.includes(user.role)) {
        return serviceError('PERMISSION_DENIED', 'You do not have permission to perform this action.', 403);
      }

      const previousStatus = transfer.status;
      const updates = { status: targetStatus };
      const now = new Date().toISOString();

      if (targetStatus === 'approved') {
        updates.approver_id = user.id;
        updates.approver_name = user.full_name || user.email;
        updates.approved_date = now;
      } else if (targetStatus === 'dispatched') {
        updates.dispatcher_id = user.id;
        updates.dispatcher_name = user.full_name || user.email;
        updates.dispatched_date = now;
      } else if (targetStatus === 'received' || targetStatus === 'partially_received') {
        updates.receiver_id = user.id;
        updates.receiver_name = user.full_name || user.email;
        updates.received_date = now;
      } else if (targetStatus === 'reconciled') {
        updates.reconciled_date = now;
      } else if (targetStatus === 'cancelled') {
        updates.cancel_reason = cancelReason || 'Cancelled by user';
      }

      // ── Process receipt quantities ──────────────────────────────
      if (targetStatus === 'received' || targetStatus === 'partially_received') {
        if (!receiptData || receiptData.length === 0) {
          return serviceError('DISCREPANCY_REQUIRED', 'Receipt quantities are required to confirm receipt.', 400);
        }
        const updatedItems = (transfer.items || []).map((it) => {
          const rcpt = receiptData.find((r) => r.inventory_item_id === it.inventory_item_id);
          if (!rcpt) return it;
          const receivedQty = Number(rcpt.received_qty) || 0;
          const dispatched = Number(it.dispatched_qty) || Number(it.approved_qty) || Number(it.requested_qty) || 0;
          return {
            ...it,
            received_qty: receivedQty,
            discrepancy_qty: dispatched - receivedQty,
            discrepancy_reason: rcpt.discrepancy_reason || '',
          };
        });
        updates.items = updatedItems;
      }

      // ── Stock ledger mutations ──────────────────────────────────
      let stockMutations = [];

      // DISPATCH: deduct from SOURCE
      if (targetStatus === 'dispatched') {
        const sourceItems = await base44.asServiceRole.entities.InventoryItem.filter({
          tenant_id: tenantId,
          outlet_id: transfer.source_outlet_id,
          status: 'active',
        });
        const sourceMap = new Map(sourceItems.map((i) => [i.id, i]));

        const updatedTransferItems = (transfer.items || []).map((it) => {
          const inv = sourceMap.get(it.inventory_item_id);
          if (!inv) {
            throw { code: 'STOCK_CHANGED', message: `Source inventory item not found: ${it.inventory_item_name}. The inventory may have changed.`, status: 409 };
          }
          const dispatchedQty = Number(it.approved_qty) || Number(it.requested_qty) || 0;
          const available = Number(inv.current_stock) || 0;
          if (available < dispatchedQty) {
            throw { code: 'INSUFFICIENT_STOCK', message: `There is not enough available stock to dispatch the requested quantity. ${inv.name}: required ${dispatchedQty}, available ${available}.`, status: 400 };
          }
          stockMutations.push({
            item_id: inv.id,
            item_name: inv.name,
            outlet_id: transfer.source_outlet_id,
            before: available,
            change: -dispatchedQty,
            after: available - dispatchedQty,
            reason: `Dispatched via transfer ${transfer.transfer_number}`,
          });
          return { ...it, dispatched_qty: dispatchedQty };
        });
        updates.items = updatedTransferItems;
      }

      // RECEIVE: add to DESTINATION
      if (targetStatus === 'received' || targetStatus === 'partially_received') {
        const sourceItems = await base44.asServiceRole.entities.InventoryItem.filter({
          tenant_id: tenantId,
          outlet_id: transfer.source_outlet_id,
        });
        const sourceMap = new Map(sourceItems.map((i) => [i.id, i]));

        for (const it of (updates.items || transfer.items || [])) {
          const receivedQty = Number(it.received_qty) || 0;
          if (receivedQty <= 0) continue;
          const sourceInv = sourceMap.get(it.inventory_item_id);
          const destInv = await resolveDestinationItem(base44, tenantId, transfer.destination_outlet_id, {
            inventory_item_name: it.inventory_item_name,
            unit: it.unit || sourceInv?.unit || 'piece',
            sku: sourceInv?.sku || '',
          });
          const before = Number(destInv.current_stock) || 0;
          stockMutations.push({
            item_id: destInv.id,
            item_name: destInv.name,
            outlet_id: transfer.destination_outlet_id,
            before,
            change: +receivedQty,
            after: before + receivedQty,
            reason: `Received via transfer ${transfer.transfer_number}`,
          });
        }
      }

      // CANCEL after dispatch (before receive): reverse source deduction
      if (targetStatus === 'cancelled' && previousStatus === 'dispatched') {
        const sourceItems = await base44.asServiceRole.entities.InventoryItem.filter({
          tenant_id: tenantId,
          outlet_id: transfer.source_outlet_id,
          status: 'active',
        });
        const sourceMap = new Map(sourceItems.map((i) => [i.id, i]));
        for (const it of (transfer.items || [])) {
          const inv = sourceMap.get(it.inventory_item_id);
          if (!inv) continue;
          const reverseQty = Number(it.dispatched_qty) || 0;
          if (reverseQty <= 0) continue;
          const before = Number(inv.current_stock) || 0;
          stockMutations.push({
            item_id: inv.id,
            item_name: inv.name,
            outlet_id: transfer.source_outlet_id,
            before,
            change: +reverseQty,
            after: before + reverseQty,
            reason: `Reversal: cancelled transfer ${transfer.transfer_number}`,
          });
        }
      }

      // ── Execute stock mutations with rollback ───────────────────
      const completedMutations = [];
      try {
        for (const m of stockMutations) {
          await base44.asServiceRole.entities.InventoryItem.update(m.item_id, {
            current_stock: m.after,
          });
          completedMutations.push(m);
        }
      } catch (mutErr) {
        for (const m of completedMutations) {
          try {
            await base44.asServiceRole.entities.InventoryItem.update(m.item_id, {
              current_stock: m.before,
            });
          } catch (rbErr) { /* best-effort */ }
        }
        return serviceError('STOCK_CHANGED', 'Inventory stock could not be updated. The transfer has been rolled back.', 409, true);
      }

      // ── Update the transfer record ─────────────────────────────
      const updated = await base44.asServiceRole.entities.InventoryTransfer.update(transferId, updates);

      // ── Write audit (fail-closed) ───────────────────────────────
      const actionTypeMap = {
        requested: 'transfer_submitted',
        approved: 'transfer_approved',
        preparing: 'transfer_preparing',
        dispatched: 'transfer_dispatched',
        partially_received: 'transfer_partially_received',
        received: 'transfer_received',
        reconciled: 'transfer_reconciled',
        cancelled: 'transfer_cancelled',
      };
      try {
        await writeAuditCritical(base44, {
          tenant_id: tenantId,
          outlet_id: transfer.source_outlet_id,
          actor_id: user.id,
          actor_name: user.full_name || user.email,
          actor_role: user.role,
          action_type: actionTypeMap[targetStatus] || 'transfer_status_changed',
          severity: targetStatus === 'cancelled' ? 'warning' : 'success',
          target_record_id: transferId,
          previous_state: { status: previousStatus },
          new_state: { status: targetStatus, stock_mutations: completedMutations.length },
          details: `Transfer ${transfer.transfer_number}: ${previousStatus} → ${targetStatus} by ${user.full_name || user.email}.` +
            (completedMutations.length > 0 ? ` ${completedMutations.length} stock mutation(s) applied.` : ''),
        });

        for (const m of completedMutations) {
          await writeAuditCritical(base44, {
            tenant_id: tenantId,
            outlet_id: m.outlet_id,
            actor_id: user.id,
            actor_name: user.full_name || user.email,
            actor_role: user.role,
            action_type: 'stock_adjusted',
            target_entity: 'InventoryItem',
            target_record_id: m.item_id,
            previous_state: { current_stock: m.before },
            new_state: { current_stock: m.after },
            details: `${m.reason}: ${m.item_name} ${m.before} → ${m.after} (${m.change > 0 ? '+' : ''}${m.change}).`,
          });
        }
      } catch (auditErr) {
        // Fail-closed: roll back the transfer status update and stock mutations
        try {
          await base44.asServiceRole.entities.InventoryTransfer.update(transferId, { status: previousStatus });
          for (const m of completedMutations) {
            await base44.asServiceRole.entities.InventoryItem.update(m.item_id, { current_stock: m.before });
          }
        } catch (rbErr) { /* best-effort */ }
        return serviceError('AUDIT_FAILURE', 'Critical audit write failed — transition rolled back.', 500);
      }

      return Response.json({
        success: true,
        transfer: updated,
        previous_status: previousStatus,
        new_status: targetStatus,
        stock_mutations: completedMutations.length,
      });
    }

    // ══════════════════════════════════════════════════════════════
    // ACTION: get
    // ══════════════════════════════════════════════════════════════
    if (action === 'get') {
      const transferId = payload.transfer_id;
      if (!transferId) return serviceError('INVALID_REQUEST', 'transfer_id is required.', 400);
      const transfer = await base44.asServiceRole.entities.InventoryTransfer.get(transferId);
      if (!transfer) return serviceError('NOT_FOUND', 'Transfer not found.', 404);
      if (user.role !== 'admin' && transfer.tenant_id !== userTenantId) {
        return serviceError('CROSS_TENANT_DENIED', 'Transfer belongs to a different tenant.', 403);
      }
      if (user.role === 'admin' && payload.tenant_id && payload.tenant_id !== transfer.tenant_id) {
        return serviceError('CROSS_TENANT_DENIED', 'Tenant mismatch.', 403);
      }
      return Response.json({ transfer });
    }

    return serviceError('UNKNOWN_ACTION', `Unknown action: ${action}`, 400);
  } catch (error) {
    // Handle structured errors thrown from within (e.g., INSUFFICIENT_STOCK)
    if (error && error.code) {
      return serviceError(error.code, error.message || 'An error occurred.', error.status || 400, error.retryable || false);
    }
    console.error('[inventoryTransferService] Error:', error.message);
    return serviceError('SERVICE_UNAVAILABLE', 'Inventory Transfer service is temporarily unavailable.', 500, true);
  }
}