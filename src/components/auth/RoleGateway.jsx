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
 * and routes them to their appropriate workspace.
 *
 * Routing Logic:
 *   Platform Admin (user.role === 'admin')  → /leader-org
 *   Tenant Admin (employee.role)             → /company
 *   Outlet Manager / Supervisor              → /outlet
 *   Worker                                   → /worker
 *   No Employee record found                 → AccessRequestView (onboarding)
 */
export default function RoleGateway() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const userEmail = user?.email || '';

  // Resolve employee record
  const { data: employee, isLoading: empLoading } = useQuery({
    queryKey: ['role-gateway-employee', userEmail],
    queryFn: async () => {
      if (!userEmail) return null;
      const results = await base44.entities.Employee.filter({ email: userEmail });
      return results.length > 0 ? results[0] : null;
    },
    enabled: !!userEmail && isAuthenticated,
  });

  // Loading state
  if (isLoadingAuth || empLoading) {
    return <OrbitanLoader size="fullscreen" message="Loading OrbitanOS..." />;
  }

  // Platform admin → Leader Org
  if (user?.role === 'admin') {
    return <Navigate to="/leader-org" replace />;
  }

  // Employee record found — route by role
  if (employee) {
    const role = employee.role;

    // Tenant-level leadership
    if (role === 'tenant_admin') {
      // Route to their tenant-specific dashboard based on industry
      return <Navigate to="/company" replace />;
    }

    // Outlet-level management
    if (role === 'outlet_manager' || role === 'supervisor') {
      return <Navigate to="/outlet" replace />;
    }

    // Worker (default)
    return <Navigate to="/worker" replace />;
  }

  // No employee record — welcome gateway
  return <Navigate to="/welcome" replace />;
}