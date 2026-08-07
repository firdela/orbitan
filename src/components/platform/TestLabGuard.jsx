import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import OrbitanLoader from '@/components/brand/OrbitanLoader';
import { ShieldAlert, Lock, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import BackBar from '@/components/shared/BackBar';
import { useToast } from '@/components/ui/use-toast';

// ============================================================
// TestLabGuard — Route guard for /platform/test-lab (Build #28.2P-R.0R)
//
// Ensures the Test Lab page is NOT rendered before authority is
// resolved. Requires:
//   1. Authenticated session
//   2. User.role === 'admin'
//   3. Effective platform.test_lab.manage permission
//
// Includes a one-time bootstrap button for the founder to grant
// themselves the permission without manual User.data editing.
// ============================================================

export default function TestLabGuard({ children }) {
  const { user, isAuthenticated, isLoadingAuth, authChecked } = useAuth();
  const { toast } = useToast();
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapReason, setBootstrapReason] = useState('');
  const [bootstrapDone, setBootstrapDone] = useState(false);

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
    // If bootstrap was just completed, show refresh prompt
    if (bootstrapDone) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <KeyRound className="w-8 h-8 text-emerald-500" />
              </div>
            </div>
            <h1 className="text-xl font-heading font-semibold">Bootstrap Complete</h1>
            <p className="text-sm text-muted-foreground">
              The <code className="text-xs px-1 py-0.5 rounded bg-muted">platform.test_lab.manage</code> permission
              has been granted. You must sign out and sign back in for the permission to take effect.
            </p>
            <p className="text-xs text-muted-foreground">This bootstrap action is now permanently unavailable.</p>
            <Button onClick={() => { base44.auth.logout(); }} className="gap-1.5">
              Sign Out Now
            </Button>
          </div>
        </div>
      );
    }

    const handleBootstrap = async () => {
      if (bootstrapReason.length < 10) {
        toast({ title: 'Reason required', description: 'Please provide a meaningful reason (min 10 characters).', variant: 'destructive' });
        return;
      }
      setBootstrapping(true);
      try {
        const response = await base44.functions.invoke('testLabSetup', {
          action: 'bootstrap_permission',
          reason: bootstrapReason,
        });
        const data = response.data || response;
        if (data?.success) {
          setBootstrapDone(true);
          toast({ title: '✓ Bootstrap Complete', description: 'Permission granted. Please sign out and sign back in.' });
        } else {
          toast({ title: 'Bootstrap Failed', description: data?.error || 'Unknown error.', variant: 'destructive' });
        }
      } catch (err) {
        const msg = err?.response?.data?.error || err?.message || 'Bootstrap failed.';
        toast({ title: 'Bootstrap Failed', description: msg, variant: 'destructive' });
      } finally {
        setBootstrapping(false);
      }
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          <h1 className="text-xl font-heading font-semibold text-center">Permission Required</h1>
          <p className="text-sm text-muted-foreground text-center">
            You are a platform administrator, but you do not have the
            <code className="mx-1 text-xs px-1 py-0.5 rounded bg-muted">platform.test_lab.manage</code>
            permission required to access the Test Lab.
          </p>
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-xs font-medium text-center">One-Time Secure Bootstrap</p>
            <p className="text-xs text-muted-foreground text-center">
              This action grants the permission to yourself and becomes permanently unavailable after one use.
            </p>
            <Textarea
              placeholder="Reason for bootstrap (minimum 10 characters)..."
              value={bootstrapReason}
              onChange={(e) => setBootstrapReason(e.target.value)}
              className="h-20"
              aria-label="Bootstrap reason"
            />
            <Button
              onClick={handleBootstrap}
              disabled={bootstrapping || bootstrapReason.length < 10}
              className="w-full gap-1.5"
            >
              {bootstrapping ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Bootstrap Permission
            </Button>
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