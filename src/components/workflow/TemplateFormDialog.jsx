import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2, GripVertical } from 'lucide-react';

const CATEGORIES = [
  { value: 'opening', label: 'Opening' },
  { value: 'closing', label: 'Closing' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'inventory_count', label: 'Inventory Count' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'compliance_inspection', label: 'Compliance Inspection' },
  { value: 'incident_response', label: 'Incident Response' },
  { value: 'food_safety', label: 'Food Safety' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'audit_preparation', label: 'Audit Preparation' },
  { value: 'custom', label: 'Custom' },
];
const RECURRENCE = [
  { value: 'none', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'custom', label: 'Custom' },
];
const ROLES = [
  { value: 'tenant_admin', label: 'Tenant Admin' },
  { value: 'outlet_manager', label: 'Outlet Manager' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'worker', label: 'Worker' },
];

export default function TemplateFormDialog({ open, onOpenChange, editTemplate }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!editTemplate;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('custom');
  const [recurrence, setRecurrence] = useState('none');
  const [assigneeRole, setAssigneeRole] = useState('worker');
  const [steps, setSteps] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (editTemplate) {
        setName(editTemplate.name || '');
        setDescription(editTemplate.description || '');
        setCategory(editTemplate.category || 'custom');
        setRecurrence(editTemplate.recurrence || 'none');
        setAssigneeRole(editTemplate.assignee_role || 'worker');
        setSteps((editTemplate.steps || []).map((s) => ({ ...s })));
        setNotes(editTemplate.notes || '');
      } else {
        setName(''); setDescription(''); setCategory('custom');
        setRecurrence('none'); setAssigneeRole('worker'); setSteps([]); setNotes('');
      }
      setError('');
    }
  }, [open, editTemplate]);

  const tenantId = user?.data?.tenant_id;

  const addStep = () => {
    setSteps([...steps, { order: steps.length + 1, title: '', description: '', assignee_role: '', expected_duration_mins: 0, required_evidence: false, approval_required: false }]);
  };
  const removeStep = (idx) => setSteps(steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })));
  const moveStep = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= steps.length) return;
    const next = [...steps];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setSteps(next.map((s, i) => ({ ...s, order: i + 1 })));
  };
  const updateStep = (idx, field, value) => {
    const next = [...steps];
    next[idx] = { ...next[idx], [field]: value };
    setSteps(next);
  };

  const validate = () => {
    if (!tenantId) { setError('No tenant context.'); return false; }
    if (!name.trim()) { setError('Template name is required.'); return false; }
    if (steps.length === 0) { setError('At least one step is required.'); return false; }
    if (steps.some((s) => !s.title.trim())) { setError('All steps must have a title.'); return false; }
    return true;
  };

  const handleSave = async (publish = false) => {
    if (!validate()) return;
    setSaving(true); setError('');
    try {
      const payload = {
        action: isEdit ? 'update' : 'create',
        tenant_id: tenantId,
        template_id: isEdit ? editTemplate.id : undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        recurrence,
        assignee_role: assigneeRole,
        steps: steps.map((s, i) => ({
          order: i + 1,
          title: s.title.trim(),
          description: s.description?.trim() || undefined,
          assignee_role: s.assignee_role || undefined,
          expected_duration_mins: Number(s.expected_duration_mins) || 0,
          required_evidence: !!s.required_evidence,
          approval_required: !!s.approval_required,
        })),
        publish,
        notes: notes.trim() || undefined,
      };

      const res = await base44.functions.invoke('workflowTemplateService', payload);
      const result = res?.data || res;
      if (result?.error) {
        const errMsg = typeof result.error === 'object' ? result.error.message : result.error;
        throw new Error(errMsg || 'Failed to save template.');
      }
      qc.invalidateQueries({ queryKey: ['workflow-templates'] });
      onOpenChange(false);
    } catch (e) {
      setError(e.message || 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Workflow Template' : 'Create Workflow Template'}</DialogTitle>
          <DialogDescription>Define reusable, versioned operational workflows with ordered steps.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Template Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Daily Opening Checklist" className="mt-1 text-sm" />
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this workflow covers…" className="mt-1 text-sm" rows={2} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Recurrence</Label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECURRENCE.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Default Assignee Role</Label>
              <Select value={assigneeRole} onValueChange={setAssigneeRole}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Steps Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Workflow Steps</Label>
              <Button variant="outline" size="sm" onClick={addStep} className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" /> Add Step</Button>
            </div>
            {steps.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-md">No steps. Add the first step to begin.</p>
            ) : (
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div key={idx} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-medium w-6">#{idx + 1}</span>
                      <Input value={step.title} onChange={(e) => updateStep(idx, 'title', e.target.value)} placeholder="Step title…" className="flex-1 text-xs h-7" />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveStep(idx, -1)} disabled={idx === 0} aria-label="Move up"><ArrowUp className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1} aria-label="Move down"><ArrowDown className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeStep(idx)} aria-label="Remove step"><Trash2 className="w-3 h-3" /></Button>
                    </div>
                    <Input value={step.description || ''} onChange={(e) => updateStep(idx, 'description', e.target.value)} placeholder="Step description (optional)…" className="text-xs h-7" />
                    <div className="flex items-center gap-3 flex-wrap">
                      <Select value={step.assignee_role || ''} onValueChange={(v) => updateStep(idx, 'assignee_role', v)}>
                        <SelectTrigger className="w-36 text-xs h-7"><SelectValue placeholder="Assignee role…" /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <Input type="number" min="0" value={step.expected_duration_mins || 0} onChange={(e) => updateStep(idx, 'expected_duration_mins', e.target.value)} className="w-16 text-xs h-7" />
                        <span className="text-xs text-muted-foreground">mins</span>
                      </div>
                      <label className="flex items-center gap-1 text-xs">
                        <Switch checked={!!step.required_evidence} onCheckedChange={(v) => updateStep(idx, 'required_evidence', v)} />
                        Evidence
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <Switch checked={!!step.approval_required} onCheckedChange={(v) => updateStep(idx, 'approval_required', v)} />
                        Approval
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes (optional)…" className="mt-1 text-sm" rows={2} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEdit ? 'Update Draft' : 'Save Draft')}
          </Button>
          <Button size="sm" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Publish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}