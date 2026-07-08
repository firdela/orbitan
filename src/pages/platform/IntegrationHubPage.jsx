import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw, ExternalLink, Zap, ArrowRight, Clock } from 'lucide-react';

const STATUS_CONFIG = {
  connected: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Connected' },
  disconnected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Disconnected' },
  expired: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Token Expired — Reconnect' },
  error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Error' },
  not_connected: { icon: AlertCircle, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', label: 'Not Connected' },
  not_configured: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Not Configured' },
};

export default function IntegrationHubPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const tenantId = user?.data?.tenant_id || user?.tenant_id;

  const [xeroStatus, setXeroStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncQueue, setSyncQueue] = useState([]);

  const fetchXeroStatus = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res = await base44.functions.invoke('xeroOAuth', {
        action: 'get_status',
        tenant_id: tenantId,
      });
      setXeroStatus(res.data);
    } catch (err) {
      console.error('Xero status error:', err);
      setXeroStatus({ connected: false, configured: false, status: 'not_configured' });
    }
  }, [tenantId]);

  const fetchSyncQueue = useCallback(async () => {
    if (!tenantId) return;
    try {
      const entries = await base44.entities.FinanceSyncQueue.filter({
        tenant_id: tenantId,
        status: 'pending',
      });
      setSyncQueue(entries || []);
    } catch (err) {
      console.error('Sync queue error:', err);
    }
  }, [tenantId]);

  useEffect(() => {
    Promise.all([fetchXeroStatus(), fetchSyncQueue()]).finally(() => setLoading(false));
  }, [fetchXeroStatus, fetchSyncQueue]);

  // ── Handle OAuth callback redirect (?code=...&state=tenant_id) ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const stateTenantId = params.get('state');

    if (code && stateTenantId && stateTenantId === tenantId) {
      setConnecting(true);
      base44.functions.invoke('xeroOAuth', {
        action: 'exchange_code',
        code,
        tenant_id: stateTenantId,
      })
        .then((res) => {
          if (res.data?.success) {
            toast({ title: 'Xero Connected', description: res.data.message });
            fetchXeroStatus();
          } else {
            toast({ title: 'Connection Failed', description: res.data?.error || 'Could not connect to Xero.', variant: 'destructive' });
          }
        })
        .catch((err) => {
          toast({ title: 'Connection Failed', description: err?.message || 'OAuth exchange failed.', variant: 'destructive' });
        })
        .finally(() => {
          setConnecting(false);
          // Clean URL
          window.history.replaceState({}, document.title, '/platform/integrations');
        });
    }
  }, [tenantId, toast, fetchXeroStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await base44.functions.invoke('xeroOAuth', {
        action: 'get_auth_url',
        tenant_id: tenantId,
      });
      const data = res.data;
      if (!data.configured) {
        toast({
          title: 'Xero Not Configured',
          description: 'Platform admin must add XERO_CLIENT_ID and XERO_CLIENT_SECRET secrets in dashboard settings first.',
          variant: 'destructive',
        });
        return;
      }
      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (err) {
      toast({ title: 'Failed', description: err?.message || 'Could not start Xero connection.', variant: 'destructive' });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await base44.functions.invoke('xeroOAuth', {
        action: 'disconnect',
        tenant_id: tenantId,
      });
      toast({ title: 'Xero Disconnected', description: 'Your Xero connection has been removed.' });
      fetchXeroStatus();
    } catch (err) {
      toast({ title: 'Failed', description: err?.message, variant: 'destructive' });
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('integrationSync', {
        tenant_id: tenantId,
      });
      const data = res.data;
      toast({
        title: `Sync Complete`,
        description: `${data.synced} synced, ${data.failed} failed.`,
      });
      fetchSyncQueue();
    } catch (err) {
      toast({ title: 'Sync Failed', description: err?.response?.data?.error || err?.message, variant: 'destructive' });
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="Integration Hub"
        subtitle="Connect external services. Finance teams can link their own accounts."
      />

      {/* Not configured warning */}
      {xeroStatus && !xeroStatus.configured && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900">Platform Setup Required</h3>
            <p className="text-sm text-amber-800 mt-1">
              The Xero OAuth app credentials haven't been added yet. A platform admin needs to add
              <code className="px-1 py-0.5 bg-amber-100 rounded mx-1 text-xs">XERO_CLIENT_ID</code>
              and
              <code className="px-1 py-0.5 bg-amber-100 rounded mx-1 text-xs">XERO_CLIENT_SECRET</code>
              in dashboard settings → environment variables. Once added, finance teams can connect
              their Xero account instantly.
            </p>
          </div>
        </div>
      )}

      {/* Xero Integration Card */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center">
                <span className="text-lg font-bold text-sky-600">X</span>
              </div>
              <div>
                <CardTitle className="text-lg">Xero Accounting</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Sync invoices, bills, and labour cost journals to your Xero organisation.
                </p>
              </div>
            </div>
            <Badge className={`${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {status === 'connected' || status === 'expired' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Xero Organisation</p>
                  <p className="font-medium">{xeroStatus.xero_tenant_name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Connected Date</p>
                  <p className="font-medium">{xeroStatus.connected_date ? new Date(xeroStatus.connected_date).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Token Refresh</p>
                  <p className="font-medium">{xeroStatus.last_refreshed ? new Date(xeroStatus.last_refreshed).toLocaleString() : '—'}</p>
                </div>
                {xeroStatus.last_error && (
                  <div>
                    <p className="text-xs text-muted-foreground">Last Error</p>
                    <p className="font-medium text-red-600 text-xs">{xeroStatus.last_error}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {status === 'expired' ? (
                  <Button onClick={handleConnect} disabled={connecting}>
                    {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Reconnect Xero
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleDisconnect}>
                    Disconnect
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Xero account to automatically sync sales invoices, purchase order bills,
                and labour cost journals. Each organisation links their own Xero — your data stays
                isolated.
              </p>
              <Button onClick={handleConnect} disabled={connecting || !xeroStatus?.configured}>
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Connect Xero
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Queue Status */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Sync Queue</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Financial records waiting to sync to Xero.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={handleSyncNow} disabled={syncing || syncQueue.length === 0 || status !== 'connected'}>
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
                    <p className="text-sm font-medium">{entry.queue_type.replace(/_/g, ' ')}</p>
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

      {/* Stripe Integration Card (read-only status) */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                <span className="text-lg font-bold text-violet-600">S</span>
              </div>
              <div>
                <CardTitle className="text-lg">Stripe Billing</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Subscription billing for Orbitan plans. Platform-managed.
                </p>
              </div>
            </div>
            <Badge className="bg-green-50 text-green-600 border border-green-200">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Stripe is connected at the platform level for subscription billing. Per-tenant Stripe
            Connect for marketplace revenue splitting is a post-MVP feature.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}