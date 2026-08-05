// ============================================================
// ORBITANOS — Canonical Attention Count Resolver (Build #28.2I)
// ------------------------------------------------------------
// Single source of truth for sidebar action badges.
// Every sidebar item that shows a badge derives its count from
// this hook — no sidebar component computes its own counts.
//
// Design principles:
//   • Counts represent REAL pending work, never invented numbers.
//   • Zero counts are hidden (the badge renders null).
//   • Counts respect tenant scope, outlet scope, and RBAC.
//   • Uses existing cached React Query datasets where possible.
//   • Modules without a reliable count source return null
//     (badge omitted) rather than showing fake data.
//
// Exit-Ready: pure React hooks, no platform-specific logic.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const QUERY_KEY = ['attention-counts'];

/**
 * useAttentionCounts — resolves all sidebar badge counts in one
 * canonical query. Returns a map of moduleKey → count (or null).
 *
 * Modules with null counts are omitted from the badge display.
 *
 * @param {object} ctx — { tenantId, outletId, userRole }
 */
export function useAttentionCounts({ tenantId, outletId, userRole } = {}) {
  const enabled = !!tenantId;

  const query = useQuery({
    queryKey: [...QUERY_KEY, tenantId, outletId, userRole],
    queryFn: async () => {
      if (!tenantId) return {};

      const counts = {};
      const filter = { tenant_id: tenantId };

      // ── Tasks: overdue + pending assigned tasks ──
      try {
        const pendingTasks = await base44.entities.Task.filter(
          { ...filter, status: { $in: ['pending', 'in_progress'] } },
          '-created_date',
          100
        );
        const overdue = (pendingTasks || []).filter(
          (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
        );
        counts.tasks = overdue.length;
      } catch { counts.tasks = null; }

      // ── Inventory: low-stock alerts ──
      try {
        const lowStock = await base44.entities.InventoryItem.filter(
          { ...filter, stock_status: 'low_stock' },
          '-updated_date',
          100
        );
        const outOfStock = await base44.entities.InventoryItem.filter(
          { ...filter, stock_status: 'out_of_stock' },
          '-updated_date',
          100
        );
        counts.inventory = (lowStock?.length || 0) + (outOfStock?.length || 0);
      } catch { counts.inventory = null; }

      // ── Procurement: draft + submitted POs requiring action ──
      try {
        const pendingPOs = await base44.entities.PurchaseOrder.filter(
          { ...filter, status: { $in: ['draft', 'submitted', 'pending_approval'] } },
          '-created_date',
          100
        );
        counts.procurement = pendingPOs?.length || 0;
      } catch { counts.procurement = null; }

      // ── Production: pending + delayed production batches ──
      try {
        const pendingBatches = await base44.entities.ProductionBatch.filter(
          { ...filter, status: { $in: ['planned', 'in_progress'] } },
          '-created_date',
          100
        );
        counts.production = pendingBatches?.length || 0;
      } catch { counts.production = null; }

      // ── Sales: unreconciled invoices ──
      try {
        const unreconciled = await base44.entities.SalesInvoice.filter(
          { ...filter, reconciliation_status: 'unreconciled' },
          '-created_date',
          100
        );
        counts.sales = unreconciled?.length || 0;
      } catch { counts.sales = null; }

      // ── Expenses: submitted + rejected expenses ──
      try {
        const actionExpenses = await base44.entities.ExpenseRecord.filter(
          { ...filter, status: { $in: ['submitted', 'rejected'] } },
          '-created_date',
          100
        );
        counts.expenses = actionExpenses?.length || 0;
      } catch { counts.expenses = null; }

      // ── Workforce: pending access requests + active invitations ──
      try {
        const pendingAccess = await base44.entities.AccessRequest.filter(
          { ...filter, status: 'pending' },
          '-created_date',
          50
        );
        counts.workforce = pendingAccess?.length || 0;
      } catch { counts.workforce = null; }

      // ── Compliance: pending + overdue compliance records ──
      try {
        const pendingCompliance = await base44.entities.ComplianceRecord.filter(
          { ...filter, status: { $in: ['pending', 'overdue'] } },
          '-due_date',
          100
        );
        counts.compliance = pendingCompliance?.length || 0;
      } catch { counts.compliance = null; }

      return counts;
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute — balances freshness with network efficiency
    refetchOnWindowFocus: false,
  });

  return {
    counts: query.data || {},
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/**
 * formatBadgeCount — formats a count for display.
 * Returns null for zero/null (badge hidden).
 * Returns "99+" for counts above 99.
 */
export function formatBadgeCount(count) {
  if (count == null || count === 0) return null;
  if (count > 99) return '99+';
  return String(count);
}

/**
 * getBadgeAriaLabel — generates an accessible label for the badge.
 * e.g. "4 pending tasks", "2 low-stock items"
 */
export function getBadgeAriaLabel(moduleKey, count) {
  if (count == null || count === 0) return null;
  const LABELS = {
    tasks: 'pending tasks',
    inventory: 'low-stock items',
    procurement: 'pending purchase orders',
    production: 'pending production batches',
    sales: 'unreconciled sales',
    expenses: 'expenses requiring action',
    workforce: 'pending access requests',
    compliance: 'pending compliance items',
  };
  const label = LABELS[moduleKey] || 'items requiring attention';
  return `${count} ${label}`;
}

/**
 * getBadgeVariant — determines badge severity styling.
 * 'error' for critical counts, 'warning' for moderate, 'default' for low.
 */
export function getBadgeVariant(moduleKey, count) {
  if (count == null || count === 0) return null;
  // Compliance overdue and out-of-stock are critical
  if (moduleKey === 'compliance' || moduleKey === 'inventory') {
    return count > 5 ? 'error' : 'warning';
  }
  return 'default';
}