import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import { StickyNote, Send, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const COMMON_TAGS = ['follow-up', 'upsell', 'risk', 'training', 'renewal', 'compliance'];

// Section 7 — Customer Notes: structured internal notes (priority + tags) audited via AuditLog
export default function CSCustomerNotes({ selected, detail, detailLoading, onAddNote, saving }) {
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState('medium');
  const [tags, setTags] = useState([]);

  if (!selected) {
    return <EmptyState icon={StickyNote} title="Select a customer" description="Choose a customer to view and add structured customer success notes." color="amber" size="large" />;
  }
  if (detailLoading) return <LoadingState message="Loading notes…" size="lg" />;

  const notes = detail?.notes || [];
  const toggleTag = (t) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const submit = () => {
    if (!note.trim()) return;
    onAddNote?.(selected.tenant_id, note.trim(), priority, tags);
    setNote(''); setTags([]); setPriority('medium');
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Add note */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Add Note — {selected.name}</h3>
        <Textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Add a structured customer success note (audited)…" aria-label="Note content" />
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Priority:</span>
            <div className="flex gap-1">
              {PRIORITIES.map(p => (
                <button key={p} onClick={() => setPriority(p)} className={cn('px-2 py-0.5 rounded-md text-xs font-medium border', priority === p ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted')}>{p}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">Tags:</span>
            {COMMON_TAGS.map(t => (
              <button key={t} onClick={() => toggleTag(t)} className={cn('px-2 py-0.5 rounded-md text-xs border', tags.includes(t) ? 'bg-orbitan-blue-light text-orbitan-blue border-orbitan-blue/30' : 'border-border text-muted-foreground hover:bg-muted')}>{t}</button>
            ))}
          </div>
        </div>
        <Button size="sm" onClick={submit} disabled={!note.trim() || saving} className="mt-3 gap-1.5">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}Save Note</Button>
      </Card>

      {/* Existing notes */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Note History ({notes.length})</h3>
        {notes.length === 0 ? <EmptyState icon={StickyNote} title="No notes yet" description="No customer success notes recorded for this tenant." size="sm" color="slate" /> : (
          <div className="space-y-3">
            {notes.map(n => {
              // Parse priority prefix if present [priority]
              const m = (n.details || '').match(/^\[(\w+)\]/);
              const prio = m ? m[1] : null;
              const body = m ? n.details.slice(m[0].length) : n.details;
              const tagMatches = body.match(/\s\[([^\]]+)\]$/);
              const bodyText = tagMatches ? body.slice(0, tagMatches.index) : body;
              const noteTags = tagMatches ? tagMatches[1].split(', ') : [];
              return (
                <div key={n.id} className="border-l-2 border-orbitan-amber/40 pl-3 py-1">
                  {prio && <span className={cn('inline-block text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded mb-1', prio === 'critical' ? 'bg-orbitan-red-light text-orbitan-red-700' : prio === 'high' ? 'bg-orange-50 text-orange-700' : prio === 'medium' ? 'bg-orbitan-amber-light text-orbitan-amber-700' : 'bg-muted text-muted-foreground')}>{prio}</span>}
                  <p className="text-sm">{bodyText}</p>
                  {noteTags.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{noteTags.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>)}</div>}
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{n.actor_name} · {new Date(n.created_date).toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}