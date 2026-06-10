import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import MaintenanceView from '@/components/layout/MaintenanceView';
import OrbitanLoader from '@/components/brand/OrbitanLoader';

/**
 * SystemGuard — OrbitanOS Global Maintenance Interceptor
 * Principle: Regulate
 *
 * Wraps the entire authenticated app. Reads the SystemSettings singleton.
 * If maintenance_mode is true AND the current user is NOT an admin
 * (or allow_admin_access_during_maintenance is false), renders MaintenanceView.
 *
 * Exit-Ready: pure React query pattern — swap the entity call with any API.
 */
export default function SystemGuard({ children }) {
  const { user } = useAuth();

  const { data: settingsArr, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => base44.entities.SystemSettings.list(),
    staleTime: 60_000,       // Re-check every 60 seconds
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return <OrbitanLoader size="fullscreen" message="Loading OrbitanOS..." />;
  }

  // Treat first record as the singleton
  const settings = settingsArr?.[0] || {};
  const isMaintenanceMode = settings.maintenance_mode === true;
  const adminBypass = settings.allow_admin_access_during_maintenance !== false;
  const isAdmin = user?.role === 'admin';

  if (isMaintenanceMode && !(isAdmin && adminBypass)) {
    return <MaintenanceView settings={settings} />;
  }

  return <>{children}</>;
}