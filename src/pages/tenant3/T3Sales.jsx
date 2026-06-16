import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle2, CreditCard, Banknote, ArrowUpRight } from 'lucide-react';
import { T3_NAV, T3_TENANT } from '@/lib/tenant-nav';
import POSModal from '@/components/pos/POSModal';

const PAYMENT_MAP = {
  cash:     { label: 'Cash',     icon: Banknote,    color: 'text-[#22C55E]', bg: 'bg-[#F0FDF4]' },
  card:     { label: 'Card',     icon: CreditCard,  color: 'text-blue-600',  bg: 'bg-blue-50' },
  transfer: { label: 'Transfer', icon: ArrowUpRight, color: 'text-purple-600', bg: 'bg-purple-50' },
};

export default function T3Sales() {
  const [activeTab, setActiveTab] = useState('sales');
  const [posOpen, setPosOpen] = useState(false);

  const sales = [];
  const totalRevenue = 0;
  const totalCO2 = '0.0';

  return (
    <AppShell navigation={T3_NAV} tenant={T3_TENANT} title="" headerRight={<TenantSwitcher />}>
      <POSModal
        open={posOpen}
        onClose={() => setPosOpen(false)}
        tenantId={T3_TENANT.name}
        outletId="t3-outlet-1"
        onSaleComplete={() => setPosOpen(false)}
      />
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Sales & POS"
          subtitle="Retail Operations · Sales tracking & point-of-sale"
          actions={
            <Button size="sm" className="gap-2 text-white" style={{ background: '#22C55E' }} onClick={() => setPosOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> New Sale
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Sales (MTD)', value: 0, color: 'text-foreground', bg: 'bg-card border-border' },
            { label: 'Revenue (MTD)', value: `S$0`, color: 'text-[#22C55E]', bg: 'bg-[#F0FDF4] border-green-200' },
            { label: 'Avg Sale Value', value: `S$0`, color: 'text-primary', bg: 'bg-orbitan-blue-light border-blue-200' },
            { label: 'CO₂ Impact', value: `${totalCO2}kg`, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
              <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
          {[{ id: 'sales', label: 'Sales History' }, { id: 'reconcile', label: 'Daily Reconciliation' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`text-sm font-medium px-5 py-2 rounded-lg transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'sales' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {sales.map(sale => {
                const pm = PAYMENT_MAP[sale.payment] || PAYMENT_MAP.cash;
                const PayIcon = pm.icon;
                return (
                  <div key={sale.id} className="flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${pm.bg}`}>
                      <PayIcon className={`w-4 h-4 ${pm.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{sale.item}</p>
                      <p className="text-xs text-muted-foreground">{sale.id} · {sale.customer} · {sale.date}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-foreground">S${sale.price}</p>
                      <p className="text-[11px] text-emerald-600">{sale.co2_saved}kg CO₂ saved</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'reconcile' && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-heading font-semibold text-foreground">Today's Reconciliation — 4 June 2026</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Cash Sales', value: 'S$47.00', sub: '3 transactions' },
                { label: 'Card Sales', value: 'S$193.00', sub: '4 transactions' },
                { label: 'Transfer Sales', value: 'S$48.00', sub: '1 transaction' },
                { label: 'Total Revenue', value: 'S$288.00', sub: '8 transactions' },
                { label: 'Items Sold', value: '8 pieces', sub: 'today' },
                { label: 'CO₂ Saved', value: '18.4 kg', sub: 'from today\'s sales' },
              ].map(r => (
                <div key={r.label} className="bg-muted/50 rounded-xl p-3">
                  <p className="text-base font-bold text-foreground">{r.value}</p>
                  <p className="text-xs text-muted-foreground">{r.label}</p>
                  <p className="text-[10px] text-muted-foreground">{r.sub}</p>
                </div>
              ))}
            </div>
            <Button size="sm" className="gap-2 w-full sm:w-auto" style={{ background: '#22C55E' }}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Submit Reconciliation
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}