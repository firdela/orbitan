// DailyBriefing — grounded daily briefing + top priorities (Part E)
import React from 'react';
import { Loader2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

export default function DailyBriefing({ data, loading }) {
  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!data) return null;
  const m = data.metric_snapshot || {};
  const insufficient = data.data_sufficiency === false;
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-orbitan-blue" /> Daily Briefing</h3>
        <span className="text-[10px] text-muted-foreground">{data.generation_method === 'hybrid' ? 'LLM + deterministic' : data.generation_method}</span>
      </div>
      {insufficient ? (
        <p className="text-xs text-muted-foreground">{data.insufficient_data_reason}</p>
      ) : (
        <>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line mb-4">{data.summary}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[
              { l: 'Revenue', v: m.revenueToday, d: m.revenueDeltaPct },
              { l: 'Margin', v: m.marginToday + '%' },
              { l: 'COGS', v: m.cogsToday },
              { l: 'Sales', v: m.salesCount },
              { l: 'Low Stock', v: m.lowStockCount },
              { l: 'Stockout', v: m.stockoutRiskCount },
              { l: 'Labour', v: m.labourCostToday },
              { l: 'Sync Failed', v: m.failedSync },
            ].map(s => (
              <div key={s.l} className="bg-muted/50 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">{s.l}</p>
                <p className="text-sm font-semibold tabular-nums">{s.v ?? '—'}{s.d != null && <span className={`text-[10px] ml-1 ${s.d >= 0 ? 'text-orbitan-green' : 'text-orbitan-red'}`}>{s.d >= 0 ? '+' : ''}{s.d}%</span>}</p>
              </div>
            ))}
          </div>
          {(data.recommended_actions || data.top_priorities || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Top Priorities</p>
              <div className="space-y-1.5">
                {(data.recommended_actions || data.top_priorities || []).slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-orbitan-amber flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{p.what || p.label}</p>
                      {p.why && <p className="text-muted-foreground">{p.why} → {p.action}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}