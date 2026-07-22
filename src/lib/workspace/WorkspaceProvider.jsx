// ============================================================
// ORBITANOS — WorkspaceProvider (ADR-0050 + Workspace Context System)
// Architecture Version 1.0
//
// THE single source of truth for workspace state. Converges what
// was previously split across AuthContext, TenantProvider, and
// GlobalOutletContext into one canonical operational context.
//
// Canonical Workspace Lifecycle:
//   Authenticate → Resolve Identity → Load Memberships →
//   Select Workspace → Resolve Permissions → Warm Cache →
//   Mount WorkspaceLayout → Load Dashboard → Subscribe Realtime
//
// Owns:
//   identity, memberships, activeMembership, tenant, brand, outlet,
//   permissionSnapshot, subscription, featureFlags
//
// In-session workspace switching: preserves the session, UI shell,
// and websocket; invalidates only tenant-scoped cache (React Query
// invalidation) and rebuilds the workspace context. No app reload,
// no re-authentication.
//
// Exit-Ready: Pure React context + Access Engine orchestration.
// ============================================================

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
  useRef,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { createMembershipResolver, translateEmployee } from '@/lib/access';
import { derivePermissions } from '@/lib/access/membership/PermissionResolver';
import {
  resolveEmployee,
  resolveAllEmployees,
} from '@/lib/workspace/EmployeeBase44Provider';
import { DEMO_TENANTS } from '@/lib/use-tenant';

export const WORKSPACE_PROVIDER_VERSION = '1.0.0';
export const SCOPE_ALL = 'ALL';

const WorkspaceContext = createContext(null);

// ── Membership resolver wired to the Base44 boundary ──────────
const membershipResolver = createMembershipResolver({
  resolveEmployee,
});

/**
 * WorkspaceProvider — the unified operational context.
 *
 * Wraps the authenticated user's identity with their membership set,
 * active workspace, and resolved permissions. All workspace pages
 * should consume useWorkspace() — never readAuth() for tenant/outlet/role.
 */
export function WorkspaceProvider({ children }) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const queryClient = useQueryClient();

  const identity = user
    ? {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        platform_role: user.role || null,
      }
    : null;

  // ── Stage: Load Memberships ──────────────────────────────────
  // Fetches all Employee records for this identity and translates
  // them into the normalized Membership shape via the Access Engine.
  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ['workspace-memberships', identity?.email],
    queryFn: async () => {
      if (!identity?.email) return [];
      const employees = await resolveAllEmployees(identity);
      return employees
        .map(translateEmployee)
        .filter((m) => m && m.status === 'active');
    },
    enabled: !!identity?.email && isAuthenticated,
    staleTime: 60 * 1000, // 1 min — memberships don't change often
  });

  // ── Stage: Select Workspace ──────────────────────────────────
  // The active membership is resolved from the URL :tenantId by the
  // WorkspaceLayout. Here we track the currently active membership
  // and allow in-session switching without reload.
  const [activeMembership, setActiveMembership] = useState(null);
  const [activeTenantId, setActiveTenantId] = useState(null);
  const [outletScope, setOutletScope] = useState(SCOPE_ALL);
  const manualOverride = useRef(false);

  // Auto-select the first membership when none is active.
  useEffect(() => {
    if (manualOverride.current) return;
    if (activeMembership || membershipsLoading || memberships.length === 0) return;
    setActiveMembership(memberships[0]);
    setActiveTenantId(memberships[0]?.organisation_id || null);
  }, [memberships, membershipsLoading, activeMembership]);

  // ── Stage: Resolve Workspace (Tenant record) ────────────────
  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ['workspace-tenant', activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return null;
      try {
        return await base44.entities.Tenant.get(activeTenantId);
      } catch {
        // Fallback to pilot roster if DB lookup fails
        return DEMO_TENANTS.find((t) => t.id === activeTenantId) || null;
      }
    },
    enabled: !!activeTenantId && isAuthenticated,
  });

  // ── Stage: Resolve Outlets for the active tenant ─────────────
  const { data: outlets = [] } = useQuery({
    queryKey: ['workspace-outlets', activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];
      try {
        return await base44.entities.Outlet.filter({
          tenant_id: activeTenantId,
        });
      } catch {
        return [];
      }
    },
    enabled: !!activeTenantId && isAuthenticated,
  });

  // ── Stage: Resolve Permissions ──────────────────────────────
  // Derives the scoped permission snapshot from the active membership.
  const permissionSnapshot = activeMembership
    ? derivePermissions(activeMembership)
    : [];

  // ── Stage: Resolve Subscription / Feature Flags (placeholder) ─
  // M4 will wire SubscriptionPolicy + Tenant.feature_flags. For MVP
  // we surface the tenant plan + enabled modules as a baseline.
  const subscription = tenant
    ? {
        plan: tenant.subscription_plan || 'orbitan_starter',
        entitled: true,
        enabled_modules: tenant.enabled_modules || [],
        enabled_packs: tenant.enabled_packs || [],
      }
    : null;

  const featureFlags = tenant?.feature_flags || {};

  // ── Outlet scope helpers ────────────────────────────────────
  const activeOutlet =
    outletScope === SCOPE_ALL
      ? null
      : outlets.find((o) => o.id === outletScope) || null;

  const getOutletFilter = useCallback(() => {
    if (outletScope === SCOPE_ALL) return {};
    return { outlet_id: outletScope };
  }, [outletScope]);

  const switchToOutlet = useCallback((outletId) => {
    setOutletScope(outletId || SCOPE_ALL);
  }, []);

  const switchToGlobal = useCallback(() => {
    setOutletScope(SCOPE_ALL);
  }, []);

  // ── Stage: In-session Workspace Switch ──────────────────────
  // The premium switching experience. Invalidates only tenant-scoped
  // query cache; preserves session, UI shell, and websocket.
  const switchWorkspace = useCallback(
    (tenantId) => {
      manualOverride.current = true;
      const target = memberships.find(
        (m) => m.organisation_id === tenantId
      );
      if (!target) return false;

      // Invalidate tenant-scoped cache so the new workspace loads fresh.
      queryClient.invalidateQueries({ queryKey: ['workspace-tenant'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-outlets'] });
      queryClient.removeQueries({ queryKey: ['workspace-memberships'] });

      setActiveMembership(target);
      setActiveTenantId(target.organisation_id);
      setOutletScope(SCOPE_ALL);
      return true;
    },
    [memberships, queryClient]
  );

  // ── Compose the active role for convenience ──────────────────
  const activeRole = activeMembership?.role_assignments?.[0]?.role || null;

  const isLoadingWorkspace =
    isLoadingAuth || membershipsLoading || (activeTenantId && tenantLoading);

  const value = {
    // ── Identity (pass-through from AuthContext) ──
    identity,
    isAuthenticated,

    // ── Memberships ──
    memberships,
    activeMembership,

    // ── Workspace ──
    tenant,
    activeTenantId,
    activeRole,

    // ── Outlet scope ──
    outlets,
    outletScope,
    activeOutlet,
    isGlobalScope: outletScope === SCOPE_ALL,
    getOutletFilter,
    switchToOutlet,
    switchToGlobal,

    // ── Permissions ──
    permissionSnapshot,

    // ── Subscription & Feature Flags ──
    subscription,
    featureFlags,

    // ── Switching ──
    switchWorkspace,

    // ── Loading ──
    isLoadingWorkspace,
    membershipsLoading,
    tenantLoading,

    // ── Version ──
    version: WORKSPACE_PROVIDER_VERSION,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

/**
 * useWorkspace — THE canonical hook for operational context.
 *
 * Workspace pages and modules MUST consume this rather than reading
 * tenant, outlet, or role directly from useAuth(). This enforces the
 * Workspace Context System boundary (ADR-0050).
 */
export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return ctx;
}

export default WorkspaceContext;