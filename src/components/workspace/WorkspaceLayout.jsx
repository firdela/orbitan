// ============================================================
// ORBITANOS — WorkspaceLayout (Dynamic Workspace Resolver)
//
// Layout route for /workspace/:tenantId/*
//
// Responsibilities:
//   1. Guard — verify the authenticated user belongs to the
//      tenant in the URL (or is a platform admin).
//   2. Resolve — fetch the Tenant record from the database by
//      :tenantId at runtime (no hardcoded slugs).
//   3. Scope — provide the resolved tenant + role into context.
//   4. Shell — render the AppShell with a dynamic, tenant-scoped
//      navigation and an <Outlet /> for module pages.
//
// This is the single entry for every customer workspace — pilot
// or future — and scales to thousands of organisations without
// route changes.
// ============================================================

import React, { useEffect, useState } from 'react';
import { useParams, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/lib/workspace';
import { useTenant, DEMO_TENANTS } from '@/lib/use-tenant';
import AppShell from '@/components/layout/AppShell';
import OrbitanLoader from '@/components/brand/OrbitanLoader';
import ManifestNav from '@/components/workspace/ManifestNav';
import { hydrateManifest } from '@/lib/registry/ManifestHydrator';
import { Building2, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WorkspaceLayout() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const {
    memberships,
    activeMembership,
    switchWorkspace,
    isLoadingWorkspace,
  } = useWorkspace();
  const { switchTenant } = useTenant();

  // ── Membership check: verify the user belongs to this tenant ──
  // The Access Engine resolves memberships; here we enforce that the
  // tenantId in the URL matches one of the user's memberships.
  const membershipForTenant = memberships.find(
    (m) => m.organisation_id === tenantId
  );

  // Auto-select the matching workspace on URL entry (in-session switch).
  useEffect(() => {
    if (membershipForTenant && activeMembership?.organisation_id !== tenantId) {
      switchWorkspace(tenantId);
    }
  }, [tenantId, membershipForTenant, activeMembership, switchWorkspace]);

  // ── Resolve the Tenant record from the database ─────────
  // ── Resolve the Tenant record from the database ─────────
  // Build #28.2E: Added DEMO_TENANTS fallback to match
  // WorkspaceProvider's queryFn. Without this, if the DB lookup
  // fails (timing, RLS evaluation, network), the query returns null
  // and "Workspace not found" appears even for valid tenants.
  // Both queries share the same key — React Query deduplicates.
  const { data: tenantRecord, isLoading: tenantLoading } = useQuery({
    queryKey: ['workspace-tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      try {
        return await base44.entities.Tenant.get(tenantId);
      } catch {
        // Fallback to pilot roster if DB lookup fails — prevents
        // "Workspace not found" for valid pilot tenants during
        // transient query failures or race conditions.
        return DEMO_TENANTS.find((t) => t.id === tenantId) || null;
      }
    },
    enabled: !!tenantId && isAuthenticated,
  });

  // ── HYDRATE: Fetch manifest + subscription policy ────────
  // Runs as soon as the tenant record is resolved.
  const { navigation, source, isLoading: navLoading } = useManifestHydration(tenantId, tenantRecord);

  // Sync the active tenant in the legacy context for downstream consumers.
  // (Declared before any early return so hook order stays stable.)
  useEffect(() => {
    if (tenantRecord) switchTenant(tenantRecord);
  }, [tenantRecord, switchTenant]);

  // ── Boot: wait for auth ──────────────────────────────────
  if (isLoadingAuth || isLoadingWorkspace) {
    return <OrbitanLoader size="fullscreen" message="Loading OrbitanOS..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/gateway" replace />;
  }

  // Platform admin bypass — may access any tenant workspace.
  const isPlatformAdmin = user?.role === 'admin';
  const userTenantId = user?.tenant_id || user?.data?.tenant_id || null;

  // ── Access control (Regulate principle) ─────────────────
  // Workers are restricted to the Worker Portal — they cannot access
  // the management workspace even via direct URL entry.
  const activeRole =
    membershipForTenant?.role_assignments?.[0]?.role || null;
  if (activeRole === 'worker') {
    return <Navigate to="/worker" replace />;
  }

  const isAuthorized =
    isPlatformAdmin || !!membershipForTenant || userTenantId === tenantId;

  if (!isAuthorized) {
    // Fail-closed: redirect to their own workspace or the join flow.
    if (activeMembership?.organisation_id) {
      return <Navigate to={`/workspace/${activeMembership.organisation_id}`} replace />;
    }
    if (userTenantId) {
      return <Navigate to={`/workspace/${userTenantId}`} replace />;
    }
    return <Navigate to="/join" replace />;
  }

  // ── Resolve tenant (DB record → unresolved) ─────────────
  if (tenantLoading || navLoading) {
    return <OrbitanLoader size="fullscreen" message="Resolving workspace..." />;
  }

  const effectiveTenant = tenantRecord || null;

  if (!effectiveTenant) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-6">
        <div className="text-center space-y-4 max-w-md">
          <Building2 className="w-10 h-10 mx-auto text-muted-foreground" />
          <div>
            <h2 className="font-heading font-semibold text-lg">Workspace unavailable</h2>
            <p className="text-sm text-muted-foreground mt-1">
              This organisation could not be resolved. It may have been removed, or your
              access may have changed.
            </p>
          </div>
          <div className="flex flex-col gap-2 max-w-xs mx-auto">
            {activeMembership?.organisation_id && (
              <Button variant="default" onClick={() => navigate(`/workspace/${activeMembership.organisation_id}`, { replace: true })}>
                <Building2 className="w-4 h-4" /> Return to Previous Workspace
              </Button>
            )}
            {isPlatformAdmin && (
              <Button variant="outline" onClick={() => navigate('/leader-org', { replace: true })}>
                <Shield className="w-4 h-4" /> Return to Platform Console
              </Button>
            )}
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4" /> Retry
            </Button>
            <Button variant="ghost" onClick={() => navigate('/workspace', { replace: true })}>
              Choose Another Workspace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const title = effectiveTenant.name || 'Workspace';

  return (
    <AppShell
      navigation={[]}
      title={title}
      tenant={effectiveTenant}
      manifestNav={<ManifestNav navigation={isPlatformAdmin ? navigation : navigation.filter(i => i.module_key !== 'leader_org')} />}
      manifestSource={source}
    >
      <Outlet context={{ tenant: effectiveTenant, tenantId }} />
    </AppShell>
  );
}

// ── Manifest Hydration Hook ─────────────────────────────────
// Wraps the async hydrateManifest call in React state.
function useManifestHydration(tenantId, tenantRecord) {
  const [state, setState] = useState({ navigation: [], source: 'fallback', isLoading: true });

  useEffect(() => {
    let cancelled = false;

    if (!tenantId) {
      setState({ navigation: [], source: 'fallback', isLoading: false });
      return;
    }

    // Always delegate to hydrateManifest — it handles null tenantRecord
    // internally by returning the safety-net FALLBACK_NAV. This eliminates
    // duplicate hardcoded navigation and makes the hydrator the single
    // source of truth for workspace navigation.
    hydrateManifest(tenantId, tenantRecord).then(result => {
      if (!cancelled) {
        setState({ navigation: result.navigation, source: result.source, isLoading: false });
      }
    }).catch(() => {
      if (!cancelled) {
        setState({ navigation: [], source: 'fallback', isLoading: false });
      }
    });

    return () => { cancelled = true; };
  }, [tenantId, tenantRecord]);

  return state;
}