// ============================================================
// ORBITANOS — Shared Tenant Name Resolver (Build #28.2A)
//
// Single canonical hook for hydrating Tenant records from a list
// of membership organisation IDs. Used by both TenantSwitcher
// and UserMenu to ensure workspace labels always show the
// canonical Tenant.name — never the Employee's personal name.
//
// Exit-Ready: pure React Query + Base44 SDK. Portable.
// ============================================================

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DEMO_TENANTS } from '@/lib/use-tenant';

/**
 * useTenantNames — resolves Tenant records for a list of org IDs.
 *
 * @param {string[]} organisationIds — membership organisation IDs
 * @returns {Record<string, Tenant>} lookup map: tenant_id → Tenant record
 *
 * DB-first with DEMO_TENANTS fallback for pilot/dev environments.
 * Cached for 60s to avoid redundant lookups across components.
 */
export function useTenantNames(organisationIds = []) {
  const ids = useMemo(
    () => organisationIds.filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [organisationIds.join(',')]
  );

  const { data: tenantRecords = [] } = useQuery({
    queryKey: ['tenant-names', ids.join(',')],
    queryFn: async () => {
      if (!ids.length) return [];
      const results = await Promise.all(
        ids.map((id) => base44.entities.Tenant.get(id).catch(() => null))
      );
      return results.filter(Boolean);
    },
    enabled: ids.length > 0,
    staleTime: 60 * 1000,
  });

  return useMemo(() => {
    const map = {};
    tenantRecords.forEach((t) => { map[t.id] = t; });
    DEMO_TENANTS.forEach((t) => { if (!map[t.id]) map[t.id] = t; });
    return map;
  }, [tenantRecords]);
}

export default useTenantNames;