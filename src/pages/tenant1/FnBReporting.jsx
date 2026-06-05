import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, DollarSign, BarChart2, Activity, ShoppingBag, Loader2, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { T1_NAV, T1_TENANT } from '@/lib/tenant-nav';
import { format, subDays, startOfDay } from 'date-fns';

const T1_TENANT_ID = 'taqueria_pte_ltd';
const T1_OUTLET_ID = 'taqueria_pte_ltd_main';

// Benchmark/seed weekly data for visual richness
const WEEKLY_SEED = [
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

const PIE_COLORS = ['#F97316', '#2563EB', '#10B981', '#8B5CF6', '#EF4444'];

const TOP_ITEMS = [
  { name: 'Birria Taco (3 pcs)', sales: 312, revenue: 2496, cogs: 936 },
  { name: 'Consommé Bowl', sales: 198, revenue: 1386, cogs: 520 },
  { name: 'Birria Quesadilla', sales: 145, revenue: 1160, cogs: 435 },
  { name: 'Loaded Nachos', sales: 88, revenue: 704, cogs: 264 },
  { name: 'House Agua Fresca', sales: 210, revenue: 630, cogs: 126 },
];

function KPICard({ label, value, sub, icon: Icon, iconColor, bg, trend, trendVal }) {
  return (
    <div className={`rounded-2xl p-5 border ${bg || 'bg-card border-border'}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      <div className="flex items-center gap-2 mt-1.5">
        <p className="text-xs text-muted-foreground">{sub}</p>
        {trendVal && (
          <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trendVal}
          </span>
        )}
      </div>
    </div>
  );
}

export default function FnBReporting() {
  const [period, setPeriod] = useState('week');

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices', T1_TENANT_ID],
    queryFn: () => base44.entities.SalesInvoice.filter({ tenant_id: T1_TENANT_ID }),
  });

  const { data: syncQueue = [], isLoading: loadingSync } = useQuery({
    queryKey: ['financeSync', T1_TENANT_ID],
    queryFn: () => base44.entities.FinanceSyncQueue.filter({ tenant_id: T1_TENANT_ID }),
  });

  // Derive real metrics from live data or fall back to seed
  const liveRevenue = invoices.filter(i => i.payment_status === 'paid').reduce((a, i) => a + (i.total || 0), 0);
  const liveCOGS = invoices.filter(i => i.payment_status === 'paid').reduce((a, i) => a + (i.cogs_total || 0), 0);
  const liveProfit = liveRevenue - liveCOGS;
  const hasLiveData = invoices.length > 0;

  const totalRevenue = hasLiveData ? liveRevenue : WEEKLY_SEED.reduce((a, d) => a + d.revenue, 0);
  const totalCOGS = hasLiveData ? liveCOGS : WEEKLY_SEED.reduce((a, d) => a + d.cogs, 0);
  const totalProfit = hasLiveData ? liveProfit : WEEKLY_SEED.reduce((a, d) => a + d.profit, 0);
  const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  const pendingSync = syncQueue.filter(q => q.status === 'pending').length;
  const syncedCount = syncQueue.filter(q => q.status === 'synced').length;

  // Payment method breakdown for pie chart
  const paymentBreakdown = invoices.length > 0
    ? Object.entries(invoices.reduce((acc, inv) => { acc[inv.payment_method || 'other'] = (acc[inv.payment_method || 'other'] || 0) + (inv.total || 0); return acc; }, {}))
        .map(([name, value]) => ({ name, value: Math.round(value) }))
    : [{ name: 'paynow', value: 4200 }, { name: 'card', value: 3100 }, { name: 'cash', value: 1950 }];

  const isLoading = loadingInvoices || loadingSync;

  return (
    <AppShell navigation={T1_NAV} tenant={T1_TENANT} title="" headerRight={<TenantSwitcher />}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)' }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 10% 60%, #10B981 0%, transparent 50%), radial-gradient(circle at 90% 20%, #2563EB 0%, transparent 40%)' }} />
          <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4 text-emerald-300" />
                </div>
                <span className="text-emerald-300 text-xs font-semibold uppercase tracking-widest">Refine · Analytics</span>
              </div>
              <h1 className="text-2xl font-display font-bold">F&B Performance Reports</h1>
              <p className="text-white/60 text-sm mt-1">La Birria Tacos · North Bridge Rd · {hasLiveData ? `${invoices.length} live invoices` : 'Benchmark data'}</p>
            </div>
            <div className="flex items-center gap-2">
              {!hasLiveData && <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-lg">Using benchmark data</span>}
              <div className="flex gap-1 bg-white/10 rounded-lg p-1">
                {['week', 'month'].map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${period === p ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}>
                    {p === 'week' ? 'This Week' : 'This Month'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* KPI Strip inside hero */}
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Total Revenue', value: `S$${totalRevenue.toLocaleString()}`, color: 'text-emerald-300' },
              { label: 'Total COGS', value: `S$${totalCOGS.toLocaleString()}`, color: 'text-red-300' },
              { label: 'Gross Profit', value: `S$${totalProfit.toLocaleString()}`, color: 'text-blue-300' },
              { label: 'Gross Margin', value: `${avgMargin}%`, color: 'text-white' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <p className="text-[10px] text-white/60 uppercase tracking-wider mb-1">{label}</p>
                <p className={`text-xl font-display font-bold ${color}`}>{isLoading ? '–' : value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Xero Sync Status */}
        {syncQueue.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800">Finance Sync Queue Active</p>
              <p className="text-xs text-blue-600">{syncedCount} synced · {pendingSync} pending Xero sync</p>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${pendingSync > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {pendingSync > 0 ? `${pendingSync} Pending` : '✓ All Synced'}
            </span>
          </div>
        )}

        {/* Revenue vs COGS vs Profit Chart */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-heading font-semibold text-foreground">Daily Revenue vs COGS vs Profit</h3>
              <p className="text-xs text-muted-foreground mt-0.5">7-day performance overview</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-medium">
              {[{ color: '#2563EB', label: 'Revenue' }, { color: '#EF4444', label: 'COGS' }, { color: '#10B981', label: 'Profit' }].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} /><span className="text-muted-foreground">{label}</span></div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={WEEKLY_SEED} barGap={2} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${v}`} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [`S$${v.toLocaleString()}`, '']} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
              <Bar dataKey="revenue" fill="#2563EB" name="Revenue" radius={[4,4,0,0]} />
              <Bar dataKey="cogs" fill="#EF4444" name="COGS" radius={[4,4,0,0]} />
              <Bar dataKey="profit" fill="#10B981" name="Gross Profit" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Margin Trend */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
            <div className="mb-4">
              <h3 className="font-heading font-semibold text-foreground">Gross Margin Trend</h3>
              <p className="text-xs text-muted-foreground mt-0.5">6-month performance — trending <span className="text-emerald-600 font-semibold">↑ +4.2%</span></p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={MONTHLY_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis domain={[56, 64]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => [`${v}%`, 'Gross Margin']} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="margin" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', r: 5, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} name="Margin" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Payment Mix Pie */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-heading font-semibold text-foreground mb-1">Payment Mix</h3>
            <p className="text-xs text-muted-foreground mb-4">By payment method</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={paymentBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {paymentBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`S$${v.toLocaleString()}`, n]} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {paymentBreakdown.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} /><span className="text-muted-foreground capitalize">{item.name}</span></div>
                  <span className="font-medium">S${item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Menu Items */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div><h3 className="font-heading font-semibold text-foreground">Top Menu Items</h3><p className="text-xs text-muted-foreground mt-0.5">By revenue this week</p></div>
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {TOP_ITEMS.map((item, i) => {
              const marginPct = Math.round((1 - item.cogs / item.revenue) * 100);
              const barW = Math.round((item.revenue / TOP_ITEMS[0].revenue) * 100);
              return (
                <div key={item.name} className="flex items-center gap-4">
                  <span className="text-xs font-bold text-muted-foreground w-5 flex-shrink-0">#{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        <span className="text-xs text-muted-foreground">{item.sales} sold</span>
                        <span className={`text-xs font-semibold ${marginPct >= 60 ? 'text-emerald-600' : 'text-amber-600'}`}>{marginPct}% margin</span>
                        <span className="text-sm font-bold text-foreground">S${item.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all" style={{ width: `${barW}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}