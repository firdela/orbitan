import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function TaskCreateDialog({ open, onOpenChange, employees, tenantId, outletId, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium',
    due_date: '', due_time: '', module_context: '',
    responsible_agent_id: '', responsible_agent_name: '',
    accountable_agent_id: '', accountable_agent_name: '',
    verification_mode: 'none', completion_requirements: '',
  });

  const update = (patch) => setForm(p => ({ ...p, ...patch }));

  const pickEmployee = (id) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    update({ responsible_agent_id: emp.id, responsible_agent_name: emp.full_name });
  };
  const pickAccountable = (id) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    update({ accountable_agent_id: emp.id, accountable_agent_name: emp.full_name });
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError(null);
    try {
      const res = await base44.functions.invoke('taskController', {
        action: 'createTask',
        tenant_id: tenantId,
        outlet_id: outletId || null,
        ...form,
        due_date: form.due_date || null,
      });
      onCreated?.(res.data.task);
      onOpenChange(false);
      setForm({ title: '', description: '', priority: 'medium', due_date: '', due_time: '', module_context: '', responsible_agent_id: '', responsible_agent_name: '', accountable_agent_id: '', accountable_agent_name: '', verification_mode: 'none', completion_requirements: '' });
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs mb-1 block">Task Title *</Label>
            <Input value={form.title} onChange={e => update({ title: e.target.value })} placeholder="e.g. Complete morning prep" />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Description</Label>
            <Textarea value={form.description} onChange={e => update({ description: e.target.value })} rows={2} placeholder="What needs to be done..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Responsible Agent</Label>
              <Select value={form.responsible_agent_id} onValueChange={pickEmployee}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Accountable (optional)</Label>
              <Select value={form.accountable_agent_id} onValueChange={pickAccountable}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Priority</Label>
              <Select value={form.priority} onValueChange={v => update({ priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Verification</Label>
              <Select value={form.verification_mode} onValueChange={v => update({ verification_mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (auto-complete)</SelectItem>
                  <SelectItem value="self">Self-verify</SelectItem>
                  <SelectItem value="manager">Manager verify</SelectItem>
                  <SelectItem value="approval_gated">Governed gate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Due Date</Label>
              <Input type="date" value={form.due_date} onChange={e => update({ due_date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Due Time</Label>
              <Input type="time" value={form.due_time} onChange={e => update({ due_time: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Module Context</Label>
            <Input value={form.module_context} onChange={e => update({ module_context: e.target.value })} placeholder="e.g. compliance, inventory, kitchen" />
          </div>
          {form.verification_mode !== 'none' && (
            <div>
              <Label className="text-xs mb-1 block">Completion Requirements</Label>
              <Textarea value={form.completion_requirements} onChange={e => update({ completion_requirements: e.target.value })} rows={2} placeholder="What must be satisfied before submission..." />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.title.trim()}>{saving ? 'Creating...' : 'Create Task'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}