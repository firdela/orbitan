// ============================================================
// FinanceIntegrationPage — workspace Xero connection + sync (Parts D/E/H)
// Reuses xeroOAuth, financeSyncProcessor, AccountMapping, FinanceSyncQueue.
// Honest: live authorisation pending until XERO_CLIENT_ID/SECRET configured.
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import AccountMappingManager from '@/components/finance/AccountMappingManager';
import { Loader2, RefreshCw, Plug, PlugZap, ShieldCheck, AlertTriangle, RotateCw, ExternalLink } from 'lucide-react';
import { classifyIntegrationError } from '@/lib/integration-errors';

const STATUS_META = {
  not_connected: { label: 'Not Connected', color: 'text-muted-foreground' },
  not_configured: { label: 'Not Configured', color: 'text-muted-foreground' },
  connected: { label: 'Connected', color: 'text-orbitan-green' },
  expired: { label: 'Expired — Reconnect', color: 'text-orbitan-amber' },
  disconnected: { label: 'Disconnected', color: 'text-muted-foreground' },
  error: { label: 'Error', color: 'text-orbitan-red' },
};

export default function FinanceIntegrationPage() {
  const { tenantId } = useOutletContext() || {};
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const canManage = ['admin', 'tenant_admin'].includes(user?.role);

  const loadStatus = useCallback(async () => {
    if (!tenantId) return;
    setLoadingStatus(true);
    try {
      const res = await base44.functions.invoke('xeroOAuth', { action: 'get_status', tenant_id: tenantId });
      setStatus(res.data || res);
    } catch (e) { setStatus(null); } finally { setLoadingStatus(false); }
  }, [tenantId]);

  const loadQueue = useCallback(async () => {
    if (!tenantId) { setLoadingQueue(false); return; }
    try {
      const data = await base44.entities.FinanceSyncQueue.filter({ tenant_id: tenantId }, '-created_date', 50);
      setQueue(data || []);
    } catch { setQueue([]); } finally { setLoadingQueue(false); }
  }, [tenantId]);

  useEffect(() => { loadStatus(); loadQueue(); }, [loadStatus, loadQueue]);

  const handleConnect = async () => {
    if (!tenantId) {
      toast({ title: 'No Workspace Selected', description: 'Please select a workspace before connecting Xero.', variant: 'destructive' });
      return;
    }
    setConnecting(true);
    try {
      const res = await base44.functions.invoke('xeroOAuth', { action: 'get_auth_url', tenant_id: tenantId });
      const data = res.data || res;
      if (!data.configured) {
        toast({
          title: 'Xero Not Yet Configured',
          description: 'The platform administrator needs to add the OAuth credentials before you can connect. This is a one-time setup step.',
          variant: 'default',
        });
        return;
      }
      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (e) {
      const err = classifyIntegrationError(e, { action: 'connect', service: 'xero' });
      toast({ title: err.title, description: err.message, variant: err.variant === 'error' ? 'destructive' : 'default' });
    } finally { setConnecting(false); }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Xero? Future syncs will be skipped until reconnected.')) return;
    try {
      await base44.functions.invoke('xeroOAuth', { action: 'disconnect', tenant_id: tenantId });
      toast({ title: 'Xero disconnected' });
      loadStatus();
    } catch (e) { toast({ title: 'Disconnect failed', description: e?.message, variant: 'destructive' }); }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('financeSyncProcessor', { tenant_id: tenantId });
      const data = res.data || res;
      toast({ title: 'Sync processed', description: `${data.synced || 0} synced · ${data.skipped || 0} skipped · ${data.failed || 0} failed · ${data.routed_to_review || 0} review` });
      loadQueue();
    } catch (e) {
      const err = classifyIntegrationError(e, { action: 'sync', service: 'xero' });
      toast({ title: err.title, description: err.message, variant: err.variant === 'error' ? 'destructive' : 'default' });
    } finally { setSyncing(false); }
  };

  const handleRetry = async (entryId) => {
    try {
      await base44.entities.FinanceSyncQueue.update(entryId, { status: 'pending', last_error: '' });
      toast({ title: 'Queued for retry' });
      loadQueue();
    } catch (e) {
      const err = classifyIntegrationError(e, { action: 'sync', service: 'xero' });
      toast({ title: err.title, description: err.message, variant: err.variant === 'error' ? 'destructive' : 'default' });
    }
  };

  // OAuth callback handling: if URL has ?code, exchange it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const stateTenant = params.get('state');
    if (code && stateTenant && stateTenant === tenantId) {
      (async () => {
        try {
          const res = await base44.functions.invoke('xeroOAuth', { action: 'exchange_code', tenant_id: stateTenant, code, redirect_uri: window.location.origin + window.location.pathname });
          const data = res.data || res;
          if (data.success) {
            toast({ title: 'Xero connected', description: `Connected to ${data.xero_tenant_name || 'Xero'}` });
          } else if (data.error) {
            toast({ title: 'Connection failed', description: data.error, variant: 'destructive' });
          }
          // clean URL
          window.history.replaceState({}, '', window.location.pathname);
          loadStatus();
        } catch (e) {
          const err = classifyIntegrationError(e, { action: 'connect', service: 'xero' });
          toast({ title: err.title, description: err.message, variant: err.variant === 'error' ? 'destructive' : 'default' });
        }
      })();
    }
  }, [tenantId]);

  const st = status?.status || 'not_connected';
  const meta = STATUS_META[st] || STATUS_META.not_connected;
  const failedItems = queue.filter(q => q.status === 'failed');
  const syncedCount = queue.filter(q => q.status === 'synced').length;
  const pendingCount = queue.filter(q => q.status === 'pending').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in space-y-6">
      <PageHeader
        title="Finance Integration"
        subtitle="Xero connection · account mapping · sync queue"
        help={{
          title: 'Finance Integration',
          content: 'Connect your company Xero organisation, configure account mappings, and sync operational data (sales, purchases, production, waste) to your accounting ledger. Each Orbitan company connects its own Xero organisation — no shared connection.',
          tips: [
            'Only company administrators can connect or manage Xero.',
            'Complete all account mappings before enabling automatic sync.',
            'The sync queue is tenant-isolated; failed items can be retried.',
          ],
        }}
      />

      {/* Connection Card */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status?.connected ? 'bg-orbitan-green-light' : 'bg-muted'}`}>
              {status?.connected ? <PlugZap className="w-5 h-5 text-orbitan-green" /> : <Plug className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div>
              <h3 className="font-heading font-semibold text-sm">Xero Connection</h3>
              <p className="text-xs text-muted-foreground">
                {loadingStatus ? 'Checking…' : (
                  <span className={meta.color}>{meta.label}
                    {status?.xero_tenant_name && status?.connected && ` · ${status.xero_tenant_name}`}
                  </span>
                )}
              </p>
            </div>
          </div>
          {canManage && (
            <div className="flex gap-2 flex-wrap">
              {!status?.connected && (
                <Button size="sm" className="gap-1.5" onClick={handleConnect} disabled={connecting}>
                  {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />} Connect Xero
                </Button>
              )}
              {status?.connected && (
                <>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={handleConnect} disabled={connecting}>
                    <RefreshCw className="w-3.5 h-3.5" /> Reconnect
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={handleSyncNow} disabled={syncing}>
                    {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />} Sync Now
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDisconnect}>Disconnect</Button>
                </>
              )}
            </div>
          )}
        </div>

        {status && !status.configured && (
          <div className="mt-4 bg-orbitan-amber-light border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{status.message || 'Xero integration is not configured yet. The platform admin must add XERO_CLIENT_ID and XERO_CLIENT_SECRET secrets. Once added, finance teams can connect their Xero organisation here.'}</span>
          </div>
        )}

        {status?.connected && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div><p className="text-muted-foreground">Organisation</p><p className="font-medium truncate">{status.xero_tenant_name || '—'}</p></div>
            <div><p className="text-muted-foreground">Connected Date</p><p className="font-medium">{status.connected_date ? new Date(status.connected_date).toLocaleDateString() : '—'}</p></div>
            <div><p className="text-muted-foreground">Last Refresh</p><p className="font-medium">{status.last_refreshed ? new Date(status.last_refreshed).toLocaleString() : '—'}</p></div>
            <div><p className="text-muted-foreground">Token Expires</p><p className="font-medium">{status.token_expires_at ? new Date(status.token_expires_at).toLocaleString() : '—'}</p></div>
            {status.last_error && <div className="col-span-2 sm:col-span-4"><p className="text-muted-foreground">Last Error</p><p className="font-medium text-orbitan-red">{status.last_error}</p></div>}
          </div>
        )}
      </div>

      {/* Sync Queue Summary + Failed Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3"><ShieldCheck className="w-4 h-4 text-orbitan-blue" /><h3 className="font-heading font-semibold text-sm">Sync Queue</h3></div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-2xl font-display font-bold text-orbitan-blue">{pendingCount}</p><p className="text-xs text-muted-foreground">Pending</p></div>
            <div><p className="text-2xl font-display font-bold text-orbitan-green">{syncedCount}</p><p className="text-xs text-muted-foreground">Synced</p></div>
            <div><p className="text-2xl font-display font-bold text-orbitan-red">{failedItems.length}</p><p className="text-xs text-muted-foreground">Failed</p></div>
          </div>
        </div>
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3"><h3 className="font-heading font-semibold text-sm">Sync History</h3>{canManage && status?.connected && <Button size="sm" variant="outline" className="text-xs" onClick={handleSyncNow} disabled={syncing}>{syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}Sync Now</Button>}</div>
          {loadingQueue ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            : queue.length === 0 ? <EmptyState icon={RefreshCw} title="No sync activity yet" description="Sales, purchases, and production will appear here as they queue for Xero." color="blue" />
            : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {queue.slice(0, 20).map(q => (
                  <div key={q.id} className="flex items-center justify-between text-xs border-b border-border/50 py-1.5">
                    <div className="min-w-0">
                      <span className="font-medium">{q.queue_type?.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground ml-1">· {q.source_entity}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={q.status} />
                      {q.status === 'failed' && canManage && <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => handleRetry(q.id)}>Retry</Button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* Account Mapping */}
      <AccountMappingManager tenantId={tenantId} />

      {!canManage && (
        <div className="bg-muted/50 border border-border rounded-xl p-4 text-xs text-muted-foreground">
          Only company administrators can connect Xero or manage finance sync settings.
        </div>
      )}
    </div>
  );
}