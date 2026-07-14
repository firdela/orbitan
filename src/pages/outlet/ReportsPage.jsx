import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import {
  BarChart2, TrendingUp, DollarSign, Package, CheckCircle2, Loader2, Activity,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PerformanceHeatmap from '@/components/reporting/PerformanceHeatmap';



export default function ReportsPage() {
  const { data: reconciliations = [], isLoading: recLoading } = useQuery({
    queryKey: ['outlet-reconciliations'],
    queryFn: () => base44.entities.DailyReconciliation.list('-date', 30),
  });

  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ['outlet-employees'],
    queryFn: () => base44.entities.Employee.list('-created_date', 100),
  });

  const { data: tasks = [], isLoading: taskLoading } = useQuery({
    queryKey: ['outlet-tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
  });

  const loading = recLoading || empLoading || taskLoading;

  const totalRevenue = reconciliations.reduce((s, r) => s + (r.total_revenue || 0), 0);
  const totalCogs = reconciliations.reduce((s, r) => s + (r.total_cogs || 0), 0);
  const grossProfit = totalRevenue - totalCogs;
  const avgMargin = reconciliations.length
    ? Math.round(reconciliations.reduce((s, r) => s + (r.gross_margin_pct || 0), 0) / reconciliations.length)
    : 0;
  const activeStaff = employees.filter(e => e.status === 'active').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  const chartData = reconciliations.length > 0
    ? reconciliations.slice(0, 7).reverse().map(r => ({
        day: r.date?.slice(5),
        revenue: r.total_revenue || 0,
        cogs: r.total_cogs || 0,
      }))
    : [];

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
        <PageHeader
          title="Reports"
          subtitle="Outlet performance · Refine principle"
        />

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2.5">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading reports…</span>
          </div>
        ) : (
          <>
            {/* KPI Stats — real data only, zero when empty */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard title="Total Revenue" value={`S$${totalRevenue.toLocaleString()}`} subtitle={reconciliations.length > 0 ? `${reconciliations.length} records` : 'No data yet'} icon={TrendingUp} color="green" />
              <StatCard title="Gross Profit" value={`S$${grossProfit.toLocaleString()}`} subtitle={reconciliations.length > 0 ? 'After COGS' : 'No data yet'} icon={DollarSign} color="blue" />
              <StatCard title="Avg Margin" value={reconciliations.length > 0 ? `${avgMargin}%` : '—'} subtitle="F&B target: 65-75%" icon={BarChart2} color="purple" />
              <StatCard title="Active Staff" value={activeStaff} subtitle={`${completedTasks} tasks done`} icon={CheckCircle2} color="amber" />
            </div>

            {/* Revenue vs COGS Chart — only when real data exists */}
            {chartData.length > 0 ? (
              <div className="bg-card border border-border rounded-xl p-5 mb-6">
                <h3 className="font-heading font-semibold text-sm mb-4">Revenue vs COGS (7-day)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      formatter={(v) => [`S$${v.toLocaleString()}`, '']}
                    />
                    <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="cogs" fill="#F97316" radius={[4, 4, 0, 0]} name="COGS" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="bg-card border border-dashed border-border rounded-xl p-8 mb-6">
                <EmptyState
                  icon={BarChart2}
                  title="No revenue data yet"
                  description="Create daily reconciliations in the Sales module to see revenue trends, profit margins, and COGS analysis here."
                  color="blue"
                />
              </div>
            )}

            {/* Worker Performance Heatmap */}
            <div className="bg-card border border-border rounded-xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-orbitan-blue" />
                <h3 className="font-heading font-semibold text-sm">Worker Performance Heatmap</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Punctuality and task completion rates across all staff. Scores are computed from clock-in records and task data.</p>
              <PerformanceHeatmap />
            </div>

            {/* Summary table — only when real data exists */}
            {reconciliations.length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="font-heading font-semibold text-sm">Recent Daily Reconciliations</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Revenue</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Profit</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reconciliations.slice(0, 7).map(rec => (
                        <tr key={rec.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{rec.date}</td>
                          <td className="px-4 py-3 text-right text-orbitan-green font-semibold">S${rec.total_revenue?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-semibold">S${rec.gross_profit?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{rec.gross_margin_pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}