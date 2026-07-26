import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// InboxSummary — deterministic brief + on-demand Orbit Nexus AI summary.
// The deterministic brief is always-on (zero credits). The AI summary is
// user-initiated (InvokeLLM) so credits are spent only when wanted.
export default function InboxSummary({ items }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const stats = useMemo(() => {
    const active = items.filter((i) => !i.archived_at);
    const action = active.filter((i) => i.is_actionable && i.action_state === 'pending');
    const unreadAction = action.filter((i) => !i.read_at);
    const activity = active.filter((i) => !i.is_actionable);
    // Breakdown by category for actionable
    const byCategory = {};
    unreadAction.forEach((i) => {
      byCategory[i.category] = (byCategory[i.category] || 0) + 1;
    });
    return { actionCount: action.length, unreadAction: unreadAction.length, activityCount: activity.length, byCategory };
  }, [items]);

  const handleSummarize = async () => {
    setLoading(true);
    setError(null);
    try {
      const pending = items.filter((i) => i.is_actionable && i.action_state === 'pending' && !i.archived_at && !i.read_at);
      if (pending.length === 0) {
        setSummary('You have no pending action items. You are all caught up.');
        return;
      }
      const condensed = pending.map((i) => ({
        title: i.title,
        category: i.category,
        priority: i.priority,
        body: i.body,
      }));
      const prompt = `You are Orbit Nexus, the AI assistant for an operations manager using OrbitanOS. Summarise the following ${pending.length} pending action items in 2-3 concise sentences, grouped by theme, highlighting the most urgent first. Do not list every item — synthesise. Items: ${JSON.stringify(condensed)}`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      setSummary(typeof res === 'string' ? res : res?.response || 'Summary unavailable.');
    } catch (e) {
      setError('Orbit Nexus is unavailable right now. Showing the deterministic brief instead.');
    } finally {
      setLoading(false);
    }
  };

  const categoryEntries = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <Card className="mb-6 p-5 border-orbitan-purple/20 bg-gradient-to-br from-orbitan-purple-light/40 to-transparent">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-orbitan-purple-light flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-orbitan-purple" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-sm text-foreground mb-1">Orbit Nexus Summary</h3>

          {/* Deterministic brief — always-on, zero credits */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            {stats.unreadAction === 0
              ? 'You are all caught up — no items need your action right now.'
              : `You have ${stats.unreadAction} item${stats.unreadAction === 1 ? '' : 's'} needing action`}
            {stats.activityCount > 0 && `, plus ${stats.activityCount} activity update${stats.activityCount === 1 ? '' : 's'}.`}
            {stats.unreadAction > 0 && '.'}
          </p>

          {categoryEntries.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {categoryEntries.slice(0, 5).map(([cat, n]) => (
                <span key={cat} className="text-[11px] font-medium px-2 py-1 rounded-full bg-card border border-border text-muted-foreground">
                  {cat.replace(/_/g, ' ')}: {n}
                </span>
              ))}
            </div>
          )}

          {summary && (
            <div className="mt-2 p-3 rounded-lg bg-card border border-border">
              <p className="text-sm text-foreground leading-relaxed">{summary}</p>
            </div>
          )}
          {error && (
            <div className="mt-2 flex items-start gap-2 p-3 rounded-lg bg-orbitan-amber-light/50 border border-amber-200">
              <AlertCircle className="w-4 h-4 text-orbitan-amber flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orbitan-amber-700">{error}</p>
            </div>
          )}

          <Button
            onClick={handleSummarize}
            disabled={loading}
            variant="outline"
            size="sm"
            className="mt-3"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {loading ? 'Summarising…' : 'Summarise with Orbit Nexus'}
          </Button>
        </div>
      </div>
    </Card>
  );
}