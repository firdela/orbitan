import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Activity, AlertTriangle, RefreshCw, Shield, Bug, Sparkles,
  CheckCircle2, RefreshCcw, ArrowRight, Zap, Cpu
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  green: { bg: 'bg-green-50', text: 'text-green-600', ring: 'ring-green-200', bar: 'bg-green-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-200', bar: 'bg-amber-500' },
  red:   { bg: 'bg-red-50',   text: 'text-red-600',   ring: 'ring-red-200',   bar: 'bg-red-500' },
};

const INSIGHT_ICONS = { AlertTriangle, Bug, RefreshCw, Shield, Sparkles, CheckCircle2 };

const PRINCIPLE_COLORS = {
  respond: 'text-red-500', refine: 'text-orbitan-blue', regulate: 'text-[#D4AF37]',
  renew: 'text-orbitan-purple', relate: 'text-orbitan-green', reach: 'text-orbitan-amber',
};

export default function SystemHealthScoreboard() {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['platform-health'],
    queryFn: async () => {
      const res = await base44.functions.invoke('orbitanOrchestrator', { scope: 'platform' });
      return res.data;
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 animate-pulse h-48 flex items-center justify-center">
        <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const colors = STATUS_COLORS[data.health_status] || STATUS_COLORS.green;
  const metrics = data.metrics || {};
  const systemState = data.system_state || {};

  return (
    <div className="space-y-4">
      {/* ── Health Score Ring ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colors.bg)}>
              <Activity className={cn('w-4 h-4', colors.text)} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Platform Health Score</p>
              <p className="text-xs text-muted-foreground">Cross-tenant intelligence · Auto-refreshes every 60s</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5 text-xs">
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
          </Button>
        </div>

        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Score ring */}
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
                <circle
                  cx="40" cy="40" r="34" fill="none" strokeWidth="6"
                  className={colors.bar.replace('bg-', 'text-')}
                  strokeDasharray={`${(data.health_score / 100) * 213.6} 213.6`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn('text-xl font-bold font-display', colors.text)}>{data.health_score}</span>
              </div>
            </div>
            <div>
              <p className={cn('text-xs font-bold uppercase tracking-wider', colors.text)}>
                {data.health_status === 'green' ? 'Healthy' : data.health_status === 'amber' ? 'Attention' : 'Critical'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {systemState.maintenance_mode ? '⚠ Maintenance active' : systemState.nexus_ai_enabled ? 'AI enabled' : 'AI disabled'}
              </p>
              {systemState.platform_version && (
                <p className="text-[10px] text-muted-foreground font-mono">v{systemState.platform_version}</p>
              )}
            </div>
          </div>

          {/* Quick metrics */}
          <div className="grid grid-cols-2 gap-2">
            <MetricPill icon={Bug} label="Open Issues" value={metrics.open_issues || 0} alert={metrics.open_issues > 5} />
            <MetricPill icon={AlertTriangle} label="Critical" value={metrics.critical_issues || 0} alert={metrics.critical_issues > 0} />
            <MetricPill icon={Shield} label="Shield Blocks" value={metrics.shield_blocks || 0} alert={metrics.shield_blocks > 10} />
            <MetricPill icon={RefreshCcw} label="Failed Syncs" value={metrics.failed_syncs || 0} alert={metrics.failed_syncs > 0} />
          </div>

          {/* System state badges */}
          <div className="flex flex-col gap-1.5 justify-center">
            <StateBadge label="Shield" value={systemState.shield_level || 'auditor'} active={systemState.shield_level === 'guardian'} />
            <StateBadge label="AI Nexus" value={systemState.nexus_ai_enabled ? 'Active' : 'Disabled'} active={systemState.nexus_ai_enabled} />
            <StateBadge label="Billing" value={systemState.billing_paused ? 'Paused' : 'Live'} active={!systemState.billing_paused} />
          </div>
        </div>
      </div>

      {/* ── Actionable Insights ── */}
      {(data.insights || []).length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-orbitan-amber" /> Priority Insights
            </p>
          </div>
          <div className="divide-y divide-border">
            {(expanded ? data.insights : data.insights.slice(0, 3)).map((insight, i) => {
              const Icon = INSIGHT_ICONS[insight.icon] || CheckCircle2;
              return (
                <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                  <Icon className={cn('w-4 h-4 flex-shrink-0',
                    insight.priority === 'critical' ? 'text-red-500' :
                    insight.priority === 'high' ? 'text-amber-500' : 'text-muted-foreground'
                  )} />
                  <span className="text-xs text-foreground flex-1">{insight.label}</span>
                  <span className={cn('text-[10px] font-bold uppercase tracking-wider', PRINCIPLE_COLORS[insight.principle] || 'text-muted-foreground')}>
                    {insight.principle}
                  </span>
                </div>
              );
            })}
          </div>
          {data.insights.length > 3 && (
            <button onClick={() => setExpanded(!expanded)} className="w-full px-5 py-2 text-xs text-orbitan-blue hover:bg-orbitan-blue-light transition-colors flex items-center justify-center gap-1">
              {expanded ? 'Show less' : `Show ${data.insights.length - 3} more`} <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* ── Top Bug Modules ── */}
      {(data.top_bug_modules || []).length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Feedback by Module</p>
          <div className="space-y-2">
            {data.top_bug_modules.map(item => {
              const max = data.top_bug_modules[0]?.count || 1;
              return (
                <div key={item.module} className="flex items-center gap-2">
                  <span className="text-xs capitalize w-28 truncate">{item.module.replace(/_/g, ' ')}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-orbitan-blue rounded-full transition-all" style={{ width: `${(item.count / max) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium w-6 text-right">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Failed Sync Queue ── */}
      {data.sync_health?.failed_count > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <RefreshCcw className="w-3.5 h-3.5" /> Failed Finance Syncs ({data.sync_health.failed_count})
          </p>
          <div className="space-y-2">
            {data.sync_health.failed_entries.map(entry => (
              <div key={entry.id} className="bg-white rounded-lg px-3 py-2 border border-red-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground capitalize">{entry.queue_type.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-red-600 font-mono">Attempts: {entry.sync_attempts}</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{entry.last_error || 'Unknown error'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Generated timestamp ── */}
      <p className="text-[10px] text-muted-foreground text-center">
        Last evaluated: {data.generated_at ? format(new Date(data.generated_at), 'dd MMM yyyy, HH:mm:ss') : '—'}
      </p>
    </div>
  );
}

function MetricPill({ icon: Icon, label, value, alert }) {
  return (
    <div className={cn('rounded-lg border px-3 py-2', alert ? 'border-red-200 bg-red-50' : 'border-border bg-muted/30')}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className={cn('w-3 h-3', alert ? 'text-red-500' : 'text-muted-foreground')} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{label}</span>
      </div>
      <p className={cn('text-lg font-bold font-display', alert ? 'text-red-600' : 'text-foreground')}>{value}</p>
    </div>
  );
}

function StateBadge({ label, value, active }) {
  return (
    <div className="flex items-center justify-between bg-muted/30 rounded-lg px-2.5 py-1.5">
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      <span className={cn('text-[10px] font-bold uppercase', active ? 'text-green-600' : 'text-muted-foreground')}>
        {value}
      </span>
    </div>
  );
}