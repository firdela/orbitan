// ============================================================
// ORBITANOS — Worker Overview Data Hook (Build #28.2J)
// ------------------------------------------------------------
// Consolidated data query for the Worker Home dashboard.
// Fetches only the additional data not already loaded by
// WorkerPortal (compliance records). All shared queries use the
// same TanStack Query keys so the cache is shared across
// Home, Tasks, Shifts, and Safety screens.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * useWorkerOverview — fetches compliance + safety data scoped
 * to the worker's outlet. Tasks, shifts, clock records, and
 * announcements are fetched by WorkerPortal and passed as props
 * to avoid duplicate network requests.
 *
 * @param {object} ctx — { tenantId, outletId, workerId }
 */
export function useWorkerOverview({ tenantId, outletId, workerId } = {}) {
  const enabled = !!tenantId && !!outletId;

  const { data: complianceRecords = [], isLoading: complianceLoading } = useQuery({
    queryKey: ['worker-compliance', tenantId, outletId],
    queryFn: () => base44.entities.ComplianceRecord.filter(
      { tenant_id: tenantId, outlet_id: outletId },
      '-due_date',
      50
    ),
    enabled,
    staleTime: 60 * 1000,
  });

  return {
    complianceRecords,
    complianceLoading,
  };
}