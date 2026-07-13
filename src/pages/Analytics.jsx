import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import {
  DollarSign, Users, Package, TrendingUp, Loader2, Activity,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE_COLORS = ['#2563EB', '#F97316', '#16A34A', '#7C3AED', '#EAB308', '#06B6D4', '#EC4899', '#64748B'];

function fmtMoney(v) {
  return `S$${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function compactMoney(v) {
  return v >= 1000 ? `S$${(v / 1000).toFixed(0)}k` : `S$${v}`;
}

export default function AnalyticsPage() {
  const { data: inventory = [], isLoading: invLoading } = useQuery({
    queryKey: ['analytics-inventory'],
    queryFn: () => base44.entities.InventoryItem.list('-created_date', 200),
  });
  const { data: clocks = [], isLoading: clockLoading } = useQuery({
    queryKey: ['analytics-clocks'],
    queryFn: () => base44.entities.ClockRecord.list('-created_date', 200),
  });
  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['analytics-sales'],
    queryFn: () => base44.entities.SalesInvoice.list('-created_date', 200),
  });

  const loading = invLoading || clockLoading || salesLoading;

  const stats = useMemo(() => {
    const inventoryValue = inventory.reduce((s, i) => s + (i.current_stock || 0) * (i.cost_per_unit || 0), 0);
    const lowStock = inventory.filter(i => i.reorder_point != null && (i.current_stock || 0) <= (i.reorder_point || 0)).length;
    const workforceCost = clocks.reduce((s, c) => s + (c.total_shift_cost || 0), 0);
    const totalHours = clocks.reduce((s, c) => s + (c.total_hours_worked || 0), 0);
    const revenue = sales.reduce((s, inv) => s + (inv.total || 0), 0);
    const grossProfit = sales.reduce((s, inv) => s + (inv.gross_profit || 0), 0);
    return { inventoryValue, lowStock, workforceCost, totalHours, revenue, grossProfit };
  }, [inventory, clocks, sales]);

  const workforceTrend = useMemo(() => {
    const byDate = {};
    clocks.forEach(c => {
      const d = (c.date || '').slice(0, 10);
      if (!d) return;
      byDate[d] = (byDate[d] || 0) + (c.total_shift_cost || 0);
    });
    return Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([date, cost]) => ({ day: date.slice(5), cost: Math.round(cost) }));
  }, [clocks]);

  const revenueTrend = useMemo(() => {
    const byDate = {};
    sales.forEach(s => {
      const d = (s.date || '').slice(0, 10);
      if (!d) return;
      byDate[d] = (byDate[d] || 0) + (s.total || 0);
    });
    return Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([date, rev]) => ({ day: date.slice(5), revenue: Math.round(rev) }));
  }, [sales]);

  const inventoryByCategory = useMemo(() => {
    const byCat = {};
    inventory.forEach(i => {
      const cat = i.category || 'Uncategorised';
      byCat[cat] = (byCat[cat] || 0) + (i.current_stock || 0) * (i.cost_per_unit || 0);
    });
    return Object.entries(byCat)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [inventory]);

  const hasData = inventory.length > 0 || clocks.length > 0 || sales.length > 0;

  const tooltipStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    fontSize: 12,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <PageHeader title="Analytics Overview" subtitle="Cross-outlet insights · Refine principle" />

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2.5">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading analytics…</span>
        </div>
      ) : !hasData ? (
        <div className="bg-card border border-dashed border-border rounded-xl">
          <EmptyState
            icon={Activity}
            title="No operational data yet"
            description="Once you start recording inventory, clock-ins, and sales, this dashboard will aggregate insights across your outlets — inventory movement, workforce costs, and revenue trends."
            color="blue"
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Revenue" value={fmtMoney(stats.revenue)} subtitle={`${sales.length} invoices`} icon={DollarSign} color="green" />
            <StatCard title="Gross Profit" value={fmtMoney(stats.grossProfit)} subtitle={stats.revenue > 0 ? `${Math.round((stats.grossProfit / stats.revenue) * 100)}% margin` : 'No data'} icon={TrendingUp} color="blue" />
            <StatCard title="Workforce Cost" value={fmtMoney(stats.workforceCost)} subtitle={`${Math.round(stats.totalHours)} hrs logged`} icon={Users} color="purple" />
            <StatCard title="Inventory Value" value={fmtMoney(stats.inventoryValue)} subtitle={`${stats.lowStock} low-stock items`} icon={Package} color="amber" />
          </div>

          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <h3 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orbitan-green" />Revenue Trend
            </h3>
            {revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={compactMoney} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtMoney(v), 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#16A34A" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center">No sales data recorded yet.</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-orbitan-purple" />Workforce Cost Trend
              </h3>
              {workforceTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={workforceTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={compactMoney} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtMoney(v), 'Labour Cost']} />
                    <Bar dataKey="cost" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground py-8 text-center">No workforce clock-in data recorded yet.</p>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-orbitan-amber" />Inventory Value by Category
              </h3>
              {inventoryByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={inventoryByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                      {inventoryByCategory.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground py-8 text-center">No inventory data recorded yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}