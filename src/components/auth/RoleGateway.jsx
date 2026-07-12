import React from 'react';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import OrbitanLoader from '@/components/brand/OrbitanLoader';

/**
 * RoleGateway — OrbitanOS Role Resolution Engine
 *
 * Runs after authentication. Looks up the user's Employee record
 * and routes them to their appropriate workspace based on role.
 *
 * Routing Logic (access control enforcement):
 *   Platform Admin (user.role === 'admin')    → /leader-org
 *   Worker (employee.role === 'worker')       → /worker (tasks & time-tracking only)
 *   Manager roles (tenant_admin, client_manager,
 *     outlet_manager, supervisor)              → /workspace/:tenantId (full dashboard)
 *   No Employee record found                   → /join (onboarding pipeline)
 */
export default function RoleGateway() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const userEmail = user?.email || '';

  // Resolve employee record — this is the authoritative source of
  // the user's role within their organisation. We must wait for this
  // before routing, because the role determines which UI they see.
  const { data: employee, isLoading: empLoading } = useQuery({
    queryKey: ['role-gateway-employee', userEmail],
    queryFn: async () => {
      if (!userEmail) return null;
      const results = await base44.entities.Employee.filter({ email: userEmail });
      return results.length > 0 ? results[0] : null;
    },
    enabled: !!userEmail && isAuthenticated,
  });

  // Loading state — must resolve employee before routing
  if (isLoadingAuth || empLoading) {
    return <OrbitanLoader size="fullscreen" message="Loading OrbitanOS..." />;
  }

  // Platform admin → Leader Org
  if (user?.role === 'admin') {
    return <Navigate to="/leader-org" replace />;
  }

  // ── Role-based access control ──
  // The Employee record is the authoritative source of the user's role.
  // Workers are routed to the Worker Portal (tasks + time-tracking only).
  // Managers are routed to the full workspace dashboard.
  const userTenantId = user?.tenant_id || user?.data?.tenant_id || employee?.tenant_id || null;

  if (employee) {
    const role = employee.role;

    // Workers → Worker Portal only (tasks, shifts, clock in/out, safety)
    if (role === 'worker') {
      return <Navigate to="/worker" replace />;
    }

    // Manager roles → full workspace dashboard
    if (role === 'tenant_admin' || role === 'client_manager' ||
        role === 'outlet_manager' || role === 'supervisor') {
      if (userTenantId) {
        return <Navigate to={`/workspace/${userTenantId}`} replace />;
      }
      // Fallback for legacy pilot routing
      if (role === 'tenant_admin') return <Navigate to="/company" replace />;
      return <Navigate to="/outlet" replace />;
    }
  }

  // No employee record — route to onboarding / access portal
  return <Navigate to="/join" replace />;
}