// AnomalyList — rule-based anomaly detection (Part G) — labelled NOT ML
import React from 'react';
import { Loader2, AlertTriangle, Activity } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';

export default function AnomalyList({ data, loading }) {
  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!data) return null;
  const anomalies = data.metric_snapshot?.anomalies || [];
  if (data.data_sufficiency === false) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-heading font-semibold text-sm mb-2 flex items-center gap-2"><Activity className="w-4 h-4 text-orbitan-blue" /> Anomaly Detection</h3>
        <p className="text-xs text-muted-foreground">{data.insufficient_data_reason}</p>
      </div>
    );
  }
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-orbitan-blue" /> Anomaly Detection</h3>
        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">Rule-based · not ML</span>
      </div>
      {anomalies.length === 0 ? (
        <p className="text-xs text-muted-foreground flex items-center gap-2"><span className="text-orbitan-green">✓</span> No anomalies detected within rule thresholds.</p>
      ) : (
        <div className="space-y-2">
          {anomalies.map((a, i) => (
            <div key={i} className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold capitalize">{a.type.replace(/_/g, ' ')}</span>
                <StatusBadge status={a.severity} />
              </div>
              <p className="text-xs text-muted-foreground mb-1">
                Actual <span className="font-medium text-foreground tabular-nums">{a.actual}</span> vs baseline <span className="tabular-nums">{a.baseline}</span> — {a.threshold}
              </p>
              <p className="text-xs text-muted-foreground">↳ {a.investigation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}