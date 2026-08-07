import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import OrbitanLoader from '@/components/brand/OrbitanLoader';
import { Lock } from 'lucide-react';
import BackBar from '@/components/shared/BackBar';

// ============================================================
// TestLabGuard — Route guard for /platform/test-lab (Build #28.2P-R.0R.1)
//
// Ensures the Test Lab page is NOT rendered before authority is
// resolved. Requires:
//   1. Authenticated session
//   2. User.role === 'admin'
//   3. Effective platform.test_lab.manage permission
//
// BUILD #28.2P-R.0R.1: Bootstrap UI REMOVED. The one-time
// bootstrap has already completed and is permanently disabled.
// Permission management is now handled exclusively through the
// canonical Access Control architecture (/platform/access-control).
// ============================================================

export default function TestLabGuard({ children }) {
  const { user, isAuthenticated, isLoadingAuth, authChecked } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return <OrbitanLoader size="fullscreen" message="Verifying Test Lab authority..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-destructive" />
            </div>
          </div>
          <h1 className="text-xl font-heading font-semibold">Access Restricted</h1>
          <p className="text-sm text-muted-foreground">
            The Orbitan Test Lab is restricted to platform administrators with the
            <code className="mx-1 text-xs px-1 py-0.5 rounded bg-muted">platform.test_lab.manage</code>
            permission.
          </p>
          <p className="text-xs text-muted-foreground">
            Your role: <span className="font-medium">{user?.role || 'unknown'}</span>
          </p>
          <Navigate to="/workspace" replace />
        </div>
      </div>
    );
  }

  const permissions = user?.data?.permissions || [];
  const hasPermission = permissions.includes('platform.test_lab.manage');

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          <h1 className="text-xl font-heading font-semibold text-center">Permission Required</h1>
          <p className="text-sm text-muted-foreground text-center">
            You are a platform administrator, but you do not have the
            <code className="mx-1 text-xs px-1 py-0.5 rounded bg-muted">platform.test_lab.manage</code>
            permission required to access the Test Lab.
          </p>
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-xs text-muted-foreground text-center">
              The one-time bootstrap is permanently disabled. Permissions are now managed
              exclusively through the canonical Access Control architecture.
            </p>
          </div>
          <div className="pt-2">
            <BackBar to="/leader-org" label="Back to Platform" />
          </div>
        </div>
      </div>
    );
  }

  return children;
}