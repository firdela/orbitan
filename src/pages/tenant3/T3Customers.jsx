import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Button } from '@/components/ui/button';
import { Search, Plus, Star, Phone, Mail, X, UserPlus, Leaf, ShoppingBag, TrendingUp } from 'lucide-react';
import { T3_NAV, T3_TENANT } from '@/lib/tenant-nav';

const TIER_MAP = {
  green_starter:           { label: 'Green Starter',           color: '#16A34A', bg: '#F0FDF4', pts_next: 200 },
  eco_regular:             { label: 'Eco Regular',             color: '#2563EB', bg: '#DBEAFE', pts_next: 600 },
  sustainability_champion: { label: 'Sustainability Champion', color: '#7C3AED', bg: '#EDE9FE', pts_next: 1200 },
  orbitan_ambassador:      { label: 'Orbitan Ambassador',      color: '#D4AF37', bg: '#FEF9C3', pts_next: null },
};

const STATUS_MAP = {
  active:   { label: 'Active',    color: 'text-[#22C55E]', bg: 'bg-[#F0FDF4] border-green-200' },
  vip:      { label: 'VIP ★',    color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  inactive: { label: 'Inactive',  color: 'text-muted-foreground', bg: 'bg-muted border-border' },
};

const TIER_ORDER = ['green_starter', 'eco_regular', 'sustainability_champion', 'orbitan_ambassador'];

export default function T3Customers() {
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const customers = [];
  const filtered = customers.filter(c => {
    const matchSearch = c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchTier = filterTier === 'all' || c.loyalty_tier === filterTier;
    return matchSearch && matchTier;
  });

  const totalCO2 = '0.0';
  const totalSpend = 0;
  const totalDiverted = 0;

  return (
    <AppShell navigation={T3_NAV} tenant={T3_TENANT} title="" headerRight={<TenantSwitcher />}>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Customers"
          subtitle="Renewed Fashion · Customer profiles & sustainability loyalty"
          actions={
            <Button size="sm" className="gap-2" style={{ background: '#22C55E' }} onClick={() => setShowAdd(true)}>
              <UserPlus className="w-3.5 h-3.5" /> Add Customer
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Customers', value: 0, color: 'text-foreground', bg: 'bg-card border-border' },
            { label: 'VIP Customers', value: 0, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
            { label: 'CO₂ Saved (Community)', value: `${totalCO2}kg`, color: 'text-[#22C55E]', bg: 'bg-[#F0FDF4] border-green-200' },
            { label: 'Community Spend', value: `S$${totalSpend.toLocaleString()}`, color: 'text-primary', bg: 'bg-orbitan-blue-light border-blue-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
              <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Sustainability impact banner */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Leaf className="w-8 h-8 text-emerald-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800">Community Sustainability Impact</p>
            <p className="text-xs text-emerald-600 mt-0.5">Together, our customers have diverted <strong>0 clothing items</strong> from landfill, saving <strong>{totalCO2}kg of CO₂</strong>.</p>
          </div>
        </div>

        {/* Tier breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TIER_ORDER.map(tier => {
            const t = TIER_MAP[tier];
            const count = customers.filter(c => c.loyalty_tier === tier).length;
            return (
              <button key={tier} onClick={() => setFilterTier(filterTier === tier ? 'all' : tier)}
                className={`rounded-xl border p-3 text-left transition-all ${filterTier === tier ? 'ring-2 ring-offset-1' : ''}`}
                style={{ background: t.bg, borderColor: t.color + '40', outlineColor: t.color }}>
                <p className="text-lg font-bold" style={{ color: t.color }}>{count}</p>
                <p className="text-[11px] font-medium" style={{ color: t.color }}>{t.label}</p>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Customer Cards */}
        <div className="space-y-3">
          {filtered.map(c => {
            const tier = TIER_MAP[c.loyalty_tier] || TIER_MAP.green_starter;
            const statusCfg = STATUS_MAP[c.status] || STATUS_MAP.active;
            const ptsNext = tier.pts_next ? tier.pts_next - c.loyalty_points : null;
            return (
              <div key={c.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setSelectedCustomer(c)}>
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: tier.color }}>
                    {c.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{c.full_name}</p>
                        {c.status === 'vip' && <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${statusCfg.bg} ${statusCfg.color}`}>{statusCfg.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{c.email} · {c.phone}</p>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ color: tier.color, background: tier.bg }}>{tier.label}</span>
                      <span className="text-xs text-muted-foreground">{c.loyalty_points} pts</span>
                      {ptsNext && <span className="text-xs text-muted-foreground">· {ptsNext} pts to next tier</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" />{c.total_purchases} purchases · S${c.total_spend_sgd}</span>
                      <span className="flex items-center gap-1 text-emerald-600"><Leaf className="w-3 h-3" />{c.total_co2_saved_kg}kg CO₂ saved</span>
                      <span>Last: {c.last_purchase_date}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Customer Detail Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)}>
          <div className="bg-white w-full max-w-sm h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <p className="font-heading font-semibold text-foreground">Customer Profile</p>
              <button onClick={() => setSelectedCustomer(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {(() => {
                const tier = TIER_MAP[selectedCustomer.loyalty_tier];
                return (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white" style={{ background: tier.color }}>
                        {selectedCustomer.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{selectedCustomer.full_name}</p>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: tier.color, background: tier.bg }}>{tier.label}</span>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" />{selectedCustomer.email}</div>
                      <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4" />{selectedCustomer.phone}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Loyalty Points', value: `${selectedCustomer.loyalty_points} pts` },
                        { label: 'Total Purchases', value: selectedCustomer.total_purchases },
                        { label: 'Total Spend', value: `S$${selectedCustomer.total_spend_sgd}` },
                        { label: 'CO₂ Saved', value: `${selectedCustomer.total_co2_saved_kg}kg` },
                        { label: 'Items Diverted', value: `${selectedCustomer.items_diverted} pcs` },
                        { label: 'Fav Category', value: selectedCustomer.fav_category },
                      ].map(f => (
                        <div key={f.label} className="bg-muted/50 rounded-xl p-3">
                          <p className="text-xs text-muted-foreground">{f.label}</p>
                          <p className="text-sm font-semibold text-foreground mt-0.5">{f.value}</p>
                        </div>
                      ))}
                    </div>
                    {tier.pts_next && (
                      <div className="bg-muted/50 rounded-xl p-4">
                        <div className="flex justify-between text-xs text-muted-foreground mb-2">
                          <span>{tier.label}</span>
                          <span>{tier.pts_next - selectedCustomer.loyalty_points} pts to next</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (selectedCustomer.loyalty_points / tier.pts_next) * 100)}%`, background: tier.color }} />
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1">Purchase History</Button>
                      <Button size="sm" className="flex-1" style={{ background: '#22C55E' }}>Award Points</Button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <p className="font-heading font-semibold">New Customer</p>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: 'Full Name', type: 'text', placeholder: 'e.g. Sarah Tan' },
                { label: 'Email', type: 'email', placeholder: 'email@email.com' },
                { label: 'Phone', type: 'tel', placeholder: '+65 9XXX XXXX' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-medium text-foreground mb-1">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button className="flex-1" style={{ background: '#22C55E' }} onClick={() => setShowAdd(false)}>Add Customer</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}