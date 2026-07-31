import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, MessageSquarePlus, Zap, Users, Building2, Cpu, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';

const FEEDBACK_TYPES = [
  { value: 'suggestion', label: 'Suggestion', description: 'Improve how we work', emoji: '💡', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'issue', label: 'Report Issue', description: 'Something is broken or wrong', emoji: '⚠️', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { value: 'praise', label: 'Give Praise', description: 'Recognise someone', emoji: '🌟', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  { value: 'urgent_escalation', label: 'Urgent Escalation', description: 'Needs immediate attention', emoji: '🚨', color: 'bg-red-50 border-red-200 text-red-700' },
  { value: 'orbitan_product_feedback', label: 'Improve Orbitan', description: 'Tell the product team', emoji: '🚀', color: 'bg-purple-50 border-purple-200 text-purple-700' },
];

const RECIPIENTS = [
  { value: 'my_manager', label: 'My Manager', icon: Users, desc: 'Outlet manager / supervisor' },
  { value: 'business_leader', label: 'Business Leader', icon: Building2, desc: 'Company / tenant leadership' },
  { value: 'all_leaders', label: 'All Leaders', icon: ChevronRight, desc: 'Manager + business leader' },
  { value: 'orbitan_platform', label: 'Orbitan Team', icon: Cpu, desc: 'Orbitan product team' },
];

export default function WorkerFeedbackModal({ open, onClose, worker }) {
  const [step, setStep] = useState(1); // 1 = type, 2 = recipient, 3 = compose, 4 = done
  const [type, setType] = useState(null);
  const [recipient, setRecipient] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [priority, setPriority] = useState('normal');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const selectedType = FEEDBACK_TYPES.find(t => t.value === type);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) return;
    setLoading(true);
    await base44.entities.WorkerFeedback.create({
      tenant_id: worker?.tenant_id || 'taqueria_pte_ltd',
      outlet_id: worker?.outlet_id || '',
      worker_id: worker?.id || 'demo-worker',
      worker_name: isAnonymous ? 'Anonymous' : (worker?.full_name || worker?.name || 'Worker'),
      worker_role: worker?.role || 'worker',
      feedback_type: type,
      recipient_type: recipient,
      subject: subject.trim(),
      message: message.trim(),
      is_anonymous: isAnonymous,
      priority,
      status: 'submitted',
    });
    setLoading(false);
    setStep(4);
  };

  const reset = () => {
    setStep(1); setType(null); setRecipient(null);
    setSubject(''); setMessage(''); setIsAnonymous(false); setPriority('normal');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-border overflow-hidden animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl orbitan-gradient flex items-center justify-center">
              <MessageSquarePlus className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-heading font-bold text-sm text-foreground">Voice & Feedback</p>
              <p className="text-[10px] text-muted-foreground">Step {Math.min(step, 3)} of 3</p>
            </div>
          </div>
          <button onClick={reset} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Step 1 — Choose Type */}
        {step === 1 && (
          <div className="p-5 space-y-3">
            <p className="text-sm font-semibold text-foreground">What would you like to share?</p>
            <div className="space-y-2">
              {FEEDBACK_TYPES.map(t => (
                <button key={t.value} onClick={() => { setType(t.value); setStep(2); }}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all hover:shadow-sm active:scale-[0.99] ${t.color}`}>
                  <span className="text-xl flex-shrink-0">{t.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold">{t.label}</p>
                    <p className="text-[11px] opacity-70">{t.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Choose Recipient */}
        {step === 2 && (
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{selectedType?.emoji}</span>
              <p className="text-sm font-semibold text-foreground">Who should receive this?</p>
            </div>
            <div className="space-y-2">
              {RECIPIENTS.filter(r => {
                if (type === 'orbitan_product_feedback') return r.value === 'orbitan_platform';
                return r.value !== 'orbitan_platform';
              }).map(r => {
                const Icon = r.icon;
                return (
                  <button key={r.value} onClick={() => { setRecipient(r.value); setStep(3); }}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border bg-background hover:bg-muted hover:border-primary/30 text-left transition-all active:scale-[0.99]">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{r.label}</p>
                      <p className="text-[11px] text-muted-foreground">{r.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                  </button>
                );
              })}
            </div>
            <button onClick={() => setStep(1)} className="text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors">← Back</button>
          </div>
        )}

        {/* Step 3 — Compose */}
        {step === 3 && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-base">{selectedType?.emoji}</span>
              <p className="text-sm font-semibold text-foreground">{selectedType?.label}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Brief summary..."
                className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Share your thoughts in detail..."
                rows={4}
                className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
              />
            </div>

            {/* Priority for urgent escalation */}
            {(type === 'urgent_escalation' || type === 'issue') && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Priority</label>
                <div className="flex gap-2 mt-1.5">
                  {['normal', 'high', 'urgent'].map(p => (
                    <button key={p} onClick={() => setPriority(p)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all capitalize ${priority === p ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Anonymous toggle */}
            <button onClick={() => setIsAnonymous(!isAnonymous)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-sm ${isAnonymous ? 'bg-slate-800 border-slate-700 text-white' : 'bg-muted border-border text-muted-foreground hover:border-primary/20'}`}>
              <div className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-all ${isAnonymous ? 'bg-white border-white' : 'border-current'}`}>
                {isAnonymous && <div className="w-2 h-2 bg-slate-800 rounded-sm" />}
              </div>
              <span>Submit anonymously</span>
              <span className="ml-auto text-[10px] opacity-60">Your name is hidden</span>
            </button>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1 gap-2" onClick={handleSubmit} disabled={loading || !subject.trim() || !message.trim()}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {loading ? 'Sending...' : 'Send Feedback'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 — Done */}
        {step === 4 && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-orbitan-green-light flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-orbitan-green" />
            </div>
            <div>
              <p className="font-heading font-bold text-lg text-foreground">Feedback Sent!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {type === 'orbitan_product_feedback'
                  ? 'Your input goes directly to the Orbitan product team. Thank you for helping us improve.'
                  : 'Your feedback has been delivered. Your leaders will see this.'}
              </p>
            </div>
            <Button className="w-full" onClick={reset}>Done</Button>
          </div>
        )}
      </div>
    </div>
  );
}