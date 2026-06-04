import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Package, ShoppingCart, FileText, Users, CheckSquare,
  Shield, BarChart2, Link2, Calendar, CheckCircle2,
  AlertTriangle, RefreshCw, ExternalLink, Utensils, XCircle
} from 'lucide-react';

const NAV = [
  { type: 'section', label: 'F&B Operations' },
  { href: '/t1/dashboard', icon: Utensils, label: 'Dashboard' },
  { href: '/t1/inventory', icon: Package, label: 'Inventory' },
  { href: '/t1/procurement', icon: ShoppingCart, label: 'Procurement' },
  { href: '/t1/sales', icon: FileText, label: 'Sales & Invoicing' },
  { href: '/t1/scheduling', icon: Calendar, label: 'Scheduling' },
  { type: 'section', label: 'People & Tasks' },
  { href: '/t1/workforce', icon: Users, label: 'Workforce' },
  { href: '/t1/tasks', icon: CheckSquare, label: 'Tasks' },
  { type: 'section', label: 'Governance' },
  { href: '/t1/compliance', icon: Shield, label: 'Compliance' },
  { href: '/t1/reporting', icon: BarChart2, label: 'Reporting' },
  { href: '/t1/xero', icon: Link2, label: 'Xero Integration' },
];

const SYNC_LOG = [
  { id: 's1', type: 'Sales Invoice', reference: 'INV-2026-088', status: 'synced', timestamp: '2026-06-04 08:12', amount: 'S$632.40' },
  { id: 's2', type: 'Daily Reconciliation', reference: 'RECON-2026-06-03', status: 'synced', timestamp: '2026-06-04 08:10', amount: 'S$1,842.00' },
  { id: 's3', type: 'Sales Invoice', reference: 'INV-2026-087', status: 'synced', timestamp: '2026-06-03 22:05', amount: 'S$489.60' },
  { id: 's4', type: 'Daily Reconciliation', reference: 'RECON-2026-06-02', status: 'synced', timestamp: '2026-06-03 22:00', amount: 'S$1,620.00' },
  { id: 's5', type: 'Sales Invoice', reference: 'INV-2026-086', status: 'error', timestamp: '2026-06-02 21:55', amount: 'S$720.00' },
];

export default function FnBXero() {
  const [connected, setConnected] = useState(true);
  const [syncing, setSyncing] = useState(false);

  function handleSync() {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  }

  return (
    <AppShell navigation={NAV} title="Xero Integration — La Birria Tacos">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Xero Finance Integration"
          subtitle="La Birria Tacos · Finance Integration Module (Xero)"
        />

        {/* Connection Card */}
        <div className={`rounded-2xl border p-6 ${connected ? 'bg-orbitan-green-light border-green-200' : 'bg-card border-border'}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${connected ? 'bg-white shadow-sm' : 'bg-muted'}`}>
                <Link2 className={`w-7 h-7 ${connected ? 'text-orbitan-green' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="font-heading font-bold text-foreground text-lg">Xero Accounting</p>
                <p className="text-sm text-muted-foreground">
                  {connected ? 'Connected to Taqueria Pte Ltd — Xero Organisation' : 'Not connected'}
                </p>
                {connected && (
                  <div className="flex items-center gap-1.5 mt-1 text-xs font-medium text-orbitan-green">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active & Syncing
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {connected ? (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleSync} disabled={syncing}>
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs text-orbitan-red border-orbitan-red" onClick={() => setConnected(false)}>
                    <XCircle className="w-3.5 h-3.5" /> Disconnect
                  </Button>
                </>
              ) : (
                <Button size="sm" className="gap-1.5 text-xs" onClick={() => setConnected(true)}>
                  <Link2 className="w-3.5 h-3.5" /> Connect Xero
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Sync Stats */}
        {connected && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-orbitan-green-light border border-green-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-display font-bold text-orbitan-green">4</p>
              <p className="text-xs text-muted-foreground">Synced Today</p>
            </div>
            <div className="bg-orbitan-red-light border border-red-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-display font-bold text-orbitan-red">1</p>
              <p className="text-xs text-muted-foreground">Sync Errors</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-display font-bold text-foreground">3</p>
              <p className="text-xs text-muted-foreground">Pending Sync</p>
            </div>
          </div>
        )}

        {/* Sync Scope */}
        {connected && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-heading font-semibold text-foreground mb-4">Sync Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Sales Invoices', desc: 'Auto-sync on submission', active: true },
                { label: 'Daily Reconciliation', desc: 'Auto-sync when approved', active: true },
                { label: 'COGS Entries', desc: 'Mapped to Xero COGS account', active: true },
                { label: 'Purchase Orders', desc: 'Sync approved POs as bills', active: false },
              ].map(cfg => (
                <div key={cfg.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  {cfg.active
                    ? <CheckCircle2 className="w-4 h-4 text-orbitan-green mt-0.5 flex-shrink-0" />
                    : <AlertTriangle className="w-4 h-4 text-orbitan-amber mt-0.5 flex-shrink-0" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">{cfg.label}</p>
                    <p className="text-xs text-muted-foreground">{cfg.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sync Log */}
        {connected && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-heading font-semibold text-foreground">Sync Activity Log</h3>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ExternalLink className="w-3.5 h-3.5" /> Open in Xero
              </Button>
            </div>
            <div className="divide-y divide-border">
              {SYNC_LOG.map(log => (
                <div key={log.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    {log.status === 'synced'
                      ? <CheckCircle2 className="w-4 h-4 text-orbitan-green flex-shrink-0" />
                      : <AlertTriangle className="w-4 h-4 text-orbitan-red flex-shrink-0" />}
                    <div>
                      <p className="text-sm font-medium text-foreground">{log.reference}</p>
                      <p className="text-xs text-muted-foreground">{log.type} · {log.timestamp}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-foreground">{log.amount}</p>
                    <p className={`text-[11px] font-medium ${log.status === 'synced' ? 'text-orbitan-green' : 'text-orbitan-red'}`}>
                      {log.status === 'synced' ? 'Synced' : 'Error'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}