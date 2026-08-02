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
  useMemo,
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
  // ════════════════════════════════════════════════════════════
  // SECTION: Identity
  // ════════════════════════════════════════════════════════════
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

  // ════════════════════════════════════════════════════════════
  // SECTION: Identity Linkage (RA-0005 — Orbit Identity Model)
  // ════════════════════════════════════════════════════════════
  // ── Stage: Link global User → tenant-scoped Employee records ─
  // Stamps user_id onto every Employee record whose email matches
  // the authenticated user (idempotent, conflict-guarded, audited).
  // Runs once per session BEFORE membership resolution so the
  // canonical user_id link is established. Failures degrade
  // gracefully — the email fallback still resolves memberships.
  const linkageQuery = useQuery({
    queryKey: ['identity-linkage', identity?.id],
    queryFn: async () => {
      try {
        return await base44.functions.invoke('identityLinkage', {});
      } catch (err) {
        console.error('[WorkspaceProvider] identity linkage failed:', err);
        return null;
      }
    },
    enabled: !!identity?.id && isAuthenticated,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const linkageReady =
    linkageQuery.isSuccess || linkageQuery.isError || !identity?.id;

  // ════════════════════════════════════════════════════════════
  // SECTION: Membership
  // ════════════════════════════════════════════════════════════
  // ── Stage: Load Memberships ──────────────────────────────────
  // Fetches all Employee records for this identity (canonical
  // user_id first, email fallback for unlinked records) and
  // translates them into the normalized Membership shape via the
  // Access Engine. Gated on linkage completion so the user_id link
  // is present before resolution.
  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ['workspace-memberships', identity?.id || identity?.email],
    queryFn: async () => {
      if (!identity?.id && !identity?.email) return [];
      const employees = await resolveAllEmployees(identity);
      let translated = employees
        .map(translateEmployee)
        .filter((m) => m && m.status === 'active');

      // ── Platform Admin Tenant Access (Build #28.2E) ──
      // Platform admins may not have Employee membership records for
      // every tenant. The global Workspace Switcher must show ALL
      // tenants the admin can access. We synthesize in-memory membership
      // objects for any Tenant record that doesn't already have an
      // Employee record — no database writes, no RLS weakening.
      // Authorization is still enforced by RLS (role: admin reads all).
      if (identity?.platform_role === 'admin') {
        try {
          const allTenants = await base44.entities.Tenant.list('-created_date', 50);
          const existingOrgIds = new Set(translated.map((m) => m.organisation_id));
          const synthesized = (allTenants || [])
            .filter((t) => !existingOrgIds.has(t.id))
            .map((t) => Object.freeze({
              user_id: identity.id,
              organisation_id: t.id,
              membership_type: 'platform_admin',
              status: 'active',
              display_name: t.name,
              role_assignments: [{ role: 'admin', scope: { tenant_id: t.id, outlet_id: null, company_id: null, department: null } }],
              source_employee_id: null,
              _synthesized: true,
            }));
          translated = [...translated, ...synthesized];
        } catch (err) {
          console.error('[WorkspaceProvider] Admin tenant synthesis failed:', err);
        }
      }

      return translated;
    },
    enabled:
      (!!identity?.email || !!identity?.id) && isAuthenticated && linkageReady,
    staleTime: 60 * 1000, // 1 min — memberships don't change often
  });

  // ════════════════════════════════════════════════════════════
  // SECTION: Workspace
  // ════════════════════════════════════════════════════════════
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

  // ════════════════════════════════════════════════════════════
  // SECTION: Outlet
  // ════════════════════════════════════════════════════════════
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
  // Memoised: derivation only recalculates when activeMembership changes.
  // Permission Packs, Policy Engine, ABAC, and Subscription Policies
  // will make this more expensive — guard it now.
  const permissionSnapshot = useMemo(
    () => (activeMembership ? derivePermissions(activeMembership) : []),
    [activeMembership]
  );

  // ════════════════════════════════════════════════════════════
  // SECTION: Subscription
  // ════════════════════════════════════════════════════════════
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

  // ════════════════════════════════════════════════════════════
  // SECTION: Actions
  // ════════════════════════════════════════════════════════════
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
  // The premium switching experience. Invalidates ONLY tenant-scoped
  // query cache; preserves session, UI shell, websocket, AND the
  // identity-bound memberships cache.
  //
  // Memberships belong to the authenticated identity, not the active
  // workspace. Removing them on every switch creates unnecessary DB
  // work. They are refreshed only by: login, logout, invitation
  // accepted/revoked, membership changed, or explicit refresh.
  const switchWorkspace = useCallback(
    (tenantId) => {
      manualOverride.current = true;
      const target = memberships.find(
        (m) => m.organisation_id === tenantId
      );
      if (!target) return false;

      // Invalidate ONLY tenant-scoped cache (dashboard, inventory,
      // procurement, reports, outlet list, tenant record).
      queryClient.invalidateQueries({ queryKey: ['workspace-tenant'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-outlets'] });

      // Invalidate any other tenant-scoped query caches to prevent
      // stale data from the previous tenant flashing after the switch.
      queryClient.invalidateQueries({ queryKey: ['tenant-scoped'] });

      setActiveMembership(target);
      setActiveTenantId(target.organisation_id);
      setOutletScope(SCOPE_ALL);
      return true;
    },
    [memberships, queryClient]
  );

  // ── Stage: Refresh Memberships (identity-bound cache) ───────
  // Called after invitation accepted/revoked, membership role changed,
  // or explicit user refresh. NOT called during normal workspace switch.
  const refreshMemberships = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['workspace-memberships'] });
  }, [queryClient]);

  // ════════════════════════════════════════════════════════════
  // SECTION: Lifecycle
  // ════════════════════════════════════════════════════════════
  // ── Compose the active role for convenience ──────────────────
  const activeRole = activeMembership?.role_assignments?.[0]?.role || null;

  const isLoadingWorkspace =
    isLoadingAuth || membershipsLoading || (activeTenantId && tenantLoading);

  // ── Derived State ───────────────────────────────────────────
  const value = {
    // ── Identity ──
    identity,
    isAuthenticated,

    // ── Membership ──
    memberships,
    activeMembership,
    refreshMemberships,

    // ── Workspace ──
    tenant,
    activeTenantId,
    activeRole,
    switchWorkspace,

    // ── Permissions ──
    permissionSnapshot,

    // ── Subscription ──
    subscription,

    // ── Feature Flags ──
    featureFlags,

    // ── Outlet ──
    outlets,
    outletScope,
    activeOutlet,
    isGlobalScope: outletScope === SCOPE_ALL,
    getOutletFilter,
    switchToOutlet,
    switchToGlobal,

    // ── Lifecycle ──
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