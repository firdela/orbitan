import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { T3_NAV, T3_TENANT } from '@/lib/tenant-nav';

const MONTHLY_SALES = [];
const CATEGORY_BREAKDOWN = [];
const TOP_ITEMS = [];

export default function T3Reporting() {
  const [period, setPeriod] = useState('mtd');

  return (
    <AppShell navigation={T3_NAV} tenant={T3_TENANT} title="" headerRight={<TenantSwitcher />}>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <PageHeader
          title="Retail Reporting"
          subtitle="Retail Operations · Sales, sustainability & product performance"
          actions={
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-3.5 h-3.5" /> Export Report
            </Button>
          }
        />

        {/* Period Toggle */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
          {[{ id: 'mtd', label: 'This Month' }, { id: 'ytd', label: 'Year to Date' }, { id: '6m', label: '6 Months' }].map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${period === p.id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Revenue (MTD)', value: 'S$0', delta: '—', color: 'text-[#22C55E]', bg: 'bg-[#F0FDF4] border-green-200' },
            { label: 'Items Sold', value: '0 pcs', delta: '—', color: 'text-primary', bg: 'bg-orbitan-blue-light border-blue-200' },
            { label: 'Avg Item Price', value: 'S$0', delta: '—', color: 'text-foreground', bg: 'bg-card border-border' },
            { label: 'CO₂ Saved', value: '0 kg', delta: '—', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
              <p className={`text-xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              <p className={`text-xs font-medium mt-1 ${s.color}`}>{s.delta} vs last month</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-heading font-semibold text-foreground mb-4">Monthly Revenue (S$)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={MONTHLY_SALES} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`S$${v.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#22C55E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-heading font-semibold text-foreground mb-4">CO₂ Saved via Purchases (kg)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={MONTHLY_SALES}>
                <defs>
                  <linearGradient id="co2G" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v} kg`, 'CO₂ Saved']} />
                <Area type="monotone" dataKey="co2_saved" stroke="#22C55E" fill="url(#co2G)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products & Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-heading font-semibold text-foreground mb-4">Top Selling Items</h3>
            <div className="space-y-3">
              {TOP_ITEMS.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.sold} sold · Grade {item.grade}</p>
                  </div>
                  <span className="text-sm font-bold text-foreground flex-shrink-0">S${item.revenue}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-heading font-semibold text-foreground mb-4">Sales by Category</h3>
            <div className="space-y-2.5">
              {CATEGORY_BREAKDOWN.map(c => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-28 flex-shrink-0">{c.name}</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${c.value}%`, background: c.color }} />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-8 text-right">{c.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sustainability Banner */}
        <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #22C55E 0%, #15803D 100%)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-4">2026 Year-to-Date Sustainability Impact</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { label: 'Items Diverted from Landfill', value: '0 pcs', sub: 'awaiting data' },
              { label: 'CO₂ Saved', value: '0 kg', sub: 'awaiting data' },
              { label: 'Water Saved', value: '0L', sub: 'awaiting data' },
              { label: 'Customer Revenue', value: 'S$0', sub: 'awaiting data' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-2xl font-display font-bold">{s.value}</p>
                <p className="text-xs opacity-75 mt-0.5">{s.label}</p>
                <p className="text-[10px] opacity-50">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}