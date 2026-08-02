// ============================================================
// ORBITANOS — Integration Hub (Build #28.2A)
// Privacy-first integration experience.
//
// Customer-facing: clean connection card, neutral unavailable
// state, no developer-facing content.
//
// Platform admins get a separate collapsible diagnostics panel
// that shows configuration health without exposing secrets.
//
// Reuses: xeroOAuth, integrationSync, IntegrationCredential,
// FinanceSyncQueue, AuditLog, RBAC/RLS.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/lib/workspace';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw, ExternalLink, Zap, Clock,
  Plug, PlugZap, ShieldCheck, Settings, Link2Off, LifeBuoy, ChevronDown, ChevronUp, ArrowRight,
} from 'lucide-react';
import IntegrationCatalog from '@/components/platform/IntegrationCatalog';
import { cn } from '@/lib/utils';
import { classifyIntegrationError } from '@/lib/integration-errors';
import { Building2, AlertTriangle, Plus } from 'lucide-react';

const STATUS_CONFIG = {
  connected: { icon: CheckCircle2, color: 'text-orbitan-green', bg: 'bg-orbitan-green-light', border: 'border-orbitan-green/30', label: 'Connected' },
  disconnected: { icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', label: 'Not Connected' },
  expired: { icon: AlertCircle, color: 'text-orbitan-amber-700', bg: 'bg-orbitan-amber-light', border: 'border-orbitan-amber/30', label: 'Reconnect Required' },
  error: { icon: AlertCircle, color: 'text-orbitan-red-700', bg: 'bg-orbitan-red-light', border: 'border-orbitan-red/30', label: 'Action Required' },
  not_connected: { icon: Plug, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', label: 'Not Connected' },
  not_configured: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', label: 'Temporarily Unavailable' },
};

const HEALTH_BADGE = {
  healthy: 'bg-orbitan-green-light text-orbitan-green-700 border-orbitan-green/30',
  warning: 'bg-orbitan-amber-light text-orbitan-amber-700 border-orbitan-amber/30',
  critical: 'bg-orbitan-red-light text-orbitan-red-700 border-orbitan-red/30',
};

function KPI({ icon: Icon, label, value, tone = 'neutral' }) {
  const toneClass = {
    neutral: 'text-foreground',
    green: 'text-orbitan-green-700',
    amber: 'text-orbitan-amber-700',
    red: 'text-orbitan-red-700',
    blue: 'text-orbitan-blue-700',
  }[tone];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
            <p className={cn('text-2xl font-display font-bold mt-1', toneClass)}>{value}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Icon className="w-4.5 h-4.5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReadyDot({ ok, label }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-orbitan-green flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-orbitan-red-700 flex-shrink-0" />
      )}
      <span className={ok ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}

export default function IntegrationHubPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { activeTenantId } = useWorkspace();
  const workspaceTenantId = activeTenantId || user?.data?.tenant_id || user?.tenant_id;
  const isAdmin = user?.role === 'admin';
  const canManage = ['admin', 'tenant_admin'].includes(user?.role);

  // ── Build #28.2D — Admin Tenant Selection ──
  // Platform admins have no Employee memberships, so WorkspaceProvider
  // can't resolve a tenant for them. They must explicitly select which
  // tenant to manage integrations for. This preserves the privacy-first
  // architecture: the admin chooses the tenant context, and all Xero
  // operations are scoped to that tenant_id.
  //
  // selectedTenantId is persisted in sessionStorage so it survives the
  // full-page OAuth redirect to Xero and back. Without this, the admin
  // would return from Xero to a page with no tenant context and be
  // unable to see the connection result.
  const [selectedTenantId, setSelectedTenantIdState] = useState(
    () => sessionStorage.getItem('integration_selected_tenant') || null
  );
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const tenantId = workspaceTenantId || selectedTenantId;

  const setSelectedTenantId = useCallback((id) => {
    setSelectedTenantIdState(id);
    if (id) sessionStorage.setItem('integration_selected_tenant', id);
    else sessionStorage.removeItem('integration_selected_tenant');
  }, []);

  const [xeroStatus, setXeroStatus] = useState(null);
  const [platformConfig, setPlatformConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncQueue, setSyncQueue] = useState([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const fetchXeroStatus = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res = await base44.functions.invoke('xeroOAuth', { action: 'get_status', tenant_id: tenantId });
      setXeroStatus(res.data);
    } catch (err) {
      console.error('Xero status error:', err);
      setXeroStatus({ connected: false, configured: false, status: 'not_configured' });
    }
  }, [tenantId]);

  const fetchSyncQueue = useCallback(async () => {
    if (!tenantId) return;
    try {
      const entries = await base44.entities.FinanceSyncQueue.filter({ tenant_id: tenantId, status: 'pending' });
      setSyncQueue(entries || []);
    } catch (err) {
      console.error('Sync queue error:', err);
    }
  }, [tenantId]);

  const fetchPlatformConfig = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await base44.functions.invoke('xeroOAuth', { action: 'get_platform_config' });
      setPlatformConfig(res.data);
    } catch (err) {
      console.error('Platform config error:', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    Promise.all([fetchXeroStatus(), fetchSyncQueue(), fetchPlatformConfig()]).finally(() => setLoading(false));
  }, [fetchXeroStatus, fetchSyncQueue, fetchPlatformConfig]);

  // ── Build #28.2D — Fetch tenant list for admin selection ──
  // Only fetches when: (a) user is admin, (b) no workspace tenant was
  // resolved by WorkspaceProvider. Tenant users skip this entirely —
  // their tenant is resolved automatically.
  useEffect(() => {
    if (!isAdmin || workspaceTenantId) return;
    setTenantsLoading(true);
    base44.entities.Tenant.list('-created_date', 50)
      .then((list) => setTenants(list || []))
      .catch(() => setTenants([]))
      .finally(() => setTenantsLoading(false));
  }, [isAdmin, workspaceTenantId]);

  // ── Handle OAuth callback (?code=...&state=... OR ?error=...&error_description=...) ──
  // State is a single-use server-side nonce (Build #28.2B). The backend validates
  // expiry, user/tenant binding, and prevents replay of consumed state.
  // Xero returns error/error_description if the user denies consent or if the
  // request is invalid (e.g. invalid_scope, invalid_client, redirect_uri_mismatch).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    // ── Provider error callback (user denied, invalid_scope, etc.) ──
    if (error) {
      const friendlyMessage = error === 'access_denied'
        ? 'You declined to authorise Xero. You can reconnect anytime.'
        : error === 'invalid_scope'
        ? 'The requested permissions are not valid for this Xero app. Please contact Orbitan Support.'
        : error === 'invalid_client'
        ? 'The Xero application configuration is invalid. Please contact Orbitan Support.'
        : `Xero returned an error: ${error}. Please try again or contact Orbitan Support.`;
      toast({ title: 'Xero Connection Failed', description: friendlyMessage, variant: 'destructive' });
      // Clean all OAuth callback params from URL
      const cbParams = new URLSearchParams(window.location.search);
      cbParams.delete('code');
      cbParams.delete('state');
      cbParams.delete('error');
      cbParams.delete('error_description');
      const cleanUrl = cbParams.toString()
        ? `${window.location.pathname}?${cbParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      return;
    }

    if (code && state) {
      setConnecting(true);
      base44.functions.invoke('xeroOAuth', { action: 'exchange_code', code, state })
        .then((res) => {
          if (res.data?.success) {
            toast({ title: 'Xero Connected', description: res.data.message });
            fetchXeroStatus();
          } else if (res.data?.requires_org_selection) {
            // Multiple Xero organisations — user must select one
            setXeroStatus((prev) => ({ ...prev, pending_org_selection: res.data.connections, pending_state: res.data.state }));
            toast({ title: 'Select Organisation', description: 'Choose which Xero organisation to connect.' });
          } else {
            toast({ title: 'Connection Failed', description: res.data?.error || 'Could not connect to Xero.', variant: 'destructive' });
          }
        })
        .catch((err) => {
          const e = classifyIntegrationError(err, { action: 'connect', service: 'xero' });
          toast({ title: e.title, description: e.message, variant: e.variant === 'error' ? 'destructive' : 'default' });
        })
        .finally(() => {
          setConnecting(false);
          // Clean ALL OAuth callback params from URL — preserve current path + other query params
          // (e.g. ?section=integration-hub when embedded in LeaderOrg)
          const cbParams = new URLSearchParams(window.location.search);
          cbParams.delete('code');
          cbParams.delete('state');
          cbParams.delete('error');
          cbParams.delete('error_description');
          const cleanUrl = cbParams.toString()
            ? `${window.location.pathname}?${cbParams.toString()}`
            : window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        });
    }
  }, [toast, fetchXeroStatus]);

  const handleConnect = async () => {
    if (!tenantId) {
      toast({ title: 'No Workspace Selected', description: 'Please select a workspace before connecting Xero.', variant: 'destructive' });
      return;
    }
    if (connecting) return; // Block duplicate clicks
    setConnecting(true);
    try {
      const res = await base44.functions.invoke('xeroOAuth', { action: 'get_auth_url', tenant_id: tenantId });
      const data = res.data;
      if (!data.configured) {
        toast({
          title: 'Xero Temporarily Unavailable',
          description: 'Xero integration is temporarily unavailable. Please try again later or contact Orbitan Support.',
        });
        return;
      }
      if (!data.auth_url || typeof data.auth_url !== 'string') {
        toast({ title: 'Connection Failed', description: 'Could not generate a valid Xero authorisation URL. Please try again.', variant: 'destructive' });
        return;
      }
      // Validate the URL host is Xero before redirecting (prevent open-redirect)
      let parsedUrl;
      try {
        parsedUrl = new URL(data.auth_url);
      } catch {
        toast({ title: 'Connection Failed', description: 'The generated authorisation URL is invalid. Please contact Orbitan Support.', variant: 'destructive' });
        return;
      }
      const ALLOWED_HOSTS = ['login.xero.com', 'identity.xero.com'];
      if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
        toast({ title: 'Connection Failed', description: 'The authorisation URL does not point to Xero. Aborting for security.', variant: 'destructive' });
        return;
      }
      // Full-page navigation to Xero consent — use assign() for reliability
      window.location.assign(data.auth_url);
    } catch (err) {
      const e = classifyIntegrationError(err, { action: 'connect', service: 'xero' });
      toast({ title: e.title, description: e.message, variant: e.variant === 'error' ? 'destructive' : 'default' });
    } finally {
      setConnecting(false);
    }
  };

  const handleSelectOrg = async (xeroTenantId, xeroTenantName) => {
    const state = xeroStatus?.pending_state;
    if (!state) {
      toast({ title: 'Session Expired', description: 'Please reconnect Xero to continue.', variant: 'destructive' });
      return;
    }
    setConnecting(true);
    try {
      const res = await base44.functions.invoke('xeroOAuth', {
        action: 'select_organisation',
        state,
        xero_tenant_id: xeroTenantId,
      });
      if (res.data?.success) {
        toast({ title: 'Xero Connected', description: `Connected to ${xeroTenantName || 'your Xero organisation'}.` });
        setXeroStatus((prev) => ({ ...prev, pending_org_selection: null }));
        fetchXeroStatus();
      }
    } catch (err) {
      const e = classifyIntegrationError(err, { action: 'connect', service: 'xero' });
      toast({ title: e.title, description: e.message, variant: e.variant === 'error' ? 'destructive' : 'default' });
    } finally {
      setConnecting(false);
      const cbParams = new URLSearchParams(window.location.search);
      cbParams.delete('code');
      cbParams.delete('state');
      cbParams.delete('error');
      cbParams.delete('error_description');
      const cleanUrl = cbParams.toString()
        ? `${window.location.pathname}?${cbParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await base44.functions.invoke('xeroOAuth', { action: 'test_connection', tenant_id: tenantId });
      const d = res.data;
      setTestResult(d);
      toast({
        title: d.healthy ? 'Connection Healthy' : 'Connection Issue',
        description: d.message,
        variant: d.healthy ? undefined : 'destructive',
      });
      fetchXeroStatus();
    } catch (err) {
      const e = classifyIntegrationError(err, { action: 'test', service: 'xero' });
      const result = { healthy: false, reason: 'error', message: e.message };
      setTestResult(result);
      toast({ title: e.title, description: e.message, variant: e.variant === 'error' ? 'destructive' : 'default' });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Xero?\n\nAutomatic syncs will stop. Historical Orbitan records will remain. You can reconnect anytime.')) return;
    try {
      await base44.functions.invoke('xeroOAuth', { action: 'disconnect', tenant_id: tenantId });
      toast({ title: 'Xero Disconnected', description: 'Your Xero connection has been removed. Future syncs are paused.' });
      fetchXeroStatus();
    } catch (err) {
      const e = classifyIntegrationError(err, { action: 'disconnect', service: 'xero' });
      toast({ title: e.title, description: e.message, variant: e.variant === 'error' ? 'destructive' : 'default' });
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('integrationSync', { tenant_id: tenantId });
      const data = res.data;
      toast({ title: 'Sync Complete', description: `${data.synced} synced, ${data.failed} failed.` });
      fetchSyncQueue();
      fetchXeroStatus();
    } catch (err) {
      const e = classifyIntegrationError(err, { action: 'sync', service: 'xero' });
      toast({ title: e.title, description: e.message, variant: e.variant === 'error' ? 'destructive' : 'default' });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Build #28.2D — Workspace Context Resolution ──
  // Platform admins without a workspace tenant must select one.
  // Tenant users with a resolved workspace skip this entirely.
  const needsTenantSelection = isAdmin && !workspaceTenantId && !selectedTenantId;

  // ── Graceful Recovery (Priority 4) ──
  // If workspace truly can't be resolved (non-admin with no tenant),
  // never show a blank page — show recovery actions.
  const workspaceUnresolvable = !tenantId && !needsTenantSelection;

  if (workspaceUnresolvable) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 animate-fade-in max-w-2xl mx-auto">
        <PageHeader title="Integration Hub" />
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-xl bg-orbitan-amber-light flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-orbitan-amber-700" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg">Workspace unavailable</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We couldn&rsquo;t resolve your workspace context. This may happen after a session
                timeout or if your workspace assignment changed.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <Button variant="default" onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4" /> Reload Workspace
              </Button>
              <Button variant="outline" onClick={() => window.location.assign('/workspace')}>
                <Building2 className="w-4 h-4" /> Go to Workspace Switcher
              </Button>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              If this persists, contact your administrator or Orbitan Support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (needsTenantSelection) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 animate-fade-in max-w-2xl mx-auto">
        <PageHeader
          title="Integration Hub"
          subtitle="Select a workspace to manage its external service connections."
        />
        <Card>
          <CardContent className="p-6">
            {tenantsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading workspaces…</span>
              </div>
            ) : tenants.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <Building2 className="w-10 h-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No workspaces found. Onboard a tenant first to manage integrations.
                </p>
                <Button size="sm" onClick={() => window.location.assign('/onboarding')}>
                  <Plus className="w-3.5 h-3.5" /> Onboard Tenant
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Choose which workspace&rsquo;s integrations to manage. You can switch at any time.
                </p>
                {tenants.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTenantId(t.id)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/30 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-orbitan-blue-light flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-orbitan-blue" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {t.industry?.replace(/_/g, ' ')} · {t.subscription_plan?.replace('orbitan_', '')}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = xeroStatus?.status || 'not_connected';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.not_connected;
  const StatusIcon = statusConfig.icon;
  const connected = xeroStatus?.connected;
  const configured = xeroStatus?.configured;
  const pendingCount = xeroStatus?.pending_count ?? syncQueue.length;
  const failedCount = xeroStatus?.failed_count ?? 0;
  const syncHealth = xeroStatus?.sync_health || (connected ? 'healthy' : 'neutral');
  const lastSuccessfulSync = xeroStatus?.last_successful_sync;

  // ── Dashboard KPIs ──
  const connectedCount = connected ? 1 : 0;
  const disconnectedCount = !connected && status !== 'not_configured' ? 1 : 0;
  const expiredCount = status === 'expired' ? 1 : 0;
  const errorCount = status === 'error' ? 1 : (failedCount > 0 ? 1 : 0);

  const healthObject = {
    configured, connected, status,
    last_error: xeroStatus?.last_error,
    pending_count: pendingCount,
    failed_count: failedCount,
    sync_success_rate: xeroStatus?.sync_success_rate,
    testResult,
  };

  // ── Pending org selection state ──
  const pendingOrgs = xeroStatus?.pending_org_selection;

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="Integration Hub"
        subtitle="Connect external services and monitor sync health. Your data stays tenant-isolated."
      />

      {/* ── Build #28.2D — Admin Workspace Context Bar ── */}
      {isAdmin && selectedTenantId && !workspaceTenantId && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-orbitan-blue/30 bg-orbitan-blue-light/50 px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 text-orbitan-blue flex-shrink-0" />
            <span className="text-sm text-muted-foreground">Managing integrations for:</span>
            <span className="text-sm font-medium truncate">
              {tenants.find((t) => t.id === selectedTenantId)?.name || selectedTenantId}
            </span>
          </div>
          <Button size="sm" variant="ghost" className="text-xs gap-1.5 flex-shrink-0" onClick={() => setSelectedTenantId(null)}>
            Switch Workspace
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* ── KPI Dashboard ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <KPI icon={Plug} label="Connected" value={connectedCount} tone="green" />
        <KPI icon={PlugZap} label="Disconnected" value={disconnectedCount} tone="neutral" />
        <KPI icon={AlertCircle} label="Reconnect Required" value={expiredCount} tone="amber" />
        <KPI icon={XCircle} label="Action Required" value={errorCount} tone="red" />
        <KPI icon={Clock} label="Pending Sync" value={pendingCount} tone={pendingCount > 0 ? 'amber' : 'neutral'} />
        <KPI icon={AlertCircle} label="Failed Sync" value={failedCount} tone={failedCount > 0 ? 'red' : 'neutral'} />
        <KPI icon={CheckCircle2} label="Last Sync" value={lastSuccessfulSync ? new Date(lastSuccessfulSync).toLocaleDateString() : '—'} tone={lastSuccessfulSync ? 'green' : 'neutral'} />
        <KPI icon={Zap} label="Health" value={syncHealth.charAt(0).toUpperCase() + syncHealth.slice(1)} tone={syncHealth === 'healthy' ? 'green' : syncHealth === 'warning' ? 'amber' : 'neutral'} />
      </div>

      {/* ── Xero Connection Card ── */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-sky-600">X</span>
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg">Xero Accounting</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Connect your Xero organisation to sync approved invoices, bills, purchase orders, and labour-cost journals.
                </p>
              </div>
            </div>
            <Badge className={cn(statusConfig.bg, statusConfig.color, statusConfig.border, 'border flex-shrink-0')}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* ── Organisation selection (multiple Xero orgs) ── */}
          {pendingOrgs && pendingOrgs.length > 0 && (
            <div className="space-y-3 mb-4">
              <div className="rounded-lg border border-orbitan-blue/30 bg-orbitan-blue-light/50 p-4">
                <p className="text-sm font-medium text-foreground mb-2">Select a Xero Organisation</p>
                <p className="text-xs text-muted-foreground mb-3">You have multiple Xero organisations. Choose which one to connect to this workspace.</p>
                <div className="space-y-2">
                  {pendingOrgs.map((org) => (
                    <button
                      key={org.tenantId}
                      type="button"
                      onClick={() => handleSelectOrg(org.tenantId, org.tenantName)}
                      disabled={connecting}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium">{org.tenantName || 'Unnamed Organisation'}</p>
                        <p className="text-xs text-muted-foreground">{org.tenantType || 'Organisation'}</p>
                      </div>
                      {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Connected state ── */}
          {(connected || status === 'expired' || status === 'error') && !pendingOrgs && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Connected Organisation</p>
                  <p className="font-medium">{xeroStatus.xero_tenant_name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Connected Date</p>
                  <p className="font-medium">{xeroStatus.connected_date ? new Date(xeroStatus.connected_date).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Successful Sync</p>
                  <p className="font-medium">{xeroStatus.last_successful_sync ? new Date(xeroStatus.last_successful_sync).toLocaleString() : 'No sync yet'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Token Health</p>
                  <p className="font-medium">
                    {xeroStatus.token_expires_at
                      ? `Valid until ${new Date(xeroStatus.token_expires_at).toLocaleString()}`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending / Failed Items</p>
                  <p className="font-medium">{pendingCount} pending · {failedCount} failed</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Overall Health</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-md font-medium border', HEALTH_BADGE[syncHealth] || 'bg-muted text-muted-foreground border-border')}>
                    {syncHealth.charAt(0).toUpperCase() + syncHealth.slice(1)} · {xeroStatus.sync_success_rate ?? (connected ? 100 : 0)}% success
                  </span>
                </div>
              </div>

              {/* Privacy reassurance */}
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-orbitan-green" />
                <span>
                  Orbitan never receives your Xero password. You may disconnect at any time.
                  Only authorised tenant administrators can manage this connection.
                </span>
              </div>

              {/* Actions — gated by state + role */}
              {canManage ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {status === 'expired' ? (
                    <Button onClick={handleConnect} disabled={connecting}>
                      {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Reconnect Xero
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        Test Connection
                      </Button>
                      <Button variant="outline" onClick={handleSyncNow} disabled={syncing || !connected}>
                        {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Sync Now
                      </Button>
                      <Button variant="outline" onClick={handleDisconnect}>
                        <Link2Off className="w-4 h-4" />
                        Disconnect
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Only Tenant Administrators can manage this connection.</p>
              )}
            </div>
          )}

          {/* ── Never connected (platform is configured) ── */}
          {status === 'not_connected' && configured !== false && !pendingOrgs && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Xero organisation to automatically sync sales invoices, purchase order bills, and
                labour cost journals. You will sign in securely on Xero — Orbitan never receives your password.
              </p>
              {canManage ? (
                <Button onClick={handleConnect} disabled={connecting}>
                  {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Connect Xero
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Ask your Tenant Administrator to connect Xero.</p>
              )}
            </div>
          )}

          {/* ── Temporarily Unavailable (platform not configured) ── */}
          {(configured === false || status === 'not_configured') && !pendingOrgs && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Xero integration is temporarily unavailable. Please try again later or contact Orbitan Support.
              </p>
              {canManage && (
                <Button disabled title="Xero is not yet available">
                  <Clock className="w-4 h-4" />
                  Temporarily Unavailable
                </Button>
              )}
              <div className="flex items-center gap-2">
                <a href="/support" className="inline-flex items-center gap-1.5 text-xs text-orbitan-blue hover:underline">
                  <LifeBuoy className="w-3.5 h-3.5" /> Contact Orbitan Support
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Sync Queue ── */}
      <Card className="mt-6" id="sync-queue">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg">Sync Queue</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Financial records waiting to sync to Xero.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleSyncNow} disabled={syncing || syncQueue.length === 0 || !connected}>
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Sync Now
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {syncQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No pending sync entries. Verified invoices and received POs will appear here.
            </p>
          ) : (
            <div className="space-y-2">
              {syncQueue.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-2 px-3 rounded-lg border border-border bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{entry.queue_type?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.source_entity} · S${entry.financial_impact_sgd?.toFixed(2) || '0.00'} · {entry.priority}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs text-muted-foreground">Pending</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Stripe Platform Billing (separate, unchanged) ── */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                <span className="text-lg font-bold text-violet-600">S</span>
              </div>
              <div>
                <CardTitle className="text-lg">Stripe — Platform Billing</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Subscription billing for OrbitanOS plans. Managed by the platform owner.
                </p>
              </div>
            </div>
            <Badge className="bg-orbitan-green-light text-orbitan-green-700 border border-orbitan-green/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Platform Billing handles OrbitanOS subscriptions only. It is architecturally separate from tenant payment processing.
          </p>
        </CardContent>
      </Card>

      {/* ── Stripe Tenant Connect (architecture locked, deferred) ── */}
      <Card className="mt-6 border-dashed">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center opacity-60">
                <span className="text-lg font-bold text-violet-600">S</span>
              </div>
              <div>
                <CardTitle className="text-lg">Stripe — Tenant Connect</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Connect your own Stripe account to accept payments, payouts, and refunds.
                </p>
              </div>
            </div>
            <Badge className="bg-amber-50 text-amber-600 border border-amber-200">
              <Clock className="w-3 h-3 mr-1" />
              Architecture Locked — Deferred
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Each tenant connects and owns their own Stripe account. Implementation is deferred to a future build.
          </p>
        </CardContent>
      </Card>

      {/* ── Platform Diagnostics (admin only, collapsible) ── */}
      {isAdmin && (
        <Card className="mt-6">
          <CardHeader>
            <button
              type="button"
              onClick={() => setShowDiagnostics((v) => !v)}
              className="flex items-center gap-3 w-full text-left"
              aria-expanded={showDiagnostics}
            >
              <div className="w-10 h-10 rounded-lg bg-orbitan-purple-light flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-orbitan-purple-700" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Platform Integration Diagnostics</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Configuration health — secrets are never exposed.</p>
              </div>
              {showDiagnostics ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </button>
          </CardHeader>
          {showDiagnostics && (
            <CardContent>
              {!platformConfig ? (
                <p className="text-sm text-muted-foreground py-3">Loading configuration readiness…</p>
              ) : (
                <div className="space-y-5">
                  {/* Environment */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm font-medium">Environment</span>
                    <Badge className={platformConfig.environment === 'live' ? 'bg-orbitan-green-light text-orbitan-green-700 border-orbitan-green/30' : 'bg-orbitan-amber-light text-orbitan-amber-700 border-orbitan-amber/30'}>
                      {platformConfig.environment === 'live' ? 'Live' : platformConfig.environment === 'test' ? 'Test' : 'Unconfigured'}
                    </Badge>
                  </div>

                  {/* Xero readiness */}
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium mb-2">Xero Application Readiness</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <ReadyDot ok={platformConfig.xero.client_id_configured} label="Client ID configured" />
                      <ReadyDot ok={platformConfig.xero.client_secret_configured} label="Client Secret configured" />
                      <ReadyDot ok={platformConfig.xero.redirect_uri_configured} label="Redirect URI configured" />
                      <ReadyDot ok={platformConfig.xero.token_encryption_enabled} label="Token encryption enabled" />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                      <p>Redirect URI: <code className="bg-background px-1 rounded">{platformConfig.xero.redirect_uri}</code></p>
                      <p>Required scopes: <code className="bg-background px-1 rounded">{platformConfig.xero.required_scopes.join(', ')}</code></p>
                    </div>
                    {!platformConfig.xero.oauth_ready && (
                      <p className="text-xs text-amber-700 mt-2">
                        Application credentials are missing. Configure them in the deployment environment's secret manager. Secret values are never exposed in the UI.
                      </p>
                    )}
                  </div>

                  {/* Stripe Platform Billing readiness */}
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium mb-2">Stripe Platform Billing Readiness</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <ReadyDot ok={platformConfig.stripe_platform_billing.secret_key_configured} label="Secret Key" />
                      <ReadyDot ok={platformConfig.stripe_platform_billing.publishable_key_configured} label="Publishable Key" />
                      <ReadyDot ok={platformConfig.stripe_platform_billing.webhook_secret_configured} label="Webhook Secret" />
                    </div>
                  </div>

                  {/* Stripe Connect readiness (deferred) */}
                  <div className="rounded-lg border border-dashed border-border p-3">
                    <p className="text-sm font-medium mb-2">Stripe Connect Readiness (Deferred)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <ReadyDot ok={platformConfig.stripe_connect.client_id_configured} label="Connect Client ID" />
                      <ReadyDot ok={platformConfig.stripe_connect.architecture_locked} label="Architecture locked (ADR-0055)" />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <ShieldCheck className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span>Secrets are managed securely out-of-band. The UI never displays secret values, partial values, or tokens.</span>
                  </p>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Full Integration Catalog ── */}
      <IntegrationCatalog />
    </div>
  );
}