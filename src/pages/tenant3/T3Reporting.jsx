import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { T3_NAV, T3_TENANT } from '@/lib/tenant-nav';

const MONTHLY_SALES = [
  { month: 'Jan', revenue: 2100, items: 48, co2_saved: 112 },
  { month: 'Feb', revenue: 2450, items: 55, co2_saved: 138 },
  { month: 'Mar', revenue: 2800, items: 64, co2_saved: 158 },
  { month: 'Apr', revenue: 3200, items: 72, co2_saved: 184 },
  { month: 'May', revenue: 3750, items: 84, co2_saved: 218 },
  { month: 'Jun', revenue: 4280, items: 89, co2_saved: 240 },
];

const CATEGORY_BREAKDOWN = [
  { name: 'Tops', value: 38, color: '#EC4899' },
  { name: 'Bottoms', value: 25, color: '#3B82F6' },
  { name: 'Outerwear', value: 15, color: '#F59E0B' },
  { name: 'Footwear', value: 10, color: '#8B5CF6' },
  { name: 'Bags & Accessories', value: 8, color: '#14B8A6' },
  { name: 'Other', value: 4, color: '#94A3B8' },
];

const TOP_ITEMS = [
  { name: "Vintage Levi's Denim Jacket", sold: 12, revenue: 576, grade: 'B' },
  { name: 'Upcycled Patchwork Tees', sold: 28, revenue: 504, grade: 'E' },
  { name: 'North Face Fleece Jacket', sold: 6, revenue: 450, grade: 'B' },
  { name: 'Nike Running Shorts', sold: 18, revenue: 396, grade: 'C' },
  { name: 'Leather Tote Bags', sold: 8, revenue: 384, grade: 'B' },
];

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
            { label: 'Revenue (MTD)', value: 'S$4,280', delta: '+28%', color: 'text-[#22C55E]', bg: 'bg-[#F0FDF4] border-green-200' },
            { label: 'Items Sold', value: '89 pcs', delta: '+15%', color: 'text-primary', bg: 'bg-orbitan-blue-light border-blue-200' },
            { label: 'Avg Item Price', value: 'S$48.09', delta: '+11%', color: 'text-foreground', bg: 'bg-card border-border' },
            { label: 'CO₂ Saved', value: '240 kg', delta: 'via purchases', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
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
              { label: 'Items Diverted from Landfill', value: '424 pcs', sub: 'sold & reused' },
              { label: 'CO₂ Saved', value: '1,050 kg', sub: 'via upcycled purchases' },
              { label: 'Water Saved', value: '42,000L', sub: 'vs buying new' },
              { label: 'Customer Revenue', value: 'S$19,580', sub: 'year-to-date' },
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