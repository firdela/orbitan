// ============================================================
// SafetyReportDialog — Incident / Hazard / Near-Miss form
// Canonical safety report creation for all report types.
// ============================================================
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  X, AlertTriangle, Shield, Siren, HeartPulse, Wrench,
  Utensils, HelpCircle, EyeOff
} from 'lucide-react';

const REPORT_TYPES = [
  { value: 'hazard', label: 'Hazard', icon: AlertTriangle, desc: 'A potential danger with no injury yet' },
  { value: 'incident', label: 'Incident', icon: Siren, desc: 'An event that caused harm or damage' },
  { value: 'near_miss', label: 'Near Miss', icon: Shield, desc: 'A close call — no harm but could have' },
  { value: 'injury', label: 'Injury', icon: HeartPulse, desc: 'Someone was injured' },
  { value: 'equipment_issue', label: 'Equipment Issue', icon: Wrench, desc: 'Equipment malfunction or safety defect' },
  { value: 'food_safety_issue', label: 'Food Safety Issue', icon: Utensils, desc: 'Food safety, hygiene, or allergen concern' },
  { value: 'other', label: 'Other', icon: HelpCircle, desc: 'Other safety concern' },
];

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
];

export default function SafetyReportDialog({ open, onClose, onSave, defaultType }) {
  const [reportType, setReportType] = useState('hazard');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [occurredAt, setOccurredAt] = useState('');
  const [locationDetail, setLocationDetail] = useState('');
  const [immediateAction, setImmediateAction] = useState('');
  const [witnessInfo, setWitnessInfo] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (defaultType) setReportType(defaultType);
    if (open) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setOccurredAt(now.toISOString().slice(0, 16));
    }
  }, [defaultType, open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSaving(true);
    try {
      await onSave({
        report_type: reportType,
        title: title.trim(),
        description: description.trim(),
        severity,
        occurred_at: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
        location_detail: locationDetail.trim() || null,
        immediate_action_taken: immediateAction.trim() || null,
        witness_info: witnessInfo.trim() || null,
        is_anonymous: isAnonymous,
        is_confidential: false,
        status: 'submitted',
      });
      onClose();
      // Reset
      setTitle(''); setDescription(''); setLocationDetail('');
      setImmediateAction(''); setWitnessInfo(''); setIsAnonymous(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-border overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-heading font-bold text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-600" />
            Report Safety Concern
          </h3>
          <button onClick={onClose} aria-label="Close"
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center min-h-[44px] min-w-[44px]">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Report type selector */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">What happened? *</Label>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_TYPES.map(rt => {
                const Icon = rt.icon;
                return (
                  <button key={rt.value} type="button" onClick={() => setReportType(rt.value)}
                    className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all min-h-[44px] ${
                      reportType === rt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:bg-muted/50'
                    }`}>
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold">{rt.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">{rt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="sr-title" className="text-sm font-semibold mb-1.5 block">Title *</Label>
            <Input id="sr-title" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Brief summary" className="h-11" autoFocus required />
          </div>

          <div>
            <Label htmlFor="sr-desc" className="text-sm font-semibold mb-1.5 block">Description *</Label>
            <Textarea id="sr-desc" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe what happened in detail..." rows={4} className="resize-none" required />
          </div>

          {/* Severity */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Severity *</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {SEVERITY_OPTIONS.map(s => (
                <button key={s.value} type="button" onClick={() => setSeverity(s.value)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                    severity === s.value ? s.color + ' ring-2 ring-primary/20' : 'bg-muted text-muted-foreground'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="sr-when" className="text-sm font-semibold mb-1.5 block">When did it happen? *</Label>
            <Input id="sr-when" type="datetime-local" value={occurredAt} onChange={e => setOccurredAt(e.target.value)}
              className="h-11" />
          </div>

          <div>
            <Label htmlFor="sr-loc" className="text-sm font-semibold mb-1.5 block">Location detail (optional)</Label>
            <Input id="sr-loc" value={locationDetail} onChange={e => setLocationDetail(e.target.value)}
              placeholder="e.g. Kitchen, near the fryer" className="h-11" />
          </div>

          <div>
            <Label htmlFor="sr-action" className="text-sm font-semibold mb-1.5 block">Immediate action taken (optional)</Label>
            <Textarea id="sr-action" value={immediateAction} onChange={e => setImmediateAction(e.target.value)}
              placeholder="What did you do right away?" rows={2} className="resize-none" />
          </div>

          <div>
            <Label htmlFor="sr-witness" className="text-sm font-semibold mb-1.5 block">Witness information (optional)</Label>
            <Input id="sr-witness" value={witnessInfo} onChange={e => setWitnessInfo(e.target.value)}
              placeholder="Name and contact if available" className="h-11" />
          </div>

          {/* Anonymous toggle */}
          <label className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl cursor-pointer">
            <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 rounded border-border" />
            <div className="flex items-center gap-2">
              <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Submit anonymously — my name will be hidden from non-admin viewers</span>
            </div>
          </label>

          {/* Privacy notice */}
          <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3">
            <p className="text-xs text-purple-700 dark:text-purple-400 flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>Your report is submitted to your organisation's safety team. You can track its status in <strong>My Safety Reports</strong>. Confidential investigation notes are visible only to authorised managers.</span>
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 h-11" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 h-11" disabled={saving || !title.trim() || !description.trim()}>
              {saving ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}