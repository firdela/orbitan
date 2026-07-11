// OrbitanOS — Pilot Feedback & Product Intelligence Modal
// Refine + Regulate Principle: structured feedback intake with
// auto session snapshot, attachment upload, and AI analysis trigger.

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
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
import {
  MessageSquarePlus, CheckCircle2, Loader2, Bug, Lightbulb, Shield,
  MousePointerClick, Database, Upload, X, Sparkles, Heart, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const ISSUE_TYPES = [
  { value: 'bug',              label: 'Bug / Error',           icon: Bug,               color: 'text-red-500' },
  { value: 'improvement',      label: 'Improvement Idea',      icon: Lightbulb,         color: 'text-amber-500' },
  { value: 'usability',        label: 'Usability Issue',       icon: MousePointerClick, color: 'text-purple-500' },
  { value: 'compliance_query', label: 'Compliance Query',      icon: Shield,            color: 'text-blue-500' },
  { value: 'data_issue',       label: 'Data Issue',            icon: Database,         color: 'text-slate-500' },
];

const FEEDBACK_CATEGORIES = [
  { value: 'bug_report',          label: 'Bug Report' },
  { value: 'feature_request',     label: 'Feature Request' },
  { value: 'improvement_suggestion', label: 'Improvement Suggestion' },
  { value: 'ui_ux_feedback',      label: 'UI / UX Feedback' },
  { value: 'ai_feedback',         label: 'AI Feedback' },
  { value: 'inventory',           label: 'Inventory' },
  { value: 'procurement',         label: 'Procurement' },
  { value: 'employees',           label: 'Employees' },
  { value: 'shifts',              label: 'Shifts' },
  { value: 'sales_invoicing',     label: 'Sales & Invoicing' },
  { value: 'aireceipts',          label: 'AIReceipts' },
  { value: 'xero_integration',    label: 'Xero Integration' },
  { value: 'performance',         label: 'Performance' },
  { value: 'security',            label: 'Security' },
  { value: 'compliment',          label: 'Compliment / Success Story' },
  { value: 'general_feedback',    label: 'General Feedback' },
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
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [form, setForm] = useState({
    issue_type: 'bug',
    feedback_category: 'bug_report',
    module: 'general',
    severity: 'medium',
    title: '',
    description: '',
  });

  const isOpen = externalOpen !== undefined ? externalOpen : open;
  const handleClose = () => {
    if (onExternalClose) onExternalClose();
    else setOpen(false);
  };

  const handleOpen = () => {
    setSubmitted(false);
    setAttachments([]);
    setForm({
      issue_type: 'bug',
      feedback_category: 'bug_report',
      module: 'general',
      severity: 'medium',
      title: '',
      description: '',
    });
    setOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAttachments((prev) => [...prev, file_url]);
      toast({ title: 'Attachment uploaded', description: file.name });
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const sessionContext = {
      page_url: window.location.pathname,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };

    try {
      await base44.entities.IssueLog.create({
        ...form,
        tenant_id: user?.tenant_id || user?.data?.tenant_id || undefined,
        outlet_id: user?.outlet_id || user?.data?.outlet_id || undefined,
        reported_by_id: user?.id || undefined,
        reported_by_name: user?.full_name || user?.email || undefined,
        page_url: window.location.pathname,
        session_context: sessionContext,
        attachment_urls: attachments.length > 0 ? attachments : undefined,
        workflow_status: 'new',
      });

      setLoading(false);
      setSubmitted(true);
    } catch (err) {
      setLoading(false);
      toast({
        title: 'Failed to submit feedback',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      {!hideFloatingButton && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-orbitan-slate text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg hover:bg-orbitan-blue transition-all duration-200 hover:shadow-xl group"
          title="Report an Issue / Send Feedback"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="hidden sm:inline">Feedback</span>
        </button>
      )}

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {!submitted ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-heading">
                  <Sparkles className="w-5 h-5 text-orbitan-blue" />
                  Pilot Feedback Centre
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Help us refine OrbitanOS. Your feedback is analysed by Orbit Nexus AI and routed to our product backlog. Session context is auto-captured.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                {/* Feedback Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</Label>
                  <Select
                    value={form.feedback_category}
                    onValueChange={(v) => setForm(f => ({ ...f, feedback_category: v }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {FEEDBACK_CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value} className="text-xs">
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Issue Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Issue Type</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {ISSUE_TYPES.map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, issue_type: t.value }))}
                          className={cn(
                            'flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px] font-medium transition-all',
                            form.issue_type === t.value
                              ? 'border-orbitan-blue bg-orbitan-blue-light text-orbitan-blue'
                              : 'border-border bg-background text-muted-foreground hover:border-border hover:bg-muted'
                          )}
                        >
                          <Icon className={cn('w-3.5 h-3.5', form.issue_type === t.value ? 'text-orbitan-blue' : t.color)} />
                          {t.label.split(' / ')[0]}
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
                              {s.label.split(' — ')[0]}
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
                    placeholder="Brief description of the feedback..."
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

                {/* Attachments */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attachments (optional)</Label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground border border-dashed border-border rounded-lg px-3 py-2 cursor-pointer hover:bg-muted transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingFile ? 'Uploading...' : 'Upload screenshot'}
                      <input
                        type="file"
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploadingFile}
                      />
                    </label>
                    {attachments.length > 0 && (
                      <span className="text-xs text-muted-foreground">{attachments.length} file(s)</span>
                    )}
                  </div>
                  {attachments.length > 0 && (
                    <div className="space-y-1.5">
                      {attachments.map((url, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-muted rounded-lg px-3 py-1.5">
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-orbitan-blue hover:underline truncate flex-1">
                            Attachment {idx + 1}
                          </a>
                          <button type="button" onClick={() => removeAttachment(idx)} className="text-muted-foreground hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Auto-capture notice */}
                <p className="text-[10px] text-muted-foreground bg-muted rounded-lg px-3 py-2 flex items-center gap-1.5">
                  <Heart className="w-3 h-3 text-orbitan-red flex-shrink-0" />
                  Auto-captured: <span className="font-mono">{window.location.pathname}</span> — session context attached. AI analysis runs automatically after submission.
                </p>

                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="flex-1 gap-1.5" disabled={loading}>
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    Submit Feedback
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
                <h3 className="font-heading font-semibold text-foreground">Feedback Submitted</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Thank you — your feedback has been logged. Orbit Nexus AI will analyse it for sentiment, priority, and duplicate detection. The Orbitan team reviews all feedback in the Product Intelligence dashboard.
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