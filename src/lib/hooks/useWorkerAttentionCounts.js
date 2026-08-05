// ============================================================
// ORBITANOS — Worker Attention Counts (Build #28.2J)
// ------------------------------------------------------------
// Worker-scoped attention count resolver for bottom navigation
// badges. Differs from useAttentionCounts (sidebar) in that
// counts are scoped to the individual worker's assignments,
// not the entire tenant.
//
// Badge sources:
//   tasks    — overdue + pending tasks assigned to this worker
//   safety   — pending/overdue compliance in worker's outlet
//   shifts   — deferred (no reliable shift-action source yet)
//   home     — combined critical count (overdue tasks + overdue compliance)
//   me       — deferred (no profile-completion flag yet)
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const QUERY_KEY = ['worker-attention-counts'];

/**
 * useWorkerAttentionCounts — resolves worker-scoped badge counts.
 * @param {object} ctx — { tenantId, outletId, userId }
 */
export function useWorkerAttentionCounts({ tenantId, outletId, userId } = {}) {
  const enabled = !!tenantId && !!userId;

  const query = useQuery({
    queryKey: [...QUERY_KEY, tenantId, outletId, userId],
    queryFn: async () => {
      if (!tenantId || !userId) return {};
      const counts = {};

      // ── Tasks: overdue + pending assigned to THIS worker ──
      try {
        const myTasks = await base44.entities.Task.filter(
          { tenant_id: tenantId, responsible_agent_id: userId },
          '-created_date',
          100
        );
        const now = new Date();
        const actionable = (myTasks || []).filter(t =>
          t.status !== 'completed' &&
          t.status !== 'cancelled' &&
          t.status !== 'archived'
        );
        const overdue = actionable.filter(t =>
          t.due_date && new Date(t.due_date) < now
        );
        counts.tasks = overdue.length;
      } catch { counts.tasks = null; }

      // ── Safety: pending/overdue compliance in worker's outlet ──
      try {
        if (outletId) {
          const pending = await base44.entities.ComplianceRecord.filter(
            { tenant_id: tenantId, outlet_id: outletId, status: { $in: ['pending', 'overdue'] } },
            '-due_date',
            50
          );
          counts.safety = (pending || []).length;
        } else {
          counts.safety = null;
        }
      } catch { counts.safety = null; }

      // ── Home: combined critical count ──
      // Only show if both tasks and safety have actionable items
      if (counts.tasks != null && counts.safety != null) {
        counts.home = (counts.tasks > 0 || counts.safety > 0)
          ? counts.tasks + counts.safety
          : 0;
      } else {
        counts.home = null;
      }

      return counts;
    },
    enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    counts: query.data || {},
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}