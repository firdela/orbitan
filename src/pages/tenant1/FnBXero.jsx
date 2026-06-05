import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package, ShoppingCart, FileText, Users, CheckSquare,
  Shield, BarChart2, Link2, Calendar, CheckCircle2,
  AlertTriangle, RefreshCw, ExternalLink, Utensils, XCircle,
  Eye, Send, Clock, AlertCircle, ChevronRight, Activity, Inbox
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import XeroReviewModal from '@/components/finance/XeroReviewModal';
import FinanceReviewQueue from '@/components/finance/FinanceReviewQueue';

// Tenant 1 identifiers for Taqueria Pte Ltd / La Birria Tacos
const TENANT_ID = 'taqueria_pte_ltd';
const OUTLET_ID = 'la_birria_north_bridge';

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

// Demo review queue — documents awaiting human verification before Xero sync
const REVIEW_QUEUE = [
  {
    id: 'r1', type: 'sales_invoice', label: 'Sales Invoice', reference: 'INV-2026-091',
    date: '2026-06-04', amount: 'S$842.00', processing_status: 'needs_review',
    ai_confidence_score: 94, customer_name: 'Walk-in Customer',
    line_items: [
      { description: 'Birria Tacos (x4)', quantity: 4, unit_price: 18, total: 72 },
      { description: 'Quesabirria (x2)', quantity: 2, unit_price: 22, total: 44 },
    ]
  },
  {
    id: 'r2', type: 'purchase_order', label: 'Purchase Order', reference: 'PO-2026-045',
    date: '2026-06-03', amount: 'S$1,240.00', processing_status: 'needs_review',
    ai_confidence_score: 78, supplier_name: 'Prime Meat Suppliers Pte Ltd',
    items: [
      { item_name: 'Beef Chuck (5kg)', quantity: 10, unit_price: 80, total: 800 },
      { item_name: 'Corn Tortillas (pack)', quantity: 24, unit_price: 18.33, total: 440 },
    ]
  },
  {
    id: 'r3', type: 'sales_invoice', label: 'Sales Invoice', reference: 'INV-2026-090',
    date: '2026-06-03', amount: 'S$527.50', processing_status: 'ai_processing',
    ai_confidence_score: null, customer_name: 'Corporate Order — Grab',
    line_items: []
  },
];

const SYNC_LOG = [
  { id: 's1', type: 'Sales Invoice', reference: 'INV-2026-089', status: 'synced', timestamp: '2026-06-04 08:12', amount: 'S$632.40' },
  { id: 's2', type: 'Daily Reconciliation', reference: 'RECON-2026-06-03', status: 'synced', timestamp: '2026-06-04 08:10', amount: 'S$1,842.00' },
  { id: 's3', type: 'Sales Invoice', reference: 'INV-2026-088', status: 'synced', timestamp: '2026-06-03 22:05', amount: 'S$489.60' },
  { id: 's4', type: 'Purchase Order', reference: 'PO-2026-044', status: 'error', timestamp: '2026-06-02 21:55', amount: 'S$1,180.00', error: 'Xero Contact not found. Please map supplier to Xero Contact.' },
];

const STATUS_CONFIG = {
  needs_review: { label: 'Needs Review', icon: Eye, color: 'text-orbitan-amber', bg: 'bg-orbitan-amber-light border-amber-200' },
  ai_processing: { label: 'AI Processing', icon: Activity, color: 'text-orbitan-blue', bg: 'bg-orbitan-blue-light border-blue-200' },
  verified: { label: 'Verified', icon: CheckCircle2, color: 'text-orbitan-green', bg: 'bg-orbitan-green-light border-green-200' },
  raw: { label: 'Uploaded', icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted border-border' },
};

export default function FnBXero() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reviewQueue, setReviewQueue] = useState(REVIEW_QUEUE);
  const [syncLog] = useState(SYNC_LOG);
  const [activeTab, setActiveTab] = useState('review');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [syncingId, setSyncingId] = useState(null);

  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Xero OAuth requires a registered connector with real credentials.
  // Until configured by the platform admin, show the setup guide.
  function handleConnectXero() {
    setShowSetupGuide(true);
  }

  // Demo-only: allow simulating a connected state for UI preview
  function handleDemoConnect() {
    setShowSetupGuide(false);
    setConnected(true);
  }

  function handleDisconnect() {
    setConnected(false);
  }

  function handleManualSync() {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  }

  function handleVerify(record) {
    setReviewQueue(prev => prev.map(r =>
      r.id === record.id ? { ...r, processing_status: 'verified' } : r
    ));
    setSelectedRecord(null);
  }

  async function handleSyncToXero(record) {
    setSyncingId(record.id);
    try {
      await base44.functions.invoke('financeController', {
        action_type: record.type === 'sales_invoice' ? 'sync_invoice' : 'sync_purchase_order',
        record_id: record.id,
        entity_type: record.type
      });
      setReviewQueue(prev => prev.map(r =>
        r.id === record.id ? { ...r, xero_sync_status: 'synced' } : r
      ));
    } catch {
      // error handled silently — xero sync error will be visible on record
    }
    setSyncingId(null);
  }

  const pendingCount = reviewQueue.filter(r => r.processing_status === 'needs_review').length;
  const verifiedCount = reviewQueue.filter(r => r.processing_status === 'verified').length;

  return (
    <AppShell navigation={NAV} title="Xero Integration — La Birria Tacos">
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Xero Finance Integration"
          subtitle="La Birria Tacos · Finance Integration Module"
        />

        {/* ── Connection Card ─────────────────────────────── */}
        <div className={`rounded-2xl border p-6 transition-all ${connected ? 'bg-orbitan-green-light border-green-200' : 'bg-card border-border'}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl ${connected ? 'bg-white shadow-sm text-orbitan-green' : 'bg-muted text-muted-foreground'}`}>
                X
              </div>
              <div>
                <p className="font-heading font-bold text-foreground text-lg">Xero Accounting</p>
                <p className="text-sm text-muted-foreground">
                  {connected ? 'Connected · Taqueria Pte Ltd' : 'Not connected — click to authorise your Xero account'}
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
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleManualSync} disabled={syncing}>
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={handleDisconnect}>
                    <XCircle className="w-3.5 h-3.5" /> Disconnect
                  </Button>
                </>
              ) : (
                <Button size="sm" className="gap-2" onClick={handleConnectXero} disabled={connecting}>
                  <Link2 className="w-4 h-4" />
                  {connecting ? 'Opening Xero Login...' : 'Connect Xero Account'}
                </Button>
              )}
            </div>
          </div>

          {!connected && (
            <div className="mt-4 pt-4 border-t border-border flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>A Xero login window will open. Sign in with your finance team's Xero account to authorise. Only verified documents will be pushed to Xero.</span>
            </div>
          )}
        </div>

        {/* ── Stats ───────────────────────────────────────── */}
        {connected && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Synced Today', value: syncLog.filter(l => l.status === 'synced').length, color: 'text-orbitan-green', bg: 'bg-orbitan-green-light border-green-200' },
              { label: 'Sync Errors', value: syncLog.filter(l => l.status === 'error').length, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
              { label: 'Needs Review', value: pendingCount, color: 'text-orbitan-amber', bg: 'bg-orbitan-amber-light border-amber-200' },
              { label: 'Verified & Ready', value: verifiedCount, color: 'text-orbitan-blue', bg: 'bg-orbitan-blue-light border-blue-200' },
            ].map(stat => (
              <div key={stat.label} className={`rounded-xl border p-4 text-center ${stat.bg}`}>
                <p className={`text-2xl font-display font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabs ────────────────────────────────────────── */}
        {connected && (
          <>
            <div className="flex gap-1 bg-muted rounded-xl p-1 w-full sm:w-auto">
              {[
                { id: 'inbox', label: 'Document Inbox' },
                { id: 'review', label: `Legacy Queue${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
                { id: 'log', label: 'Sync Log' },
                { id: 'config', label: 'Configuration' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 sm:flex-none text-xs sm:text-sm font-medium px-3 sm:px-5 py-2 rounded-lg transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Document Inbox Tab (Live DB — Hamka's Queue) ── */}
            {activeTab === 'inbox' && (
              <FinanceReviewQueue tenantId={TENANT_ID} outletId={OUTLET_ID} />
            )}

            {/* ── Review Queue Tab ─────────────────────────── */}
            {activeTab === 'review' && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="font-heading font-semibold text-foreground">Documents Pending Review</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Review AI-extracted data and approve before syncing to Xero</p>
                </div>
                <div className="divide-y divide-border">
                  {reviewQueue.map(record => {
                    const sc = STATUS_CONFIG[record.xero_sync_status === 'synced' ? 'verified' : record.processing_status] || STATUS_CONFIG.raw;
                    const StatusIcon = sc.icon;
                    const isSynced = record.xero_sync_status === 'synced';
                    return (
                      <div key={record.id} className="flex items-center gap-3 px-5 py-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-foreground">{record.reference}</p>
                            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {isSynced ? 'Synced to Xero' : sc.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {record.label} · {record.date} · {record.amount}
                            {record.ai_confidence_score && (
                              <span className="ml-2 text-orbitan-blue font-medium">AI {record.ai_confidence_score}% confident</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!isSynced && record.processing_status !== 'ai_processing' && (
                            <Button
                              variant="outline" size="sm"
                              className="gap-1.5 text-xs"
                              onClick={() => setSelectedRecord(record)}
                            >
                              <Eye className="w-3.5 h-3.5" /> Review
                            </Button>
                          )}
                          {record.processing_status === 'verified' && !isSynced && (
                            <Button
                              size="sm"
                              className="gap-1.5 text-xs bg-orbitan-blue hover:bg-orbitan-blue/90"
                              onClick={() => handleSyncToXero(record)}
                              disabled={syncingId === record.id}
                            >
                              <Send className={`w-3.5 h-3.5 ${syncingId === record.id ? 'animate-pulse' : ''}`} />
                              {syncingId === record.id ? 'Syncing...' : 'Sync to Xero'}
                            </Button>
                          )}
                          {record.processing_status === 'ai_processing' && (
                            <span className="text-xs text-orbitan-blue flex items-center gap-1">
                              <Activity className="w-3.5 h-3.5 animate-pulse" /> Processing...
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Sync Log Tab ─────────────────────────────── */}
            {activeTab === 'log' && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-foreground">Sync Activity Log</h3>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <ExternalLink className="w-3.5 h-3.5" /> Open in Xero
                  </Button>
                </div>
                <div className="divide-y divide-border">
                  {syncLog.map(log => (
                    <div key={log.id} className="flex items-start justify-between px-5 py-4">
                      <div className="flex items-start gap-3">
                        {log.status === 'synced'
                          ? <CheckCircle2 className="w-4 h-4 text-orbitan-green mt-0.5 flex-shrink-0" />
                          : <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                        <div>
                          <p className="text-sm font-medium text-foreground">{log.reference}</p>
                          <p className="text-xs text-muted-foreground">{log.type} · {log.timestamp}</p>
                          {log.error && (
                            <p className="text-xs text-red-600 mt-1 max-w-sm">{log.error}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-semibold text-foreground">{log.amount}</p>
                        <p className={`text-[11px] font-medium ${log.status === 'synced' ? 'text-orbitan-green' : 'text-red-500'}`}>
                          {log.status === 'synced' ? 'Synced' : 'Error'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Configuration Tab ────────────────────────── */}
            {activeTab === 'config' && (
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h3 className="font-heading font-semibold text-foreground">Sync Configuration</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Sales Invoices', desc: 'Verified invoices → Xero Invoices (ACCREC)', active: true },
                    { label: 'Daily Reconciliation', desc: 'Approved reconciliations → Xero Manual Journals', active: true },
                    { label: 'COGS Entries', desc: 'Mapped to Xero Cost of Goods account (300)', active: true },
                    { label: 'Purchase Orders', desc: 'Verified POs → Xero Bills (ACCPAY)', active: true },
                  ].map(cfg => (
                    <div key={cfg.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <CheckCircle2 className="w-4 h-4 text-orbitan-green mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{cfg.label}</p>
                        <p className="text-xs text-muted-foreground">{cfg.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-border text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>All documents must pass the human review step before syncing to Xero. This ensures data accuracy and audit compliance.</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Not Connected CTA ────────────────────────────── */}
        {!connected && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto text-3xl font-bold text-muted-foreground">X</div>
            <div>
              <p className="font-heading font-semibold text-foreground text-lg">Connect your Xero account</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Once connected, your finance team can review AI-extracted documents and push verified invoices and purchase orders directly to Xero — with a full audit trail.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button onClick={handleConnectXero} disabled={connecting} className="gap-2">
                <Link2 className="w-4 h-4" />
                {connecting ? 'Opening Xero Login...' : 'Connect Xero Account'}
              </Button>
              <Button variant="outline" className="gap-2" asChild>
                <a href="https://www.xero.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" /> Learn about Xero
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Xero Setup Guide Modal */}
      {showSetupGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center font-bold text-blue-600 text-lg">X</div>
                <p className="font-heading font-semibold text-foreground">Connect Xero Account</p>
              </div>
              <button onClick={() => setShowSetupGuide(false)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                To connect Xero, your platform administrator needs to register the Xero OAuth app credentials in OrbitanOS. This is a one-time setup.
              </p>
              <div className="space-y-3">
                {[
                  { step: '1', label: 'Create a Xero App', desc: 'Go to developer.xero.com → My Apps → New App. Set type to "Web App".' },
                  { step: '2', label: 'Copy Credentials', desc: 'Copy your Client ID and Client Secret from the Xero app settings.' },
                  { step: '3', label: 'Register in OrbitanOS', desc: 'Your Orbitan platform admin registers these credentials in the Integrations settings.' },
                  { step: '4', label: 'Authorise', desc: 'Once registered, the Connect button will open the official Xero login window.' },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl border border-border">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.step}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 p-3 bg-orbitan-amber-light rounded-xl border border-amber-200 text-xs text-orbitan-amber">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>This is a one-time setup by your Orbitan platform admin. Finance users will then see a standard Xero login window when connecting.</span>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" className="flex-1" onClick={() => setShowSetupGuide(false)}>Close</Button>
              <Button className="flex-1 gap-2" variant="outline" asChild>
                <a href="https://developer.xero.com/app/manage" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" /> Open Xero Developer Portal
                </a>
              </Button>
              <Button className="flex-1 text-xs" onClick={handleDemoConnect}>
                Preview Connected State
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedRecord && (
        <XeroReviewModal
          record={selectedRecord}
          onVerify={handleVerify}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </AppShell>
  );
}