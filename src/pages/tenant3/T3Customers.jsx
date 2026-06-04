import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import {
  ShoppingBag, Package, FileText, Users, CheckSquare,
  BarChart2, Heart, Leaf, Plus, Search, Star, Shirt
} from 'lucide-react';

const NAV = [
  { type: 'section', label: 'Retail Ops' },
  { href: '/t3/dashboard', icon: ShoppingBag, label: 'Dashboard' },
  { href: '/t3/catalog', icon: Shirt, label: 'Product Catalog' },
  { href: '/t3/inventory', icon: Package, label: 'Inventory' },
  { href: '/t3/sales', icon: FileText, label: 'Sales & POS' },
  { href: '/t3/customers', icon: Heart, label: 'Customers' },
  { type: 'section', label: 'People & Tasks' },
  { href: '/t3/workforce', icon: Users, label: 'Workforce' },
  { href: '/t3/tasks', icon: CheckSquare, label: 'Tasks' },
  { type: 'section', label: 'Intelligence' },
  { href: '/t3/reporting', icon: BarChart2, label: 'Reporting' },
];

const DEMO_CUSTOMERS = [
  { id: 'c1', full_name: 'Sarah Tan', email: 'sarah@email.com', phone: '+65 9111 2222', loyalty_tier: 'sustainability_champion', loyalty_points: 840, total_purchases: 14, total_spend_sgd: 312, total_co2_saved_kg: 28.4, last_purchase_date: '2026-06-04', status: 'active' },
  { id: 'c2', full_name: 'Priya Mehra', email: 'priya@email.com', phone: '+65 9222 3333', loyalty_tier: 'eco_regular', loyalty_points: 420, total_purchases: 7, total_spend_sgd: 189, total_co2_saved_kg: 14.2, last_purchase_date: '2026-06-04', status: 'active' },
  { id: 'c3', full_name: 'James Koh', email: 'james@email.com', phone: '+65 9333 4444', loyalty_tier: 'eco_regular', loyalty_points: 380, total_purchases: 6, total_spend_sgd: 164, total_co2_saved_kg: 11.8, last_purchase_date: '2026-06-03', status: 'active' },
  { id: 'c4', full_name: 'Mei Lin Chen', email: 'mei@email.com', phone: '+65 9444 5555', loyalty_tier: 'orbitan_ambassador', loyalty_points: 1840, total_purchases: 32, total_spend_sgd: 894, total_co2_saved_kg: 72.1, last_purchase_date: '2026-06-02', status: 'vip' },
  { id: 'c5', full_name: 'Ahmad Rashid', email: 'ahmad@email.com', phone: '+65 9555 6666', loyalty_tier: 'green_starter', loyalty_points: 120, total_purchases: 2, total_spend_sgd: 75, total_co2_saved_kg: 5.4, last_purchase_date: '2026-06-02', status: 'active' },
  { id: 'c6', full_name: 'Nurul Huda', email: 'nurul@email.com', phone: '+65 9666 7777', loyalty_tier: 'sustainability_champion', loyalty_points: 920, total_purchases: 18, total_spend_sgd: 452, total_co2_saved_kg: 34.2, last_purchase_date: '2026-05-28', status: 'active' },
];

const TIER_MAP = {
  green_starter:            { label: 'Green Starter',            color: '#16A34A', bg: '#F0FDF4' },
  eco_regular:              { label: 'Eco Regular',              color: '#2563EB', bg: '#DBEAFE' },
  sustainability_champion:  { label: 'Sustainability Champion',  color: '#7C3AED', bg: '#EDE9FE' },
  orbitan_ambassador:       { label: 'Orbitan Ambassador',       color: '#D4AF37', bg: '#FEF9C3' },
};

const STATUS_MAP = {
  active: { label: 'Active', color: 'text-[#22C55E]', bg: 'bg-[#F0FDF4] border-green-200' },
  vip:    { label: 'VIP', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  inactive: { label: 'Inactive', color: 'text-muted-foreground', bg: 'bg-muted border-border' },
};

export default function T3Customers() {
  const [search, setSearch] = useState('');

  const filtered = DEMO_CUSTOMERS.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalCO2 = DEMO_CUSTOMERS.reduce((s, c) => s + c.total_co2_saved_kg, 0).toFixed(1);

  return (
    <AppShell navigation={NAV} title="Customers — Retail Ops">
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Customers"
          subtitle="Retail Operations · Customer profiles & sustainability loyalty"
          actions={
            <Button size="sm" className="gap-2" style={{ background: '#22C55E' }}>
              <Plus className="w-3.5 h-3.5" /> Add Customer
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Customers', value: DEMO_CUSTOMERS.length, color: 'text-foreground', bg: 'bg-card border-border' },
            { label: 'VIP Customers', value: DEMO_CUSTOMERS.filter(c => c.status === 'vip').length, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
            { label: 'Total CO₂ Saved', value: `${totalCO2}kg`, color: 'text-[#22C55E]', bg: 'bg-[#F0FDF4] border-green-200' },
            { label: 'Total Community Spend', value: `S$${DEMO_CUSTOMERS.reduce((s, c) => s + c.total_spend_sgd, 0).toLocaleString()}`, color: 'text-primary', bg: 'bg-orbitan-blue-light border-blue-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
              <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Search customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Customer Cards */}
        <div className="space-y-3">
          {filtered.map(c => {
            const tier = TIER_MAP[c.loyalty_tier] || TIER_MAP.green_starter;
            const statusCfg = STATUS_MAP[c.status] || STATUS_MAP.active;
            return (
              <div key={c.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow">
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
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${statusCfg.bg} ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{c.email} · {c.phone}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ color: tier.color, background: tier.bg }}>
                        {tier.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{c.loyalty_points} pts</span>
                      <span className="text-xs text-muted-foreground">{c.total_purchases} purchases</span>
                      <span className="text-xs font-medium text-foreground">S${c.total_spend_sgd} total</span>
                      <span className="text-xs text-emerald-600">{c.total_co2_saved_kg}kg CO₂ saved</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}