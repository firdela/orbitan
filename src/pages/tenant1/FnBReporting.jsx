import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, BarChart2 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { T1_NAV, T1_TENANT } from '@/lib/tenant-nav';

const WEEKLY_DATA = [
  { day: 'Mon', revenue: 1620, cogs: 632, profit: 988 },
  { day: 'Tue', revenue: 1788, cogs: 697, profit: 1091 },
  { day: 'Wed', revenue: 2100, cogs: 805, profit: 1295 },
  { day: 'Thu', revenue: 1842, cogs: 691, profit: 1151 },
  { day: 'Fri', revenue: 2340, cogs: 892, profit: 1448 },
  { day: 'Sat', revenue: 2810, cogs: 1065, profit: 1745 },
  { day: 'Sun', revenue: 950, cogs: 370, profit: 580 },
];

const MONTHLY_MARGIN = [
  { month: 'Jan', margin: 58.2 }, { month: 'Feb', margin: 59.1 },
  { month: 'Mar', margin: 60.5 }, { month: 'Apr', margin: 61.0 },
  { month: 'May', margin: 61.8 }, { month: 'Jun', margin: 62.4 },
];

const TOP_ITEMS = [
  { name: 'Birria Taco (3 pcs)', sales: 312, revenue: 2496, cogs: 936 },
  { name: 'Consommé Bowl', sales: 198, revenue: 1386, cogs: 520 },
  { name: 'Birria Quesadilla', sales: 145, revenue: 1160, cogs: 435 },
  { name: 'Loaded Nachos', sales: 88, revenue: 704, cogs: 264 },
  { name: 'House Agua Fresca', sales: 210, revenue: 630, cogs: 126 },
];

export default function FnBReporting() {
  const [period, setPeriod] = useState('week');

  const totalRevenue = WEEKLY_DATA.reduce((a, d) => a + d.revenue, 0);
  const totalCOGS = WEEKLY_DATA.reduce((a, d) => a + d.cogs, 0);
  const totalProfit = WEEKLY_DATA.reduce((a, d) => a + d.profit, 0);
  const avgMargin = ((totalProfit / totalRevenue) * 100).toFixed(1);

  return (
    <AppShell navigation={T1_NAV} tenant={T1_TENANT} title="" headerRight={<TenantSwitcher />}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="F&B Performance Reports"
          subtitle="La Birria Tacos · North Bridge Rd · Reporting Module"
          actions={
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {['week', 'month'].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${period === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                  {p === 'week' ? 'This Week' : 'This Month'}
                </button>
              ))}
            </div>
          }
        />

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2"><p className="text-xs text-muted-foreground">Total Revenue</p><DollarSign className="w-4 h-4 text-orbitan-green" /></div>
            <p className="text-2xl font-display font-bold text-orbitan-green">S${totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">7-day total</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2"><p className="text-xs text-muted-foreground">Total COGS</p><TrendingDown className="w-4 h-4 text-orbitan-red" /></div>
            <p className="text-2xl font-display font-bold text-orbitan-red">S${totalCOGS.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Ingredients + packaging</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2"><p className="text-xs text-muted-foreground">Gross Profit</p><TrendingUp className="w-4 h-4 text-orbitan-blue" /></div>
            <p className="text-2xl font-display font-bold text-orbitan-blue">S${totalProfit.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Revenue minus COGS</p>
          </div>
          <div className="bg-orbitan-green-light border border-green-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2"><p className="text-xs text-muted-foreground">Avg Gross Margin</p><BarChart2 className="w-4 h-4 text-orbitan-green" /></div>
            <p className="text-2xl font-display font-bold text-orbitan-green">{avgMargin}%</p>
            <p className="text-xs text-muted-foreground mt-1">↑ vs 60.1% prev week</p>
          </div>
        </div>

        {/* Revenue & Profit Chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Daily Revenue vs COGS vs Profit</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={WEEKLY_DATA} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v) => `S$${v.toLocaleString()}`} />
              <Bar dataKey="revenue" fill="hsl(var(--orbitan-blue))" name="Revenue" radius={[4,4,0,0]} />
              <Bar dataKey="cogs" fill="hsl(var(--orbitan-red))" name="COGS" radius={[4,4,0,0]} />
              <Bar dataKey="profit" fill="hsl(var(--orbitan-green))" name="Gross Profit" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Margin Trend */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-heading font-semibold text-foreground mb-4">Gross Margin Trend (Monthly)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={MONTHLY_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={[55, 65]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={v => `${v}%`} />
                <Line type="monotone" dataKey="margin" stroke="hsl(var(--orbitan-green))" strokeWidth={2.5} dot={{ fill: 'hsl(var(--orbitan-green))', r: 4 }} name="Margin" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Menu Items */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-heading font-semibold text-foreground mb-4">Top Menu Items (This Week)</h3>
            <div className="space-y-3">
              {TOP_ITEMS.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.sales} sold · COGS S${item.cogs}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm font-semibold text-orbitan-green">S${item.revenue}</p>
                    <p className="text-xs text-muted-foreground">{Math.round((1 - item.cogs / item.revenue) * 100)}% margin</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}