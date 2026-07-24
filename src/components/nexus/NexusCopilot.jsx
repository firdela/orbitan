// NexusCopilot — grounded Business Copilot (Part I/J). Never auto-executes.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Sparkles, ShieldCheck } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';

const SUGGESTIONS = [
  'What needs my attention today?',
  'What is our revenue today?',
  'Which ingredients are at risk of stockout?',
  'What should be reordered?',
  'Which finance records failed to sync?',
];

export default function NexusCopilot({ tenantId, outletId }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);

  const ask = async (q) => {
    const query = q || question;
    if (!query.trim()) return;
    setLoading(true); setAnswer(null);
    try {
      const res = await base44.functions.invoke('nexusCopilot', { question: query, tenant_id: tenantId, outlet_id: outletId });
      const data = res.data || res;
      if (data.error) throw new Error(data.error);
      setAnswer(data);
      setQuestion('');
    } catch (err) {
      setAnswer({ summary: err?.message || 'Copilot unavailable', error: true });
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-orbitan-purple" />
        <h3 className="font-heading font-semibold text-sm">Ask Orbit Nexus</h3>
        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">Business Copilot</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Grounded in your operational data. Citations provided. Never executes actions without your confirmation.</p>
      <div className="flex gap-2 mb-3">
        <Input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()} placeholder="Ask about revenue, margin, stock, sync…" className="text-sm" disabled={loading} />
        <Button size="icon" onClick={() => ask()} disabled={loading || !question.trim()}><Send className="w-4 h-4" /></Button>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => { setQuestion(s); ask(s); }} disabled={loading} className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-muted/50 hover:bg-muted transition-colors text-muted-foreground">{s}</button>
        ))}
      </div>
      {loading && <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}
      {answer && !answer.error && (
        <div className="bg-muted/40 rounded-lg p-4 space-y-3 animate-fade-in">
          <p className="text-sm text-foreground leading-relaxed">{answer.summary}</p>
          {answer.evidence?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Evidence</p>
              <ul className="space-y-0.5">{answer.evidence.map((e, i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5"><span className="text-orbitan-blue">•</span>{e.detail || e}</li>)}</ul>
            </div>
          )}
          {answer.recommended_actions?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Recommended Actions</p>
              <ul className="space-y-0.5">{answer.recommended_actions.map((r, i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5"><span className="text-orbitan-amber">→</span>{r.label || r}</li>)}</ul>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-border"><ShieldCheck className="w-3 h-3" />Orbit Nexus never executes actions automatically — confirm via existing governed flows.</p>
        </div>
      )}
      {answer?.error && <div className="bg-orbitan-red-light border border-red-200 rounded-lg p-3 text-xs text-red-800">{answer.summary}</div>}
    </div>
  );
}