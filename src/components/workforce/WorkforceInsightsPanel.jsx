// ============================================================
// OrbitanOS — WorkforceInsightsPanel
// "Refine" Principle — AI-powered workforce analytics surface
// Connects ClockRecord data → workforceInsights function → AI
// EXIT-READY: Pure React component, no platform lock-in.
// ============================================================

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import {
  Brain, TrendingUp, TrendingDown, Users, Clock, AlertTriangle,
  CheckCircle2, Sparkles, RefreshCw, DollarSign, Target, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';

const KPICard = ({ label, value, sub, icon: Icon, color = 'text-foreground', trend }) => (
  <div className="bg-card border border-border rounded-xl p-4 space-y-1 card-elevated">
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      {Icon && <Icon className={cn('w-4 h-4', color)} />}
    </div>
    <p className={cn('text-2xl font-display font-bold', color)}>{value ?? '—'}</p>
    {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    {trend != null && (
      <div className={cn('flex items-center gap-1 text-[11px]', trend >= 0 ? 'text-green-600' : 'text-destructive')}>
        {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(trend).toFixed(1)}%
      </div>
    )}
  </div>
);

const RecommendationCard = ({ rec, index }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-accent/40 transition-colors text-left gap-3"
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <span className="font-medium text-sm">{rec.title}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {rec.estimated_saving_sgd > 0 && (
            <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px]">
              Save ~SGD {rec.estimated_saving_sgd?.toFixed(0)}
            </Badge>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 py-3 bg-muted/30 text-sm text-muted-foreground border-t border-border">
          {rec.reasoning}
        </div>
      )}
    </div>
  );
};

export default function WorkforceInsightsPanel({ tenantId, outletId, className }) {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchInsights = async (withAI = false) => {
    withAI ? setAiLoading(true) : setLoading(true);
    setError(null);
    const res = await base44.functions.invoke('workforceInsights', {
      tenant_id: tenantId,
      outlet_id: outletId,
      date_from: dateFrom,
      date_to: dateTo,
      generate_ai_report: withAI,
    });
    if (res.data?.success) {
      setData(res.data);
    } else {
      setError(res.data?.error || 'Failed to load insights');
    }
    withAI ? setAiLoading(false) : setLoading(false);
  };

  const s = data?.summary;
  const dailyPnL = data?.daily_pnl || [];
  const employees = data?.employee_summaries || [];
  const aiReport = data?.ai_report;

  return (
    <div className={cn('space-y-6', className)}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
            <Brain className="w-5 h-5 text-orbitan-purple" />
            Workforce Insights
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">OrbitanOS Refine Principle — AI-powered shift analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="text-xs border border-border rounded-lg px-3 py-1.5 bg-card"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <span className="text-xs text-muted-foreground font-medium">{dateTo}</span>
          <Button size="sm" variant="outline" onClick={() => fetchInsights(false)} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Load
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!data && !loading && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 py-16 flex flex-col items-center gap-3 text-center">
          <Brain className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground font-medium">Load workforce data to see insights</p>
          <Button onClick={() => fetchInsights(false)} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Load Insights
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {data && !loading && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard
              label="Total Labour Cost"
              value={`SGD ${s.total_labour_cost_sgd?.toFixed(0)}`}
              sub={`${s.total_hours_worked?.toFixed(0)}h worked`}
              icon={DollarSign}
              color="text-orbitan-blue"
            />
            <KPICard
              label="Labour % of Revenue"
              value={s.labour_as_pct_revenue != null ? `${s.labour_as_pct_revenue?.toFixed(1)}%` : 'N/A'}
              sub={`SGD ${s.total_revenue_sgd?.toFixed(0)} revenue`}
              icon={TrendingUp}
              color={s.labour_as_pct_revenue > 35 ? 'text-destructive' : 'text-green-600'}
            />
            <KPICard
              label="Avg Productivity"
              value={s.avg_productivity_score != null ? `${s.avg_productivity_score?.toFixed(0)}%` : 'N/A'}
              sub={`${s.total_employees} employees`}
              icon={Target}
              color="text-orbitan-purple"
            />
            <KPICard
              label="Compliance Rate"
              value={`${s.compliance_rate_pct?.toFixed(0)}%`}
              sub={s.pending_verification_count > 0 ? `${s.pending_verification_count} pending review` : 'All records verified'}
              icon={s.pending_verification_count > 0 ? AlertTriangle : CheckCircle2}
              color={s.pending_verification_count > 0 ? 'text-orbitan-amber' : 'text-green-600'}
            />
          </div>

          {/* Labour vs Revenue Chart */}
          {dailyPnL.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm font-semibold text-foreground mb-4">Daily Labour Cost vs Revenue</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyPnL} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                    formatter={(val, name) => [`SGD ${Number(val).toFixed(2)}`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="total_revenue" name="Revenue" fill="#2563EB" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="total_labour_cost" name="Labour Cost" fill="#F97316" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Employee Productivity Table */}
          {employees.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Employee Performance
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Employee</th>
                      <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Shifts</th>
                      <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Avg Hours</th>
                      <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Productivity</th>
                      <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Labour Cost</th>
                      <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp.employee_id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-foreground">{emp.employee_name}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{emp.total_shifts}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{emp.avg_hours?.toFixed(1)}h</td>
                        <td className="px-4 py-2.5 text-right">
                          {emp.avg_productivity != null ? (
                            <span className={cn('font-semibold', emp.avg_productivity >= 75 ? 'text-green-600' : emp.avg_productivity >= 50 ? 'text-orbitan-amber' : 'text-destructive')}>
                              {emp.avg_productivity?.toFixed(0)}%
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">SGD {emp.total_labour_cost?.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">
                          {emp.pending_verification_count > 0
                            ? <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px]">⚠ Pending</Badge>
                            : <Badge className="bg-green-50 text-green-700 border-green-200 text-[9px]">✓ Clear</Badge>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI Shift Optimiser */}
          {!aiReport && (
            <div className="rounded-xl border border-dashed border-orbitan-purple/30 bg-orbitan-purple-light/20 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orbitan-purple" />
                  AI Shift Optimiser
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Generate AI-powered shift scheduling recommendations from this data. Uses premium AI credits.
                </p>
              </div>
              <Button
                onClick={() => fetchInsights(true)}
                disabled={aiLoading}
                className="gradient-business text-white gap-2 flex-shrink-0"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                {aiLoading ? 'Analysing...' : 'Run AI Optimiser'}
              </Button>
            </div>
          )}

          {aiReport && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orbitan-purple" />
                <h4 className="font-heading font-bold text-sm text-foreground">AI Shift Optimiser Report</h4>
                <Badge className="bg-orbitan-purple-light text-orbitan-purple border-orbitan-purple/20 text-[10px]">Refine</Badge>
              </div>

              {/* Analysis narratives */}
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { label: 'Peak Hours', content: aiReport.peak_hours_analysis, icon: TrendingUp, color: 'text-blue-600' },
                  { label: 'Underperforming Shifts', content: aiReport.underperforming_shifts, icon: TrendingDown, color: 'text-destructive' },
                  { label: 'Overstaffing Risks', content: aiReport.overstaffing_risks, icon: AlertTriangle, color: 'text-orbitan-amber' },
                ].map(item => (
                  <div key={item.label} className="bg-card border border-border rounded-xl p-4">
                    <p className={cn('text-xs font-semibold mb-2 flex items-center gap-1.5', item.color)}>
                      <item.icon className="w-3.5 h-3.5" /> {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.content}</p>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              {aiReport.recommendations?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Top Recommendations</p>
                    {aiReport.estimated_total_savings_sgd > 0 && (
                      <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                        Est. save SGD {aiReport.estimated_total_savings_sgd?.toFixed(0)}/period
                      </Badge>
                    )}
                  </div>
                  {aiReport.recommendations.map((rec, i) => (
                    <RecommendationCard key={i} rec={rec} index={i} />
                  ))}
                </div>
              )}

              {/* Training Focus */}
              {aiReport.training_focus && (
                <div className="bg-orbitan-blue-light border border-orbitan-blue/20 rounded-xl p-4">
                  <p className="text-xs font-semibold text-orbitan-blue mb-1.5 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" /> Training Focus (Renew Principle)
                  </p>
                  <p className="text-xs text-muted-foreground">{aiReport.training_focus}</p>
                </div>
              )}

              {/* Review Checklist */}
              {aiReport.review_checklist?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs font-semibold text-foreground mb-2">Manager Review Checklist</p>
                  <ul className="space-y-1.5">
                    {aiReport.review_checklist.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}