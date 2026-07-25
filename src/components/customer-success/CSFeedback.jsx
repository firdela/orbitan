import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import EmptyState from '@/components/shared/EmptyState';
import { MessageSquare, ThumbsUp, ThumbsDown, Frown, Meh, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

const SENTIMENT_META = {
  positive: { label: 'Positive', icon: Smile, color: 'text-orbitan-green', bg: 'bg-orbitan-green-light' },
  neutral: { label: 'Neutral', icon: Meh, color: 'text-orbitan-blue', bg: 'bg-orbitan-blue-light' },
  negative: { label: 'Negative', icon: Frown, color: 'text-orbitan-amber', bg: 'bg-orbitan-amber-light' },
  frustrated: { label: 'Frustrated', icon: ThumbsDown, color: 'text-orbitan-red', bg: 'bg-orbitan-red-light' },
};

// Section 11 — Product Feedback: aggregated sentiment + per-tenant feedback summary
export default function CSFeedback({ customers, onSelectCustomer }) {
  const totals = useMemo(() => {
    const s = { total: 0, open: 0, sentiment: { positive: 0, neutral: 0, negative: 0, frustrated: 0 } };
    for (const c of customers) {
      s.total += c.feedback.total; s.open += c.feedback.open;
      for (const k of Object.keys(s.sentiment)) s.sentiment[k] += c.feedback.sentiment[k] || 0;
    }
    return s;
  }, [customers]);

  const withFeedback = customers.filter(c => c.feedback.total > 0).sort((a, b) => b.feedback.total - a.feedback.total);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sentiment distribution */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4"><MessageSquare className="w-4 h-4 text-orbitan-blue" /><h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Portfolio Sentiment</h3></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(SENTIMENT_META).map(([key, meta]) => {
            const count = totals.sentiment[key] || 0;
            const pct = totals.total ? Math.round((count / totals.total) * 100) : 0;
            const Icon = meta.icon;
            return (
              <div key={key} className={cn('rounded-lg border p-3', meta.bg)}>
                <div className="flex items-center gap-2 mb-1"><Icon className={cn('w-4 h-4', meta.color)} /><span className="text-xs font-medium">{meta.label}</span></div>
                <p className="text-xl font-display font-bold tabular-nums">{count}</p><p className="text-[10px] opacity-70">{pct}% of feedback</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Per-tenant feedback */}
      {withFeedback.length === 0 ? <EmptyState icon={MessageSquare} title="No feedback yet" description="No product feedback submitted across the portfolio." color="blue" /> : (
        <Card className="p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Per-Tenant Feedback ({withFeedback.length})</h3>
          <div className="space-y-2">
            {withFeedback.map(c => (
              <button key={c.tenant_id} onClick={() => onSelectCustomer?.(c)} className="w-full flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 hover:bg-muted/50 transition-colors text-left">
                <div className="min-w-0"><p className="text-sm font-medium truncate">{c.name}</p><p className="text-xs text-muted-foreground">{c.feedback.total} items · {c.feedback.open} open</p></div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {Object.entries(c.feedback.sentiment).map(([k, v]) => v > 0 && <span key={k} className={cn('text-[10px] px-1.5 py-0.5 rounded', SENTIMENT_META[k].bg, SENTIMENT_META[k].color)} title={`${SENTIMENT_META[k].label}: ${v}`}>{v}</span>)}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}