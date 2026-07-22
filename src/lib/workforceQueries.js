// ============================================================
// ORBITANOS — Workforce Canonical Query Layer
// ------------------------------------------------------------
// Single source of truth for all Workforce reads (Phase 3 of the
// Workforce Synchronization architecture). Every dashboard widget
// and the Workforce Control Room derive their counts from these
// hooks — no widget computes its own interpretation of "active".
//
// Orbit Identity Model:
//   • User   = global identity (one per person)
//   • Employee = tenant-scoped membership (one per tenant)
//
// Event-Driven Sync (Phase 5):
//   Each hook subscribes to realtime entity events and invalidates
// the relevant React Query cache on any create/update/delete, so
// every Workforce view stays consistent without manual refreshes.
// ============================================================

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// ── Canonical query keys (shared across consumers) ──────────
export const WORKFORCE_KEYS = {
  employees: (tenantId) => ['workforce', 'employees', tenantId],
  counts: (tenantId) => ['workforce', 'counts', tenantId],
  accessRequests: (tenantId) => ['workforce', 'access-requests', tenantId],
  invitations: (tenantId) => ['workforce', 'invitations', tenantId],
};

// ── Tenant-scoped Employee fetch ────────────────────────────
// Returns ALL employee records for the given tenant. Consumers
// derive active / on_leave / total from this single dataset via
// `useWorkforceCounts` — never re-query independently.
export function useTenantEmployees(tenantId, options = {}) {
  const enabled = !!tenantId && (options.enabled !== false);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: WORKFORCE_KEYS.employees(tenantId),
    queryFn: () => base44.entities.Employee.filter({ tenant_id: tenantId }, '-created_date', 200),
    enabled,
    staleTime: 30 * 1000,
  });

  // Realtime subscription — invalidate on any Employee change so
  // every mounted Workforce view (dashboard + control room) refreshes.
  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = base44.entities.Employee.subscribe((event) => {
      // Only invalidate if the event touches this tenant's records.
      const rec = event?.data;
      if (rec && rec.tenant_id === tenantId) {
        queryClient.invalidateQueries({ queryKey: WORKFORCE_KEYS.employees(tenantId) });
        queryClient.invalidateQueries({ queryKey: WORKFORCE_KEYS.counts(tenantId) });
      } else if (event?.type) {
        // create/delete may not carry a comparable tenant_id reliably — refresh defensively.
        queryClient.invalidateQueries({ queryKey: WORKFORCE_KEYS.employees(tenantId) });
        queryClient.invalidateQueries({ queryKey: WORKFORCE_KEYS.counts(tenantId) });
      }
    });
    return unsubscribe;
  }, [enabled, tenantId, queryClient]);

  return query;
}

// ── Pending Access Requests (tenant-scoped) ─────────────────
export function usePendingAccessRequests(tenantId, options = {}) {
  const enabled = !!tenantId && (options.enabled !== false);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: WORKFORCE_KEYS.accessRequests(tenantId),
    queryFn: () => base44.entities.AccessRequest.filter({ tenant_id: tenantId, status: 'pending' }),
    enabled,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = base44.entities.AccessRequest.subscribe((event) => {
      const rec = event?.data;
      if (!rec || rec.tenant_id === tenantId) {
        queryClient.invalidateQueries({ queryKey: WORKFORCE_KEYS.accessRequests(tenantId) });
        queryClient.invalidateQueries({ queryKey: WORKFORCE_KEYS.counts(tenantId) });
      }
    });
    return unsubscribe;
  }, [enabled, tenantId, queryClient]);

  return query;
}

// ── Active Invitations (tenant-scoped) ───────────────────────
export function useActiveInvitations(tenantId, options = {}) {
  const enabled = !!tenantId && (options.enabled !== false);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: WORKFORCE_KEYS.invitations(tenantId),
    queryFn: () => base44.entities.Invitation.filter({ tenant_id: tenantId, status: 'active' }, '-issued_date', 50),
    enabled,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = base44.entities.Invitation.subscribe((event) => {
      const rec = event?.data;
      if (!rec || rec.tenant_id === tenantId) {
        queryClient.invalidateQueries({ queryKey: WORKFORCE_KEYS.invitations(tenantId) });
        queryClient.invalidateQueries({ queryKey: WORKFORCE_KEYS.counts(tenantId) });
      }
    });
    return unsubscribe;
  }, [enabled, tenantId, queryClient]);

  return query;
}

// ── Canonical Workforce counts ──────────────────────────────
// THE single function every widget must use. Computes total,
// active, on_leave, pending requests and active invitations from
// the canonical tenant-scoped datasets above. No duplication.
export function useWorkforceCounts(tenantId) {
  const employeesQuery = useTenantEmployees(tenantId);
  const requestsQuery = usePendingAccessRequests(tenantId);
  const invitationsQuery = useActiveInvitations(tenantId);

  const employees = employeesQuery.data || [];
  const requests = requestsQuery.data || [];
  const invitations = invitationsQuery.data || [];

  const totalStaff = employees.length;
  const active = employees.filter(e => e.status === 'active').length;
  const onLeave = employees.filter(e => e.status === 'on_leave').length;
  const pendingRequests = requests.length;
  const activeInvitations = invitations.length;

  return {
    employees,
    totalStaff,
    active,
    onLeave,
    pendingRequests,
    activeInvitations,
    isLoading: employeesQuery.isLoading,
  };
}