import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import FinanceReviewQueue from '@/components/finance/FinanceReviewQueue';
import { useTenant } from '@/lib/use-tenant';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileText, TrendingUp, DollarSign, Package, CheckCircle2,
  Plus, Home, Users, Calendar, ShoppingCart, CheckSquare,
  BarChart2, Shield, Layers, Building2, RefreshCw, Inbox, Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';



export default function SalesPage() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [reconciliations, setReconciliations] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], total_revenue: '', total_cogs: '', cash_sales: '', card_sales: '' });

  const tenantId = user?.data?.tenant_id || user?.tenant_id || currentTenant?.id || null;
  const outletId = user?.data?.outlet_id || user?.outlet_id || null;

  useEffect(() => {
    base44.entities.DailyReconciliation.list('-created_date', 50)
      .then(data => setReconciliations(data || []))
      .catch(() => setReconciliations([]))
      .finally(() => setLoading(false));
  }, []);

  const grossProfit = (parseFloat(form.total_revenue) || 0) - (parseFloat(form.total_cogs) || 0);
  const margin = form.total_revenue ? ((grossProfit / parseFloat(form.total_revenue)) * 100).toFixed(1) : 0;

  const handleCreate = async () => {
    const rec = {
      tenant_id: tenantId,
      outlet_id: outletId,
      date: form.date,
      total_revenue: parseFloat(form.total_revenue) || 0,
      total_cogs: parseFloat(form.total_cogs) || 0,
      gross_profit: grossProfit,
      gross_margin_pct: parseFloat(margin),
      cash_sales: parseFloat(form.cash_sales) || 0,
      card_sales: parseFloat(form.card_sales) || 0,
      net_revenue: parseFloat(form.total_revenue) || 0,
      status: 'draft',
      xero_sync_status: 'not_synced',
    };
    const created = await base44.entities.DailyReconciliation.create(rec);
    setReconciliations(prev => [created, ...prev]);
    setShowCreate(false);
  };

  const totalRevenue = reconciliations.reduce((s, r) => s + (r.total_revenue || 0), 0);
  const avgMargin = reconciliations.length ? (reconciliations.reduce((s, r) => s + (r.gross_margin_pct || 0), 0) / reconciliations.length).toFixed(1) : 0;

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
        <PageHeader
          title="Sales & Reconciliation"
          subtitle="Daily P&L tracking with Xero sync"
          help={{
            title: 'Sales & Reconciliation',
            content: 'Record daily sales revenue, COGS, and payment method breakdown. Each reconciliation is a draft until approved, and can be synced to Xero for accounting.',
            tips: [
              'Enter total revenue and COGS — gross profit and margin are calculated automatically.',
              'The F&B healthy gross margin target is 65–75%.',
              'Approved reconciliations sync to Xero via the Integrations module.',
            ],
          }}
          actions={
            <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" />
              New Reconciliation
            </Button>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Revenue" value={`S$${totalRevenue.toLocaleString()}`} subtitle="All records" icon={TrendingUp} color="green" help={{ content: 'Sum of total revenue across all daily reconciliation records for this outlet.' }} />
          <StatCard title="Avg Gross Margin" value={`${avgMargin}%`} subtitle="F&B target: 65-75%" icon={BarChart2} color="blue" help={{ content: 'Average gross margin across all records. A healthy F&B margin sits between 65–75%.', tips: ['If margin drops below 60%, review your COGS and recipe pricing.'] }} />
          <StatCard title="Xero Synced" value={reconciliations.filter(r => r.xero_sync_status === 'synced').length} subtitle={`of ${reconciliations.length} records`} icon={RefreshCw} color="purple" help={{ content: 'Records that have been successfully pushed to your Xero ledger. Connect Xero via the Integrations module to enable sync.' }} />
          <StatCard title="Approved" value={reconciliations.filter(r => r.status === 'approved').length} subtitle="Days reconciled" icon={CheckCircle2} color="green" help={{ content: 'Reconciliations that a manager has reviewed and approved. Only approved records are eligible for Xero sync.' }} />
        </div>

        {/* ── Reconciliation Inbox ─────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Inbox className="w-4 h-4 text-[#F97316]" />
            <h2 className="font-heading font-semibold text-sm text-foreground">Reconciliation Inbox</h2>
            <span className="text-xs text-muted-foreground">— AI-extracted documents awaiting human verification before Xero sync</span>
          </div>
          {currentTenant?.id ? (
            <FinanceReviewQueue tenantId={currentTenant.id} />
          ) : (
            <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground">No tenant context available. Please complete onboarding to access the Reconciliation Inbox.</p>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-heading font-semibold text-sm">Daily Reconciliations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Revenue</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">COGS</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Gross Profit</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Margin</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Xero</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && (
                  <tr>
                    <td colSpan={7} className="py-16">
                      <div className="flex items-center justify-center gap-2.5">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Loading reconciliations…</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && reconciliations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-4">
                      <EmptyState
                        icon={FileText}
                        title="No reconciliations yet"
                        description="Create your first daily reconciliation to start tracking sales and profit."
                        actionLabel="New Reconciliation"
                        onAction={() => setShowCreate(true)}
                        color="blue"
                      />
                    </td>
                  </tr>
                )}
                {reconciliations.map(rec => (
                  <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      {format(new Date(rec.date + 'T00:00:00'), 'd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-orbitan-green">S${rec.total_revenue?.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right text-muted-foreground hidden sm:table-cell">S${rec.total_cogs?.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right font-semibold">S${rec.gross_profit?.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right text-muted-foreground hidden md:table-cell">{rec.gross_margin_pct}%</td>
                    <td className="px-4 py-3.5 text-center"><StatusBadge status={rec.status} /></td>
                    <td className="px-4 py-3.5 text-center"><StatusBadge status={rec.xero_sync_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Xero integration notice */}
        <div className="mt-4 bg-orbitan-blue-light border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <RefreshCw className="w-4 h-4 text-orbitan-blue flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orbitan-blue">Xero Integration</p>
            <p className="text-xs text-blue-700 mt-0.5">Connect your Xero account via the Integrations module to automatically sync daily reconciliations and generate accounting entries.</p>
            <Link to="/platform/integrations">
              <Button variant="outline" size="sm" className="mt-2 text-xs border-orbitan-blue text-orbitan-blue hover:bg-orbitan-blue hover:text-white">
                Connect Xero
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Daily Sales Reconciliation</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1 block">Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Total Revenue (S$)</Label>
                <Input type="number" value={form.total_revenue} onChange={e => setForm(p => ({ ...p, total_revenue: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Total COGS (S$)</Label>
                <Input type="number" value={form.total_cogs} onChange={e => setForm(p => ({ ...p, total_cogs: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Cash Sales (S$)</Label>
                <Input type="number" value={form.cash_sales} onChange={e => setForm(p => ({ ...p, cash_sales: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Card Sales (S$)</Label>
                <Input type="number" value={form.card_sales} onChange={e => setForm(p => ({ ...p, card_sales: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            {form.total_revenue && (
              <div className="bg-muted rounded-xl p-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Gross Profit</span><span className="font-semibold text-orbitan-green">S${grossProfit.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Gross Margin</span><span className="font-semibold">{margin}%</span></div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.total_revenue}>Submit</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}