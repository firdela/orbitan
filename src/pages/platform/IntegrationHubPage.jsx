// ============================================================
// ORBITANOS — Integration Hub (Build #26A)
// Operational integration dashboard: KPIs, health, Xero diagnostics,
// sync queue, Stripe architecture lock, admin platform config.
// Reuses xeroOAuth, integrationSync, IntegrationCredential,
// FinanceSyncQueue, AuditLog, RBAC/RLS. No competing framework.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw, ExternalLink, Zap, Clock,
  Plug, PlugZap, Activity, ShieldCheck, Settings, ArrowDownToLine, Link2Off,
} from 'lucide-react';
import IntegrationCatalog from '@/components/platform/IntegrationCatalog';
import IntegrationHealthPanel from '@/components/platform/IntegrationHealthPanel';
import { cn } from '@/lib/utils';
import { classifyIntegrationError } from '@/lib/integration-errors';

const STATUS_CONFIG = {
  connected: { icon: CheckCircle2, color: 'text-orbitan-green', bg: 'bg-orbitan-green-light', border: 'border-orbitan-green/30', label: 'Connected' },
  disconnected: { icon: XCircle, color: 'text-orbitan-red-700', bg: 'bg-orbitan-red-light', border: 'border-orbitan-red/30', label: 'Disconnected' },
  expired: { icon: AlertCircle, color: 'text-orbitan-amber-700', bg: 'bg-orbitan-amber-light', border: 'border-orbitan-amber/30', label: 'Reconnection Required' },
  error: { icon: AlertCircle, color: 'text-orbitan-red-700', bg: 'bg-orbitan-red-light', border: 'border-orbitan-red/30', label: 'Connection Error' },
  not_connected: { icon: AlertCircle, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', label: 'Never Connected' },
  not_configured: { icon: Settings, color: 'text-orbitan-amber-700', bg: 'bg-orbitan-amber-light', border: 'border-orbitan-amber/30', label: 'Platform Setup Required' },
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
  const tenantId = user?.data?.tenant_id || user?.tenant_id;
  const isAdmin = user?.role === 'admin';
  const canManage = ['admin', 'tenant_admin'].includes(user?.role);

  const [xeroStatus, setXeroStatus] = useState(null);
  const [platformConfig, setPlatformConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncQueue, setSyncQueue] = useState([]);

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

  // ── Handle OAuth callback redirect (?code=...&state=tenant_id) ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const stateTenantId = params.get('state');
    if (code && stateTenantId && stateTenantId === tenantId) {
      setConnecting(true);
      base44.functions.invoke('xeroOAuth', { action: 'exchange_code', code, tenant_id: stateTenantId })
        .then((res) => {
          if (res.data?.success) {
            toast({ title: 'Xero Connected', description: res.data.message });
            fetchXeroStatus();
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
          window.history.replaceState({}, document.title, '/platform/integrations');
        });
    }
  }, [tenantId, toast, fetchXeroStatus]);

  const handleConnect = async () => {
    if (!tenantId) {
      toast({ title: 'No Workspace Selected', description: 'Please select a workspace before connecting Xero.', variant: 'destructive' });
      return;
    }
    setConnecting(true);
    try {
      const res = await base44.functions.invoke('xeroOAuth', { action: 'get_auth_url', tenant_id: tenantId });
      const data = res.data;
      if (!data.configured) {
        toast({
          title: 'Xero Not Yet Configured',
          description: 'The platform administrator needs to add the OAuth credentials before you can connect. This is a one-time setup step.',
        });
        return;
      }
      if (data.auth_url) window.location.href = data.auth_url;
    } catch (err) {
      const e = classifyIntegrationError(err, { action: 'connect', service: 'xero' });
      toast({ title: e.title, description: e.message, variant: e.variant === 'error' ? 'destructive' : 'default' });
    } finally {
      setConnecting(false);
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
    try {
      await base44.functions.invoke('xeroOAuth', { action: 'disconnect', tenant_id: tenantId });
      toast({ title: 'Xero Disconnected', description: 'Your Xero connection has been removed.' });
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

  const status = xeroStatus?.status || 'not_connected';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.not_connected;
  const StatusIcon = statusConfig.icon;
  const connected = xeroStatus?.connected;
  const configured = xeroStatus?.configured;
  const pendingCount = xeroStatus?.pending_count ?? syncQueue.length;
  const failedCount = xeroStatus?.failed_count ?? 0;
  const syncHealth = xeroStatus?.sync_health || (connected ? 'healthy' : 'critical');

  // ── Dashboard KPIs ──
  const connectedCount = connected ? 1 : 0;
  const disconnectedCount = status === 'disconnected' ? 1 : 0;
  const expiredCount = status === 'expired' ? 1 : 0;
  const errorCount = status === 'error' ? 1 : (failedCount > 0 ? 1 : 0);
  const lastSuccessfulSync = xeroStatus?.last_successful_sync;

  const healthObject = {
    configured, connected, status,
    last_error: xeroStatus?.last_error,
    pending_count: pendingCount,
    failed_count: failedCount,
    sync_success_rate: xeroStatus?.sync_success_rate,
    testResult,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="Integration Hub"
        subtitle="Connect external services and monitor sync health. Finance teams link their own accounts — data stays tenant-isolated."
      />

      {/* ── KPI Dashboard ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <KPI icon={Plug} label="Connected" value={connectedCount} tone="green" />
        <KPI icon={PlugZap} label="Disconnected" value={disconnectedCount} tone="red" />
        <KPI icon={AlertCircle} label="Expired" value={expiredCount} tone="amber" />
        <KPI icon={XCircle} label="Errors" value={errorCount} tone="red" />
        <KPI icon={Clock} label="Pending Sync" value={pendingCount} tone={pendingCount > 0 ? 'amber' : 'neutral'} />
        <KPI icon={AlertCircle} label="Failed Sync" value={failedCount} tone={failedCount > 0 ? 'red' : 'neutral'} />
        <KPI icon={CheckCircle2} label="Last Sync" value={lastSuccessfulSync ? new Date(lastSuccessfulSync).toLocaleDateString() : '—'} tone={lastSuccessfulSync ? 'green' : 'neutral'} />
        <KPI icon={Activity} label="Health" value={syncHealth.charAt(0).toUpperCase() + syncHealth.slice(1)} tone={syncHealth === 'healthy' ? 'green' : syncHealth === 'warning' ? 'amber' : 'red'} />
      </div>

      {/* ── Integration Health ── */}
      <div className="mt-6">
        <IntegrationHealthPanel health={healthObject} loading={testing} />
      </div>

      {/* ── Platform Setup Required banner (when Xero not configured) ── */}
      {configured === false && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900">Platform Setup Required</h3>
            <p className="text-sm text-amber-800 mt-1">
              The Xero OAuth app credentials haven&rsquo;t been added yet. A platform admin must add
              <code className="px-1 py-0.5 bg-amber-100 rounded mx-1 text-xs">XERO_CLIENT_ID</code> and
              <code className="px-1 py-0.5 bg-amber-100 rounded mx-1 text-xs">XERO_CLIENT_SECRET</code> in
              Base44 Settings → Environment Variables. See the Platform Integration Settings section below
              for the exact redirect URI and required scopes.
            </p>
          </div>
        </div>
      )}

      {/* ── Xero Card ── */}
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
                  Sync invoices, bills, and labour cost journals to your Xero organisation.
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
          {/* Connected / expired / error state — enriched metadata */}
          {(connected || status === 'expired' || status === 'error') && (
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
                  <p className="text-xs text-muted-foreground">Last Token Refresh</p>
                  <p className="font-medium">{xeroStatus.last_refreshed ? new Date(xeroStatus.last_refreshed).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending / Failed Items</p>
                  <p className="font-medium">{pendingCount} pending · {failedCount} failed</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Overall Health</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-md font-medium border', HEALTH_BADGE[syncHealth])}>
                    {syncHealth.charAt(0).toUpperCase() + syncHealth.slice(1)} · {xeroStatus.sync_success_rate ?? (connected ? 100 : 0)}% success
                  </span>
                </div>
                {xeroStatus.last_error && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Last Error</p>
                    <p className="font-medium text-orbitan-red-700 text-xs">{xeroStatus.last_error}</p>
                  </div>
                )}
              </div>

              {/* Actions — gated by state + role */}
              {canManage && (
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
              )}
              {!canManage && (
                <p className="text-xs text-muted-foreground">Only Tenant Admins and Platform Admins can manage this connection.</p>
              )}
            </div>
          )}

          {/* Never connected state */}
          {status === 'not_connected' && configured !== false && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Xero account to automatically sync sales invoices, purchase order bills, and
                labour cost journals. Each organisation links their own Xero — your data stays isolated.
              </p>
              {canManage ? (
                <Button onClick={handleConnect} disabled={connecting}>
                  {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Connect Xero
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Ask your Tenant Admin to connect Xero.</p>
              )}
            </div>
          )}

          {/* Not configured state — Xero OAuth credentials missing */}
          {status === 'not_connected' && configured === false && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Xero is not yet configured at the platform level. Once the Platform Owner adds the OAuth
                credentials, finance teams can connect instantly.
              </p>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1.5">What the Platform Owner must configure:</p>
                <ul className="space-y-1">
                  <li>• Register a Xero OAuth 2.0 app at developer.xero.com</li>
                  <li>• Set the redirect URI to <code className="bg-background px-1 rounded">{'{your app origin}'}/platform/integrations</code></li>
                  <li>• Add <code className="bg-background px-1 rounded">XERO_CLIENT_ID</code> and <code className="bg-background px-1 rounded">XERO_CLIENT_SECRET</code> in Base44 Settings → Environment Variables</li>
                </ul>
              </div>
              {canManage && (
                <Button disabled title="Xero OAuth credentials have not been added by the Platform Owner">
                  <Settings className="w-4 h-4" />
                  Configuration Required
                </Button>
              )}
            </div>
          )}

          {/* Platform Setup Required state */}
          {status === 'not_configured' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Xero is not yet configured at the platform level. Once the Platform Owner adds the OAuth
                credentials, finance teams can connect instantly.
              </p>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1.5">What the Platform Owner must configure:</p>
                <ul className="space-y-1">
                  <li>• Register a Xero OAuth 2.0 app at developer.xero.com</li>
                  <li>• Set the redirect URI to <code className="bg-background px-1 rounded">{'{your app origin}'}/platform/integrations</code></li>
                  <li>• Add <code className="bg-background px-1 rounded">XERO_CLIENT_ID</code> and <code className="bg-background px-1 rounded">XERO_CLIENT_SECRET</code> in Base44 Settings → Environment Variables</li>
                </ul>
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
                  Subscription billing for OrbitanOS plans. Managed by the platform owner. Separate from tenant payment processing.
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
            Platform Billing handles OrbitanOS subscriptions only. It is architecturally separate from tenant Stripe Connect and must never be mixed with tenant payment processing.
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
                  Connect your own Stripe account to accept payments, payouts, and refunds. Standard connected accounts.
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
            Tenant Stripe Connect uses <span className="font-medium">Standard connected accounts</span>: each tenant connects and owns their own Stripe account; Stripe handles identity verification and payouts; OrbitanOS synchronises authorised operational data. One Stripe connected account per tenant for the MVP. Tenant isolation, webhook idempotency, and signature verification are mandatory.
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Implementation is deferred to Build #26B (pending <code className="bg-background px-1 rounded">STRIPE_CONNECT_CLIENT_ID</code> registration). The onboarding mechanism will follow Stripe&rsquo;s officially supported approach at implementation time.
          </p>
        </CardContent>
      </Card>

      {/* ── Platform Integration Settings (admin only) ── */}
      {isAdmin && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orbitan-purple-light flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-orbitan-purple-700" />
              </div>
              <div>
                <CardTitle className="text-lg">Platform Integration Settings</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Configuration readiness only — secrets are never exposed or edited here.</p>
              </div>
            </div>
          </CardHeader>
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
                  <p className="text-sm font-medium mb-2">Xero Readiness</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <ReadyDot ok={platformConfig.xero.client_id_configured} label="XERO_CLIENT_ID configured" />
                    <ReadyDot ok={platformConfig.xero.client_secret_configured} label="XERO_CLIENT_SECRET configured" />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                    <p>Redirect URI: <code className="bg-background px-1 rounded">{platformConfig.xero.redirect_uri}</code></p>
                    <p>Required scopes: <code className="bg-background px-1 rounded">{platformConfig.xero.required_scopes.join(', ')}</code></p>
                  </div>
                  {!platformConfig.xero.oauth_ready && (
                    <p className="text-xs text-amber-700 mt-2">
                      Missing credentials. Add them in Base44 Settings → Environment Variables. The app never exposes secret values.
                    </p>
                  )}
                </div>

                {/* Stripe Platform Billing readiness */}
                <div className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium mb-2">Stripe Platform Billing Readiness</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <ReadyDot ok={platformConfig.stripe_platform_billing.secret_key_configured} label="STRIPE_SECRET_KEY" />
                    <ReadyDot ok={platformConfig.stripe_platform_billing.publishable_key_configured} label="STRIPE_PUBLISHABLE_KEY" />
                    <ReadyDot ok={platformConfig.stripe_platform_billing.webhook_secret_configured} label="STRIPE_WEBHOOK_SECRET" />
                  </div>
                </div>

                {/* Stripe Connect readiness (deferred) */}
                <div className="rounded-lg border border-dashed border-border p-3">
                  <p className="text-sm font-medium mb-2">Stripe Connect Readiness (Deferred)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <ReadyDot ok={platformConfig.stripe_connect.client_id_configured} label="STRIPE_CONNECT_CLIENT_ID" />
                    <ReadyDot ok={platformConfig.stripe_connect.architecture_locked} label="Architecture locked (ADR-0055)" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Onboarding model: {platformConfig.stripe_connect.onboarding_model}. Implementation deferred to Build #26B.
                  </p>
                </div>

                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <ShieldCheck className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span>To add or rotate credentials, use Base44 Settings → Environment Variables. Secret values are managed securely out-of-band and never exposed in the UI.</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Full Integration Catalog ── */}
      <IntegrationCatalog />
    </div>
  );
}