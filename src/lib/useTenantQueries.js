// ============================================================
// ORBITANOS — Tenant-Scoped Operational Query Layer
// ------------------------------------------------------------
// ADR-0049: Explicit Tenant Context for Platform Administrators.
//
// Every operational widget inside /workspace/:tenantId/* MUST read
// through these hooks. They enforce three invariants:
//
//   1. FAIL CLOSED — queries are disabled when `tenantId` is missing.
//      No operational data is ever returned without an explicit,
//      active tenant context. This applies to ALL users, including
//      platform administrators.
//
//   2. EXPLICIT SCOPE — every query filters by { tenant_id } in the
//      request itself. We never rely on RLS alone, because platform
//      admins (role: 'admin') bypass tenant RLS and would otherwise
//      see cross-tenant aggregates inside a tenant workspace.
//
//   3. REALTIME SYNC — each hook subscribes to entity events and
//      invalidates its React Query cache so views stay consistent
//      without manual refresh, and stale data never flashes during
//      tenant switches (the query key embeds tenantId, so switching
//      tenants yields a fresh cache).
//
// Cross-tenant / platform-wide aggregates belong in the dedicated
// /platform-admin/* boundary (ADR-0049 §2), NOT here.
// ============================================================

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// ── Canonical query keys (tenant-scoped) ──────────────────────
export const TENANT_QUERY_KEYS = {
  inventory: (tenantId) => ['tenant', 'inventory', tenantId],
  purchaseOrders: (tenantId) => ['tenant', 'purchaseOrders', tenantId],
  tasks: (tenantId) => ['tenant', 'tasks', tenantId],
  salesInvoices: (tenantId) => ['tenant', 'salesInvoices', tenantId],
  shifts: (tenantId) => ['tenant', 'shifts', tenantId],
  compliance: (tenantId) => ['tenant', 'compliance', tenantId],
};

// ── Factory: tenant-scoped query + realtime invalidation ─────
// Centralises the fail-closed + explicit-scope + realtime contract
// so every operational entity follows the exact same pattern.
function useTenantScopedQuery({ tenantId, queryKey, entityName, sort, limit, subscribeEntity }) {
  const enabled = !!tenantId;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKey(tenantId),
    queryFn: () => base44.entities[entityName].filter({ tenant_id: tenantId }, sort, limit),
    enabled, // fail closed when no active tenant
    staleTime: 30 * 1000,
  });

  // Realtime invalidation — refresh on any change within the entity.
  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = base44.entities[subscribeEntity].subscribe(() => {
      queryClient.invalidateQueries({ queryKey: queryKey(tenantId) });
    });
    return unsubscribe;
  }, [enabled, tenantId, queryClient, queryKey, subscribeEntity]);

  return query;
}

// ── Per-entity hooks ──────────────────────────────────────────
export function useTenantInventory(tenantId) {
  return useTenantScopedQuery({
    tenantId,
    queryKey: TENANT_QUERY_KEYS.inventory,
    entityName: 'InventoryItem',
    subscribeEntity: 'InventoryItem',
    sort: '-created_date',
    limit: 50,
  });
}

export function useTenantPurchaseOrders(tenantId) {
  return useTenantScopedQuery({
    tenantId,
    queryKey: TENANT_QUERY_KEYS.purchaseOrders,
    entityName: 'PurchaseOrder',
    subscribeEntity: 'PurchaseOrder',
    sort: '-created_date',
    limit: 20,
  });
}

export function useTenantTasks(tenantId) {
  return useTenantScopedQuery({
    tenantId,
    queryKey: TENANT_QUERY_KEYS.tasks,
    entityName: 'Task',
    subscribeEntity: 'Task',
    sort: '-created_date',
    limit: 50,
  });
}

export function useTenantSalesInvoices(tenantId) {
  return useTenantScopedQuery({
    tenantId,
    queryKey: TENANT_QUERY_KEYS.salesInvoices,
    entityName: 'SalesInvoice',
    subscribeEntity: 'SalesInvoice',
    sort: '-created_date',
    limit: 20,
  });
}

export function useTenantShifts(tenantId) {
  return useTenantScopedQuery({
    tenantId,
    queryKey: TENANT_QUERY_KEYS.shifts,
    entityName: 'Shift',
    subscribeEntity: 'Shift',
    sort: '-date',
    limit: 30,
  });
}

export function useTenantCompliance(tenantId) {
  return useTenantScopedQuery({
    tenantId,
    queryKey: TENANT_QUERY_KEYS.compliance,
    entityName: 'ComplianceRecord',
    subscribeEntity: 'ComplianceRecord',
    sort: '-created_date',
    limit: 30,
  });
}

// ── Supplier (tenant-scoped) ──────────────────────────────────
export function useTenantSuppliers(tenantId) {
  return useTenantScopedQuery({
    tenantId,
    queryKey: (id) => ['tenant', 'suppliers', id],
    entityName: 'Supplier',
    subscribeEntity: 'Supplier',
    sort: '-created_date',
    limit: 50,
  });
}

// ── Daily Reconciliation (tenant-scoped) ───────────────────────
export function useTenantDailyReconciliations(tenantId) {
  return useTenantScopedQuery({
    tenantId,
    queryKey: (id) => ['tenant', 'reconciliations', id],
    entityName: 'DailyReconciliation',
    subscribeEntity: 'DailyReconciliation',
    sort: '-created_date',
    limit: 50,
  });
}

// ── Composite dashboard snapshot ──────────────────────────────
// The single hook WorkspaceDashboard (and any future operational
// overview) consumes. Aggregates the six operational datasets with
// a unified loading/error contract. Fails closed unless tenantId
// is present — no partial cross-tenant results.
export function useDashboardSnapshot(tenantId) {
  const inventory = useTenantInventory(tenantId);
  const purchaseOrders = useTenantPurchaseOrders(tenantId);
  const tasks = useTenantTasks(tenantId);
  const salesInvoices = useTenantSalesInvoices(tenantId);
  const shifts = useTenantShifts(tenantId);
  const compliance = useTenantCompliance(tenantId);

  const queries = [inventory, purchaseOrders, tasks, salesInvoices, shifts, compliance];
  const isLoading = queries.some(q => q.isLoading);
  const error = queries.find(q => q.error)?.error || null;

  return {
    tenantId,
    inventoryItems: inventory.data || [],
    purchaseOrders: purchaseOrders.data || [],
    tasks: tasks.data || [],
    salesInvoices: salesInvoices.data || [],
    shifts: shifts.data || [],
    complianceRecords: compliance.data || [],
    isLoading,
    error,
  };
}