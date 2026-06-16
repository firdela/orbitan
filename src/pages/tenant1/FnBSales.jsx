import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, TrendingUp, DollarSign, RefreshCw } from 'lucide-react';
import { T1_NAV, T1_TENANT } from '@/lib/tenant-nav';

const invoices = [];

export default function FnBSales() {
  const [activeTab, setActiveTab] = useState('reconciliation');
  const [showNew, setShowNew] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedRecon, setSelectedRecon] = useState(null);
  const [recons, setRecons] = useState([]);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], total_revenue: '', total_cogs: '', cash_sales: '', card_sales: '', discounts: '' });

  function submitRecon() {
    if (!form.total_revenue || !form.total_cogs) return;
    const revenue = parseFloat(form.total_revenue);
    const cogs = parseFloat(form.total_cogs);
    const profit = revenue - cogs;
    const margin = ((profit / revenue) * 100).toFixed(1);
    setRecons(prev => [{
      id: `r${Date.now()}`,
      date: form.date,
      total_revenue: revenue,
      total_cogs: cogs,
      gross_profit: profit,
      gross_margin_pct: parseFloat(margin),
      cash_sales: parseFloat(form.cash_sales) || 0,
      card_sales: parseFloat(form.card_sales) || 0,
      discounts: parseFloat(form.discounts) || 0,
      net_revenue: revenue - (parseFloat(form.discounts) || 0),
      status: 'submitted',
      xero_sync_status: 'not_synced',
    }, ...prev]);
    setShowNew(false);
    setForm({ date: new Date().toISOString().split('T')[0], total_revenue: '', total_cogs: '', cash_sales: '', card_sales: '', discounts: '' });
  }

  const weekRevenue = 0;
  const avgMargin = '0.0';

  return (
    <AppShell navigation={T1_NAV} tenant={T1_TENANT} title="" headerRight={<TenantSwitcher />}>
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
            <p className="text-2xl font-display font-bold text-orbitan-amber">0</p>
          </div>
          <div className="bg-orbitan-green-light border border-green-200 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-2">Xero Synced</p>
            <p className="text-2xl font-display font-bold text-orbitan-green">0/0</p>
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
                  {recons.map(r => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedRecon(r)}>
                      <td className="px-4 py-3 font-medium text-foreground hover:text-primary">{r.date}</td>
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
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                      <td className="px-4 py-3 font-medium text-foreground hover:text-primary">{inv.invoice_number}</td>
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
        {/* Invoice Detail Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-lg">{selectedInvoice.invoice_number}</h3>
                <button onClick={() => setSelectedInvoice(null)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-medium">{selectedInvoice.customer_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{selectedInvoice.date}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="capitalize">{selectedInvoice.payment_method}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={selectedInvoice.payment_status} /></div>
                <div className="flex justify-between pt-2 border-t border-border mt-2">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-orbitan-green text-lg">S${selectedInvoice.total.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                {selectedInvoice.payment_status === 'pending' && (
                  <Button size="sm" className="flex-1 text-xs">Mark Paid</Button>
                )}
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setSelectedInvoice(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}

        {/* Reconciliation Detail Modal */}
        {selectedRecon && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-lg">Reconciliation — {selectedRecon.date}</h3>
                <button onClick={() => setSelectedRecon(null)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Revenue</span><span className="font-semibold text-orbitan-green">S${selectedRecon.total_revenue.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total COGS</span><span className="text-orbitan-red">S${selectedRecon.total_cogs.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Gross Profit</span><span className="font-semibold">S${selectedRecon.gross_profit.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Gross Margin</span><span className="font-semibold">{selectedRecon.gross_margin_pct}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cash Sales</span><span>S${selectedRecon.cash_sales.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Card Sales</span><span>S${selectedRecon.card_sales.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Discounts</span><span>S${selectedRecon.discounts.toLocaleString()}</span></div>
                <div className="flex justify-between border-t border-border pt-2 mt-1"><span className="text-muted-foreground">Status</span><StatusBadge status={selectedRecon.status} /></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Xero</span><StatusBadge status={selectedRecon.xero_sync_status} /></div>
              </div>
              <Button className="w-full mt-5 text-xs" onClick={() => setSelectedRecon(null)}>Close</Button>
            </div>
          </div>
        )}

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
                <Button className="flex-1" onClick={submitRecon}>Submit</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}