// ============================================================
// ORBITANOS — WorkspaceLayout (Dynamic Workspace Resolver)
// Build #28.2F.1 — Explicit Resolution State Model
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
// RESOLUTION STATE MODEL (Build #28.2F.1):
//   RESOLVING_TENANT  — Auth, memberships, or tenant query in flight
//   HYDRATING_MANIFEST — Tenant resolved + authorized; manifest hydrating
//   READY             — Tenant resolved, authorized, manifest hydrated
//   NOT_FOUND         — Tenant query completed; no record returned
//   ACCESS_DENIED     — Tenant exists but user lacks membership/admin
//   ERROR             — Query or hydration threw a runtime error
//
// The "Workspace unavailable" fallback renders ONLY in NOT_FOUND or ERROR,
// never while a query is still pending. This eliminates the race condition
// where React Query v5's `isLoading` (isPending && isFetching) returns
// false during the brief window between enable and fetch-start, causing
// the fallback to render prematurely for valid tenants.
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
import { Building2, Shield, RefreshCw, AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Resolution states ──
const STATE = {
  RESOLVING_TENANT: 'resolving_tenant',
  HYDRATING_MANIFEST: 'hydrating_manifest',
  READY: 'ready',
  NOT_FOUND: 'not_found',
  ACCESS_DENIED: 'access_denied',
  ERROR: 'error',
};

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
  // Build #28.2F.1: Use isPending (not isLoading) to detect "no data yet."
  // React Query v5's isLoading = isPending && isFetching, which is false
  // during the brief window between enable and fetch-start. isPending
  // is true whenever there's no data, regardless of fetch status.
  const { data: tenantRecord, isPending: tenantPending, isError: tenantError } = useQuery({
    queryKey: ['workspace-tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      try {
        return await base44.entities.Tenant.get(tenantId);
      } catch {
        return DEMO_TENANTS.find((t) => t.id === tenantId) || null;
      }
    },
    enabled: !!tenantId && isAuthenticated,
  });

  // ── HYDRATE: Fetch manifest + subscription policy ────────
  const { navigation, source, isLoading: navLoading } = useManifestHydration(tenantId, tenantRecord);

  // Sync the active tenant in the legacy context for downstream consumers.
  useEffect(() => {
    if (tenantRecord) switchTenant(tenantRecord);
  }, [tenantRecord, switchTenant]);

  // ── Not authenticated → redirect to login ──
  // (Evaluated before state computation so unauthenticated users
  //  don't see an infinite loader.)
  if (!isLoadingAuth && !isAuthenticated) {
    return <Navigate to="/auth/gateway" replace />;
  }

  // ── Compute explicit resolution state ────────────────────
  const resolutionState = computeResolutionState({
    isLoadingAuth,
    isLoadingWorkspace,
    isAuthenticated,
    tenantId,
    tenantPending,
    tenantError,
    tenantRecord,
    memberships,
    user,
    navLoading,
  });

  // ── Render based on resolution state ──────────────────────
  switch (resolutionState) {
    case STATE.RESOLVING_TENANT:
      return (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center min-h-screen bg-background"
        >
          <OrbitanLoader size="fullscreen" message="Resolving workspace..." />
        </div>
      );

    case STATE.HYDRATING_MANIFEST:
      return (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center min-h-screen bg-background"
        >
          <OrbitanLoader size="fullscreen" message="Loading workspace..." />
        </div>
      );

    case STATE.NOT_FOUND:
      return <WorkspaceNotFound navigate={navigate} activeMembership={activeMembership} isPlatformAdmin={user?.role === 'admin'} />;

    case STATE.ACCESS_DENIED:
      return <WorkspaceAccessDenied navigate={navigate} activeMembership={activeMembership} />;

    case STATE.ERROR:
      return <WorkspaceError navigate={navigate} activeMembership={activeMembership} isPlatformAdmin={user?.role === 'admin'} />;

    case STATE.READY:
    default:
      break;
  }

  const effectiveTenant = tenantRecord;
  const isPlatformAdmin = user?.role === 'admin';
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

// ── Resolution State Computation ────────────────────────────
// Deterministic state derivation. No timers, no arbitrary delays.
// Each state is computed from concrete query/auth flags.
function computeResolutionState({
  isLoadingAuth,
  isLoadingWorkspace,
  isAuthenticated,
  tenantId,
  tenantPending,
  tenantError,
  tenantRecord,
  memberships,
  user,
  navLoading,
}) {
  // 1. Auth still loading → RESOLVING_TENANT
  if (isLoadingAuth || isLoadingWorkspace) return STATE.RESOLVING_TENANT;

  // 2. Not authenticated → caller redirects before reaching here,
  //    but guard defensively.
  if (!isAuthenticated) return STATE.RESOLVING_TENANT;

  // 3. Invalid tenantId in route → NOT_FOUND
  if (!tenantId) return STATE.NOT_FOUND;

  // 4. Tenant query errored → ERROR
  if (tenantError) return STATE.ERROR;

  // 5. Tenant query still pending (no data yet) → RESOLVING_TENANT
  //    This is the critical fix: isPending is true even when isLoading
  //    is false (during the enable→fetch-start window in React Query v5).
  if (tenantPending) return STATE.RESOLVING_TENANT;

  // 6. Tenant query completed but returned null → NOT_FOUND
  if (!tenantRecord) return STATE.NOT_FOUND;

  // 7. Tenant resolved — verify authorization
  const isPlatformAdmin = user?.role === 'admin';
  const userTenantId = user?.tenant_id || user?.data?.tenant_id || null;
  const membershipForTenant = memberships.find(
    (m) => m.organisation_id === tenantId
  );

  // Worker access check
  const activeRole = membershipForTenant?.role_assignments?.[0]?.role || null;
  if (activeRole === 'worker') return STATE.ACCESS_DENIED;

  const isAuthorized = isPlatformAdmin || !!membershipForTenant || userTenantId === tenantId;
  if (!isAuthorized) return STATE.ACCESS_DENIED;

  // 8. Tenant resolved and authorized — check manifest hydration
  if (navLoading) return STATE.HYDRATING_MANIFEST;

  return STATE.READY;
}

// ── Fallback: Workspace Not Found ───────────────────────────
function WorkspaceNotFound({ navigate, activeMembership, isPlatformAdmin }) {
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

// ── Fallback: Access Denied ─────────────────────────────────
function WorkspaceAccessDenied({ navigate, activeMembership }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-6">
      <div className="text-center space-y-4 max-w-md">
        <Lock className="w-10 h-10 mx-auto text-muted-foreground" />
        <div>
          <h2 className="font-heading font-semibold text-lg">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-1">
            You don&rsquo;t have access to this workspace. If you believe this is an error,
            contact your administrator.
          </p>
        </div>
        <div className="flex flex-col gap-2 max-w-xs mx-auto">
          {activeMembership?.organisation_id && (
            <Button variant="default" onClick={() => navigate(`/workspace/${activeMembership.organisation_id}`, { replace: true })}>
              <Building2 className="w-4 h-4" /> Go to My Workspace
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate('/workspace', { replace: true })}>
            Choose Another Workspace
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Fallback: Error ─────────────────────────────────────────
function WorkspaceError({ navigate, activeMembership, isPlatformAdmin }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-6">
      <div className="text-center space-y-4 max-w-md">
        <AlertTriangle className="w-10 h-10 mx-auto text-orbitan-amber-700" />
        <div>
          <h2 className="font-heading font-semibold text-lg">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mt-1">
            We couldn&rsquo;t load this workspace. Please try again, or choose another workspace.
          </p>
        </div>
        <div className="flex flex-col gap-2 max-w-xs mx-auto">
          <Button variant="default" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
          {activeMembership?.organisation_id && (
            <Button variant="outline" onClick={() => navigate(`/workspace/${activeMembership.organisation_id}`, { replace: true })}>
              <Building2 className="w-4 h-4" /> Return to Previous Workspace
            </Button>
          )}
          {isPlatformAdmin && (
            <Button variant="outline" onClick={() => navigate('/leader-org', { replace: true })}>
              <Shield className="w-4 h-4" /> Return to Platform Console
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate('/workspace', { replace: true })}>
            Choose Another Workspace
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Manifest Hydration Hook ─────────────────────────────────
// Wraps the async hydrateManifest call in React state.
// Build #28.2F.1: Sets isLoading=true at the START of every effect run,
// not just the initial state. This prevents the brief window where
// isLoading is false (from a previous hydration with null tenantRecord)
// while the second hydration (with the real tenant) is still in flight.
function useManifestHydration(tenantId, tenantRecord) {
  const [state, setState] = useState({ navigation: [], source: 'fallback', isLoading: true });

  useEffect(() => {
    let cancelled = false;

    if (!tenantId) {
      setState({ navigation: [], source: 'fallback', isLoading: false });
      return;
    }

    // Mark loading at the START of every hydration cycle — not just
    // the initial mount. Without this, the second hydration (triggered
    // when tenantRecord transitions from undefined → real tenant) would
    // have isLoading=false from the first cycle's resolution, creating
    // a window where the layout renders with empty/stale navigation
    // or falls through to the NOT_FOUND fallback.
    setState((prev) => ({ ...prev, isLoading: true }));

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