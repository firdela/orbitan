import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { T2_NAV, T2_TENANT } from '@/lib/tenant-nav';

const MONTHLY_DATA = [
  { month: 'Jan', weight_kg: 5200, co2_saved: 8.1, revenue: 4100 },
  { month: 'Feb', weight_kg: 5800, co2_saved: 9.0, revenue: 4600 },
  { month: 'Mar', weight_kg: 6400, co2_saved: 9.9, revenue: 5200 },
  { month: 'Apr', weight_kg: 7100, co2_saved: 11.0, revenue: 5800 },
  { month: 'May', weight_kg: 7600, co2_saved: 11.8, revenue: 6200 },
  { month: 'Jun', weight_kg: 8420, co2_saved: 12.4, revenue: 6840 },
];

const MATERIAL_BREAKDOWN = [
  { material: 'Paper/Cardboard', weight: 3200, pct: 38, color: '#D97706' },
  { material: 'Plastics', weight: 2100, pct: 25, color: '#2563EB' },
  { material: 'Metals', weight: 1260, pct: 15, color: '#64748B' },
  { material: 'Textiles', weight: 840, pct: 10, color: '#EC4899' },
  { material: 'E-Waste', weight: 420, pct: 5, color: '#7C3AED' },
  { material: 'Others', weight: 600, pct: 7, color: '#94A3B8' },
];

export default function T2Reporting() {
  const [period, setPeriod] = useState('mtd');

  return (
    <AppShell navigation={T2_NAV} tenant={T2_TENANT} title="" headerRight={<TenantSwitcher />}>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <PageHeader
          title="Sustainability Reporting"
          subtitle="Renewed Resources Pte Ltd · Environmental & operational KPIs"
          actions={
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-3.5 h-3.5" /> Export Report
            </Button>
          }
        />

        {/* Period Toggle */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
          {[{ id: 'mtd', label: 'This Month' }, { id: 'ytd', label: 'Year to Date' }, { id: '6m', label: '6 Months' }].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${period === p.id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Materials Collected', value: '8,420 kg', delta: '+23%', color: 'text-[#16A34A]', bg: 'bg-[#F0FDF4] border-green-200' },
            { label: 'CO₂ Saved', value: '12.4 tonnes', delta: '+31%', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
            { label: 'Revenue (MTD)', value: 'S$6,840', delta: '+12%', color: 'text-primary', bg: 'bg-orbitan-blue-light border-blue-200' },
            { label: 'Trees Equivalent', value: '568 trees', delta: 'saved', color: 'text-[#16A34A]', bg: 'bg-[#F0FDF4] border-green-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
              <p className={`text-xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              <p className={`text-xs font-medium mt-1 ${s.color}`}>{s.delta} vs last month</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Collections Volume */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-heading font-semibold text-foreground mb-4">Collections Volume (kg)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={MONTHLY_DATA} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v.toLocaleString()} kg`, 'Weight']} />
                <Bar dataKey="weight_kg" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* CO2 Trend */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-heading font-semibold text-foreground mb-4">CO₂ Saved Trend (tonnes)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={MONTHLY_DATA}>
                <defs>
                  <linearGradient id="co2Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v}t CO₂`, 'Saved']} />
                <Area type="monotone" dataKey="co2_saved" stroke="#16A34A" fill="url(#co2Gradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Material Breakdown */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Material Breakdown — June 2026</h3>
          <div className="space-y-3">
            {MATERIAL_BREAKDOWN.map(m => (
              <div key={m.material} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-32 flex-shrink-0">{m.material}</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${m.pct}%`, background: m.color }} />
                </div>
                <span className="text-sm font-semibold text-foreground w-20 text-right">{m.weight.toLocaleString()} kg</span>
                <span className="text-xs text-muted-foreground w-8 text-right">{m.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Impact Banner */}
        <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #16A34A 0%, #14532D 100%)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-4">2026 Year-to-Date Sustainability Impact</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { label: 'Total Materials Recovered', value: '38.5t', sub: 'from landfill' },
              { label: 'CO₂ Equivalent Saved', value: '62.4t', sub: 'CO₂e' },
              { label: 'Trees Equivalent', value: '2,847', sub: 'trees saved' },
              { label: 'Revenue Generated', value: 'S$32,780', sub: 'from recovered materials' },
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