import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  ShieldCheck, AlertTriangle, XCircle, Eye, FileLock2,
  Activity, TrendingUp, Layers
} from 'lucide-react';

const SHIELD_COLORS = {
  pass: '#16A34A',
  blocked: '#DC2626',
  notify: '#F59E0B',
  override_approved: '#2563EB',
  override_denied: '#7C3AED',
  override_requested: '#06B6D4',
  not_evaluated: '#94A3B8'
};

const MODULE_LABELS = {
  finance: 'Finance',
  inventory: 'Inventory',
  procurement: 'Procurement',
  workforce: 'Workforce',
  compliance: 'Compliance',
  sales: 'Sales',
  scheduling: 'Scheduling',
  retail: 'Retail',
  sustainability: 'Sustainability',
  system: 'System'
};

export default function AuditReadinessAnalytics() {
  const { data: auditLogs = [], isLoading: loadingAudit } = useQuery({
    queryKey: ['audit-readiness-logs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 200),
  });

  const { data: complianceRecords = [], isLoading: loadingComp } = useQuery({
    queryKey: ['audit-readiness-compliance'],
    queryFn: () => base44.entities.ComplianceRecord.list('-created_date', 200),
  });

  const isLoading = loadingAudit || loadingComp;

  const metrics = useMemo(() => {
    const totalEvents = auditLogs.length;
    const passed = auditLogs.filter(l => l.shield_outcome === 'pass').length;
    const blocked = auditLogs.filter(l => l.shield_outcome === 'blocked').length;
    const notified = auditLogs.filter(l => l.shield_outcome === 'notify').length;
    const overrides = auditLogs.filter(l =>
      ['override_approved', 'override_denied', 'override_requested'].includes(l.shield_outcome)
    ).length;
    const notEvaluated = auditLogs.filter(l => l.shield_outcome === 'not_evaluated' || !l.shield_outcome).length;

    const readinessScore = totalEvents > 0
      ? Math.round(((passed + notEvaluated) / totalEvents) * 100)
      : 100;

    // Shield outcome breakdown for pie chart
    const shieldBreakdown = [
      { name: 'Pass', value: passed, color: SHIELD_COLORS.pass },
      { name: 'Blocked', value: blocked, color: SHIELD_COLORS.blocked },
      { name: 'Notify', value: notified, color: SHIELD_COLORS.notify },
      { name: 'Overrides', value: overrides, color: SHIELD_COLORS.override_approved },
      { name: 'Not Evaluated', value: notEvaluated, color: SHIELD_COLORS.not_evaluated },
    ].filter(d => d.value > 0);

    // Module distribution for bar chart
    const moduleCounts = {};
    auditLogs.forEach(l => {
      const mod = l.module || 'system';
      moduleCounts[mod] = (moduleCounts[mod] || 0) + 1;
    });
    const moduleData = Object.entries(moduleCounts)
      .map(([key, count]) => ({ name: MODULE_LABELS[key] || key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Compliance record breakdown
    const compApproved = complianceRecords.filter(r => r.status === 'approved').length;
    const compPending = complianceRecords.filter(r => ['pending', 'in_review', 'submitted'].includes(r.status)).length;
    const compOverdue = complianceRecords.filter(r => r.status === 'overdue').length;
    const compRejected = complianceRecords.filter(r => r.status === 'rejected').length;
    const signedRecords = complianceRecords.filter(r => r.signature_hash).length;

    return {
      totalEvents, passed, blocked, notified, overrides, notEvaluated,
      readinessScore,
      shieldBreakdown, moduleData,
      compApproved, compPending, compOverdue, compRejected,
      signedRecords,
      totalCompliance: complianceRecords.length
    };
  }, [auditLogs, complianceRecords]);

  const recentEvents = useMemo(() =>
    auditLogs.slice(0, 8),
    [auditLogs]
  );

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading audit analytics…
      </div>
    );
  }

  const scoreColor = metrics.readinessScore >= 90
    ? 'text-orbitan-green'
    : metrics.readinessScore >= 70
    ? 'text-orbitan-amber'
    : 'text-orbitan-red';

  const scoreBg = metrics.readinessScore >= 90
    ? 'bg-orbitan-green-light'
    : metrics.readinessScore >= 70
    ? 'bg-orbitan-amber-light'
    : 'bg-orbitan-red-light';

  return (
    <div className="space-y-6">
      {/* Readiness Score Banner */}
      <div className={`border rounded-xl p-5 flex items-center gap-6 ${scoreBg}`}>
        <div className="text-center flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-card border-2 border-border flex items-center justify-center mb-1">
            <ShieldCheck className={`w-8 h-8 ${scoreColor}`} />
          </div>
          <p className={`text-3xl font-display font-bold ${scoreColor}`}>{metrics.readinessScore}%</p>
          <p className="text-[11px] text-muted-foreground">Audit Ready</p>
        </div>
        <div className="w-px h-16 bg-border/60" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
          <div>
            <p className="text-xl font-bold text-foreground">{metrics.totalEvents}</p>
            <p className="text-xs text-muted-foreground">Total Events</p>
          </div>
          <div>
            <p className="text-xl font-bold text-orbitan-green">{metrics.passed}</p>
            <p className="text-xs text-muted-foreground">Shield Passed</p>
          </div>
          <div>
            <p className="text-xl font-bold text-orbitan-red">{metrics.blocked}</p>
            <p className="text-xs text-muted-foreground">Blocked</p>
          </div>
          <div>
            <p className="text-xl font-bold text-orbitan-blue">{metrics.signedRecords}</p>
            <p className="text-xs text-muted-foreground">Signed Records</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shield Outcome Breakdown */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileLock2 className="w-4 h-4 text-orbitan-blue" />
            <h3 className="font-heading font-semibold text-sm">Shield Outcome Breakdown</h3>
          </div>
          {metrics.shieldBreakdown.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No shield events recorded yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={metrics.shieldBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={45}
                  paddingAngle={2}
                >
                  {metrics.shieldBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Module Distribution */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-orbitan-purple" />
            <h3 className="font-heading font-semibold text-sm">Audit Events by Module</h3>
          </div>
          {metrics.moduleData.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No audit events logged yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={metrics.moduleData} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Compliance Record Summary */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-orbitan-green" />
          <h3 className="font-heading font-semibold text-sm">Compliance Trail Status</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-display font-bold text-foreground">{metrics.totalCompliance}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Total Records</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-orbitan-green-light/50">
            <p className="text-2xl font-display font-bold text-orbitan-green">{metrics.compApproved}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Approved</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-orbitan-amber-light/50">
            <p className="text-2xl font-display font-bold text-orbitan-amber">{metrics.compPending}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Pending</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-orbitan-red-light/50">
            <p className="text-2xl font-display font-bold text-orbitan-red">{metrics.compOverdue}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Overdue</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-display font-bold text-orbitan-blue">{metrics.signedRecords}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Digitally Signed</p>
          </div>
        </div>
      </div>

      {/* Recent Audit Events */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Activity className="w-4 h-4 text-orbitan-blue" />
          <h3 className="font-heading font-semibold text-sm">Recent Audit Trail Events</h3>
        </div>
        {recentEvents.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            No audit events recorded. Actions will appear here as they occur.
          </div>
        ) : (
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {recentEvents.map(log => (
              <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {log.shield_outcome === 'blocked'
                    ? <XCircle className="w-4 h-4 text-orbitan-red" />
                    : log.shield_outcome === 'notify'
                    ? <AlertTriangle className="w-4 h-4 text-orbitan-amber" />
                    : log.shield_outcome === 'pass'
                    ? <ShieldCheck className="w-4 h-4 text-orbitan-green" />
                    : <Eye className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {log.details || log.action_type?.replace(/_/g, ' ')}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {log.actor_name || 'System'} · {MODULE_LABELS[log.module] || log.module || '—'}
                    {log.target_entity && ` · ${log.target_entity}`}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    log.shield_outcome === 'blocked' ? 'bg-orbitan-red-light text-orbitan-red' :
                    log.shield_outcome === 'pass' ? 'bg-orbitan-green-light text-orbitan-green' :
                    log.shield_outcome === 'notify' ? 'bg-orbitan-amber-light text-orbitan-amber' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {(log.shield_outcome || 'not_evaluated').replace(/_/g, ' ')}
                  </span>
                  {log.created_date && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(log.created_date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}