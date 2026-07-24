// OperationalHealthScore — deterministic 0-100 score ring + categories (Part D)
import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS = {
  sales: 'Sales', margin: 'Margin', inventory: 'Inventory', production: 'Production',
  workforce: 'Workforce', attendance: 'Attendance', compliance: 'Compliance',
  finance: 'Finance Sync', tasks: 'Tasks', procurement: 'Procurement',
};

function scoreColor(s) {
  if (s >= 80) return 'text-orbitan-green';
  if (s >= 60) return 'text-orbitan-amber';
  return 'text-orbitan-red';
}
function ringColor(s) {
  if (s >= 80) return '#16A34A';
  if (s >= 60) return '#F59E0B';
  return '#DC2626';
}

export default function OperationalHealthScore({ data, loading }) {
  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!data || !data.data_sufficiency) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-heading font-semibold text-sm mb-2">Operational Health Score</h3>
        <p className="text-xs text-muted-foreground">{data?.insufficient_data_reason || 'Insufficient data to compute a health score.'}</p>
      </div>
    );
  }
  const overall = data.metric_snapshot?.overall ?? 0;
  const categories = data.metric_snapshot?.categories || {};
  const radius = 52, circ = 2 * Math.PI * radius;
  const offset = circ - (overall / 100) * circ;
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-heading font-semibold text-sm mb-4">Operational Health Score</h3>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-32 h-32 flex-shrink-0">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
            <circle cx="60" cy="60" r={radius} fill="none" stroke={ringColor(overall)} strokeWidth="10" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-700" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-3xl font-display font-bold tabular-nums', scoreColor(overall))}>{overall}</span>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 flex-1 w-full">
          {Object.entries(categories).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{CATEGORY_LABELS[k] || k}</span>
              <span className={cn('font-semibold tabular-nums', scoreColor(v.score))}>{v.score}</span>
            </div>
          ))}
        </div>
      </div>
      {(data.metric_snapshot?.risks?.length > 0 || data.metric_snapshot?.positives?.length > 0) && (
        <div className="mt-4 pt-3 border-t border-border space-y-1.5">
          {data.metric_snapshot.risks?.map((r, i) => <p key={'r' + i} className="text-xs text-orbitan-red flex items-start gap-1.5"><span className="mt-0.5">⚠</span>{r}</p>)}
          {data.metric_snapshot.positives?.map((p, i) => <p key={'p' + i} className="text-xs text-orbitan-green flex items-start gap-1.5"><span className="mt-0.5">✓</span>{p}</p>)}
        </div>
      )}
      <p className="mt-3 text-[10px] text-muted-foreground">Deterministic score · weights documented in nexusIntelligence rule set v1 · {data.generation_method}</p>
    </div>
  );
}