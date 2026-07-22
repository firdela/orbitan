import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/lib/workspace';
import OrbitanLoader from '@/components/brand/OrbitanLoader';

/**
 * RoleGateway — OrbitanOS Workspace Resolution Engine
 *
 * The security interceptor that runs after authentication. Consumes
 * the unified WorkspaceProvider (ADR-0050 Workspace Context System)
 * to resolve the user's membership set and route them to the correct
 * workspace based on their active membership role.
 *
 * Canonical routing logic:
 *   Platform Admin (platform_role === 'admin')  → /leader-org
 *   Worker (active role === 'worker')            → /worker
 *   Manager roles                                → /workspace/:tenantId
 *   No membership found                           → /join (onboarding)
 */
export default function RoleGateway() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const { memberships, activeMembership, isLoadingWorkspace } = useWorkspace();

  if (isLoadingAuth || isLoadingWorkspace) {
    return <OrbitanLoader size="fullscreen" message="Resolving your workspace..." />;
  }

  // Platform admin → Leader Org
  if (user?.role === 'admin') {
    return <Navigate to="/leader-org" replace />;
  }

  // No memberships — route to onboarding / access portal
  if (!memberships || memberships.length === 0) {
    return <Navigate to="/join" replace />;
  }

  const activeRole =
    activeMembership?.role_assignments?.[0]?.role || null;
  const activeTenantId = activeMembership?.organisation_id || null;

  // Workers → Worker Portal only (tasks, shifts, clock in/out, safety)
  if (activeRole === 'worker') {
    return <Navigate to="/worker" replace />;
  }

  // Manager roles → full workspace dashboard
  if (
    activeRole === 'tenant_admin' ||
    activeRole === 'client_manager' ||
    activeRole === 'outlet_manager' ||
    activeRole === 'supervisor'
  ) {
    if (activeTenantId) {
      return <Navigate to={`/workspace/${activeTenantId}`} replace />;
    }
    return <Navigate to="/join" replace />;
  }

  // Unrecognized role — fail-safe to onboarding
  return <Navigate to="/join" replace />;
}