import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import EmptyState from '@/components/shared/EmptyState';
import { Sparkles, AlertCircle, TrendingUp, ShieldAlert, GraduationCap, RefreshCw, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

const REC_TYPE_META = {
  follow_up: { icon: AlertCircle, color: 'text-orbitan-red', bg: 'bg-orbitan-red-light', label: 'Follow-up' },
  low_adoption: { icon: TrendingUp, color: 'text-orbitan-amber', bg: 'bg-orbitan-amber-light', label: 'Adoption' },
  compliance_risk: { icon: ShieldAlert, color: 'text-orbitan-red', bg: 'bg-orbitan-red-light', label: 'Compliance' },
  escalation: { icon: AlertCircle, color: 'text-orbitan-red', bg: 'bg-orbitan-red-light', label: 'Escalation' },
  ai_usage: { icon: Sparkles, color: 'text-orbitan-purple', bg: 'bg-orbitan-purple-light', label: 'AI Usage' },
  upsell: { icon: TrendingUp, color: 'text-orbitan-green', bg: 'bg-orbitan-green-light', label: 'Upsell' },
  training: { icon: GraduationCap, color: 'text-orbitan-blue', bg: 'bg-orbitan-blue-light', label: 'Training' },
  renewal: { icon: RefreshCw, color: 'text-orbitan-amber', bg: 'bg-orbitan-amber-light', label: 'Renewal' },
};

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

// Section 9 — AI Recommendations: deterministic, evidence-based (no automation)
export default function CSRecommendations({ recommendations, onSelectCustomer }) {
  const sorted = useMemo(() => [...recommendations].sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)), [recommendations]);
  const byCategory = useMemo(() => {
    const m = {};
    for (const r of sorted) (m[r.category] = m[r.category] || []).push(r);
    return m;
  }, [sorted]);

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-4 bg-orbitan-purple-light/40 border-orbitan-purple/20">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-orbitan-purple flex-shrink-0 mt-0.5" />
          <div><p className="text-sm font-medium text-foreground">Orbit Nexus — Customer Success Intelligence</p><p className="text-xs text-muted-foreground mt-0.5">{recommendations.length} deterministic recommendations generated from real platform signals. No automated actions — recommendations are advisory only.</p></div>
        </div>
      </Card>

      {recommendations.length === 0 ? (
        <EmptyState icon={Sparkles} title="No recommendations" description="All customers are on track. No follow-ups needed at this time." color="purple" size="large" />
      ) : (
        <div className="space-y-5">
          {Object.entries(byCategory).map(([cat, recs]) => (
            <div key={cat}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{cat} ({recs.length})</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {recs.map(r => {
                  const meta = REC_TYPE_META[r.type] || REC_TYPE_META.follow_up;
                  const Icon = meta.icon;
                  return (
                    <Card key={r.key} onClick={() => onSelectCustomer?.({ tenant_id: r.tenant_id, name: r.tenant_name })}
                      className="p-4 cursor-pointer hover:shadow-md transition-shadow" role="button" tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectCustomer?.({ tenant_id: r.tenant_id, name: r.tenant_name }); } }}>
                      <div className="flex items-start gap-3">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', meta.bg)}><Icon className={cn('w-4 h-4', meta.color)} /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-0.5"><p className="text-sm font-medium truncate">{r.tenant_name}</p><span className={cn('text-[10px] font-semibold uppercase', meta.color)}>{r.severity}</span></div>
                          <p className="text-sm">{r.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{r.detail}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}