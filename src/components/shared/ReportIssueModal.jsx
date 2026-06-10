// OrbitanOS — Report an Issue Modal
// Regulate + Refine Principle: pilot feedback capture with auto session snapshot
// Floats as a fixed button on all pages

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquarePlus, CheckCircle2, Loader2, Bug, Lightbulb, Shield, MousePointerClick, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

const ISSUE_TYPES = [
  { value: 'bug',              label: 'Bug / Error',           icon: Bug,               color: 'text-red-500' },
  { value: 'improvement',      label: 'Improvement Idea',      icon: Lightbulb,         color: 'text-amber-500' },
  { value: 'usability',        label: 'Usability Issue',       icon: MousePointerClick, color: 'text-purple-500' },
  { value: 'compliance_query', label: 'Compliance Query',      icon: Shield,            color: 'text-blue-500' },
  { value: 'data_issue',       label: 'Data Issue',            icon: Database,          color: 'text-slate-500' },
];

const MODULES = [
  'general', 'inventory', 'procurement', 'sales_invoice', 'workforce',
  'compliance', 'scheduling', 'reporting', 'finance', 'ai_studio',
  'wallet', 'marketplace', 'shield',
];

const SEVERITIES = [
  { value: 'low',      label: 'Low — Minor inconvenience',   dot: 'bg-green-400' },
  { value: 'medium',   label: 'Medium — Affects workflow',   dot: 'bg-amber-400' },
  { value: 'high',     label: 'High — Blocks operations',    dot: 'bg-orange-500' },
  { value: 'critical', label: 'Critical — System failure',   dot: 'bg-red-600' },
];

export default function ReportIssueModal({ hideFloatingButton = false, externalOpen, onExternalClose }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    issue_type: 'bug',
    module: 'general',
    severity: 'medium',
    title: '',
    description: '',
  });

  // Support external open control
  const isOpen = externalOpen !== undefined ? externalOpen : open;
  const handleClose = () => {
    if (onExternalClose) onExternalClose();
    else setOpen(false);
  };

  const handleOpen = () => {
    setSubmitted(false);
    setForm({ issue_type: 'bug', module: 'general', severity: 'medium', title: '', description: '' });
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Auto-capture session context snapshot
    const sessionContext = {
      page_url: window.location.pathname,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
    };

    await base44.entities.IssueLog.create({
      ...form,
      page_url: window.location.pathname,
      session_context: sessionContext,
      // tenant_id auto-populated by RLS from user context
    });

    setLoading(false);
    setSubmitted(true);
  };

  return (
    <>
      {/* Floating Trigger Button — hidden when embedded */}
      {!hideFloatingButton && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-orbitan-slate text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg hover:bg-orbitan-blue transition-all duration-200 hover:shadow-xl group"
          title="Report an Issue"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="hidden sm:inline">Feedback</span>
        </button>
      )}

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          {!submitted ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-heading">
                  <MessageSquarePlus className="w-5 h-5 text-orbitan-blue" />
                  Report an Issue
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Pilot Feedback — your input helps refine OrbitanOS. Session context is auto-captured.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                {/* Issue Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Issue Type</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {ISSUE_TYPES.map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, issue_type: t.value }))}
                          className={cn(
                            'flex flex-col items-center gap-1 rounded-lg border p-2.5 text-[11px] font-medium transition-all',
                            form.issue_type === t.value
                              ? 'border-orbitan-blue bg-orbitan-blue-light text-orbitan-blue'
                              : 'border-border bg-background text-muted-foreground hover:border-border hover:bg-muted'
                          )}
                        >
                          <Icon className={cn('w-4 h-4', form.issue_type === t.value ? 'text-orbitan-blue' : t.color)} />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Module + Severity row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Module</Label>
                    <Select value={form.module} onValueChange={(v) => setForm(f => ({ ...f, module: v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODULES.map(m => (
                          <SelectItem key={m} value={m} className="text-xs capitalize">
                            {m.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Severity</Label>
                    <Select value={form.severity} onValueChange={(v) => setForm(f => ({ ...f, severity: v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITIES.map(s => (
                          <SelectItem key={s.value} value={s.value} className="text-xs">
                            <span className="flex items-center gap-2">
                              <span className={cn('w-2 h-2 rounded-full inline-block', s.dot)} />
                              {s.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</Label>
                  <Input
                    placeholder="Brief description of the issue..."
                    value={form.title}
                    onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                    required
                    className="text-sm h-9"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</Label>
                  <Textarea
                    placeholder="What happened? What did you expect? Any steps to reproduce..."
                    value={form.description}
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                    required
                    className="text-sm h-24 resize-none"
                  />
                </div>

                {/* Auto-capture notice */}
                <p className="text-[10px] text-muted-foreground bg-muted rounded-lg px-3 py-2">
                  📍 Auto-captured: <span className="font-mono">{window.location.pathname}</span> — session context will be attached.
                </p>

                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="flex-1 gap-1.5" disabled={loading}>
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquarePlus className="w-3.5 h-3.5" />}
                    Submit Report
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center py-8 text-center gap-4">
              <div className="w-14 h-14 bg-orbitan-green-light rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-orbitan-green" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">Report Submitted</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Thank you — your feedback has been logged and will be reviewed by the Orbitan team.
                </p>
              </div>
              <Button size="sm" onClick={handleClose} className="mt-2">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}