// ============================================================
// ORBITAN — Auth Page Redirect Guard
//
// Wraps public auth pages (Login, Register, ForgotPassword,
// ResetPassword) to redirect already-authenticated users to
// their workspace. Prevents authenticated users from being
// trapped on sign-in/register/reset pages.
//
// Usage:
//   <AuthPageGuard>
//     <Login />
//   </AuthPageGuard>
// ============================================================

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import OrbitanLoader from '@/components/brand/OrbitanLoader';

export default function AuthPageGuard({ children }) {
  const { isAuthenticated, isLoadingAuth, authChecked } = useAuth();

  // While auth is being checked, show the loader.
  // This prevents a flash of the login page for authenticated users.
  if (isLoadingAuth || !authChecked) {
    return <OrbitanLoader size="fullscreen" message="Loading..." />;
  }

  // Authenticated users are redirected to workspace.
  // They should never see login/register/forgot/reset pages.
  if (isAuthenticated) {
    return <Navigate to="/workspace" replace />;
  }

  // Unauthenticated users see the auth page normally.
  return children;
}