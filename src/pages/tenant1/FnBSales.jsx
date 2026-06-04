import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Package, ShoppingCart, FileText, Users, CheckSquare,
  Shield, BarChart2, Link2, Calendar, Plus, TrendingUp,
  DollarSign, Utensils, RefreshCw
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

const DEMO_RECONS = [
  { id: 'r1', date: '2026-06-03', total_revenue: 1842, total_cogs: 691, gross_profit: 1151, gross_margin_pct: 62.5, cash_sales: 820, card_sales: 1022, discounts: 45, net_revenue: 1797, status: 'approved', xero_sync_status: 'synced' },
  { id: 'r2', date: '2026-06-02', total_revenue: 1620, total_cogs: 632, gross_profit: 988, gross_margin_pct: 61.0, cash_sales: 710, card_sales: 910, discounts: 30, net_revenue: 1590, status: 'approved', xero_sync_status: 'synced' },
  { id: 'r3', date: '2026-06-01', total_revenue: 2100, total_cogs: 805, gross_profit: 1295, gross_margin_pct: 61.7, cash_sales: 960, card_sales: 1140, discounts: 60, net_revenue: 2040, status: 'submitted', xero_sync_status: 'not_synced' },
  { id: 'r4', date: '2026-05-31', total_revenue: 1788, total_cogs: 697, gross_profit: 1091, gross_margin_pct: 61.0, cash_sales: 790, card_sales: 998, discounts: 20, net_revenue: 1768, status: 'approved', xero_sync_status: 'synced' },
  { id: 'r5', date: '2026-05-30', total_revenue: 950, total_cogs: 384, gross_profit: 566, gross_margin_pct: 59.6, cash_sales: 380, card_sales: 570, discounts: 0, net_revenue: 950, status: 'approved', xero_sync_status: 'synced' },
];

const DEMO_INVOICES = [
  { id: 'inv1', invoice_number: 'INV-2026-088', date: '2026-06-03', customer_name: 'GrabFood Settlement', total: 632.40, payment_status: 'paid', payment_method: 'transfer' },
  { id: 'inv2', invoice_number: 'INV-2026-087', date: '2026-06-03', customer_name: 'Foodpanda Settlement', total: 489.60, payment_status: 'paid', payment_method: 'transfer' },
  { id: 'inv3', invoice_number: 'INV-2026-086', date: '2026-06-02', customer_name: 'Walk-in (Cash)', total: 720.00, payment_status: 'paid', payment_method: 'cash' },
  { id: 'inv4', invoice_number: 'INV-2026-085', date: '2026-06-01', customer_name: 'Corporate Catering — Lazada', total: 1200.00, payment_status: 'pending', payment_method: 'transfer' },
];

export default function FnBSales() {
  const [activeTab, setActiveTab] = useState('reconciliation');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], total_revenue: '', total_cogs: '', cash_sales: '', card_sales: '', discounts: '' });

  const weekRevenue = DEMO_RECONS.slice(0, 5).reduce((a, r) => a + r.total_revenue, 0);
  const avgMargin = (DEMO_RECONS.reduce((a, r) => a + r.gross_margin_pct, 0) / DEMO_RECONS.length).toFixed(1);

  return (
    <AppShell navigation={NAV} title="Sales & Invoicing — La Birria Tacos">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Sales, Invoicing & Daily Reconciliation"
          subtitle="La Birria Tacos · North Bridge Rd · F&B Pack"
          actions={
            <Button size="sm" className="gap-1.5" onClick={() => setShowNew(true)}>
              <Plus className="w-4 h-4" /> New Reconciliation
            </Button>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-2">7-Day Revenue</p>
            <p className="text-2xl font-display font-bold text-orbitan-green">S${weekRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-2">Avg Gross Margin</p>
            <p className="text-2xl font-display font-bold text-orbitan-blue">{avgMargin}%</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-2">Pending Invoices</p>
            <p className="text-2xl font-display font-bold text-orbitan-amber">{DEMO_INVOICES.filter(i => i.payment_status === 'pending').length}</p>
          </div>
          <div className="bg-orbitan-green-light border border-green-200 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-2">Xero Synced</p>
            <p className="text-2xl font-display font-bold text-orbitan-green">{DEMO_RECONS.filter(r => r.xero_sync_status === 'synced').length}/{DEMO_RECONS.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
          {['reconciliation', 'invoices'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {t === 'reconciliation' ? 'Daily Reconciliation' : 'Sales Invoices'}
            </button>
          ))}
        </div>

        {/* Reconciliation Table */}
        {activeTab === 'reconciliation' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Revenue</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">COGS</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gross Profit</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Margin</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Xero</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {DEMO_RECONS.map(r => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{r.date}</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">S${r.total_revenue.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">S${r.total_cogs.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-orbitan-green">S${r.gross_profit.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className={`font-semibold ${r.gross_margin_pct >= 61 ? 'text-orbitan-green' : 'text-orbitan-amber'}`}>{r.gross_margin_pct}%</span>
                      </td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell"><StatusBadge status={r.xero_sync_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invoices */}
        {activeTab === 'invoices' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {DEMO_INVOICES.map(inv => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{inv.customer_name}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{inv.date}</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">S${inv.total.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={inv.payment_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* New Reconciliation Modal */}
        {showNew && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h3 className="font-heading font-bold text-lg mb-4">New Daily Reconciliation</h3>
              <div className="space-y-3">
                <div><label className="text-xs font-medium text-muted-foreground">Date</label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="mt-1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-muted-foreground">Total Revenue (S$)</label><Input type="number" value={form.total_revenue} onChange={e => setForm({ ...form, total_revenue: e.target.value })} className="mt-1" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Total COGS (S$)</label><Input type="number" value={form.total_cogs} onChange={e => setForm({ ...form, total_cogs: e.target.value })} className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-muted-foreground">Cash Sales (S$)</label><Input type="number" value={form.cash_sales} onChange={e => setForm({ ...form, cash_sales: e.target.value })} className="mt-1" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Card Sales (S$)</label><Input type="number" value={form.card_sales} onChange={e => setForm({ ...form, card_sales: e.target.value })} className="mt-1" /></div>
                </div>
                <div><label className="text-xs font-medium text-muted-foreground">Discounts (S$)</label><Input type="number" value={form.discounts} onChange={e => setForm({ ...form, discounts: e.target.value })} className="mt-1" /></div>
                {form.total_revenue && form.total_cogs && (
                  <div className="bg-orbitan-green-light rounded-xl p-3 text-sm">
                    <p className="font-semibold text-orbitan-green">Gross Profit: S${(parseFloat(form.total_revenue) - parseFloat(form.total_cogs)).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Margin: {((1 - parseFloat(form.total_cogs) / parseFloat(form.total_revenue)) * 100).toFixed(1)}%</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-5">
                <Button variant="outline" className="flex-1" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button className="flex-1" onClick={() => setShowNew(false)}>Submit</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}