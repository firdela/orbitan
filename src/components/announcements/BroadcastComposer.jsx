// OrbitanOS — Broadcast Composer
// Relate Principle: Manager interface to draft and publish announcements
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Megaphone, Loader2, CheckCircle2, Flame, Info, AlertTriangle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIORITIES = [
  { value: 'info',      label: 'Info',      icon: Info,          color: 'bg-blue-50 text-blue-600 border-blue-200',     dot: 'bg-blue-500' },
  { value: 'important', label: 'Important', icon: AlertTriangle, color: 'bg-amber-50 text-amber-700 border-amber-200',  dot: 'bg-amber-500' },
  { value: 'urgent',    label: 'Urgent',    icon: Flame,         color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  { value: 'critical',  label: 'Critical',  icon: Zap,           color: 'bg-red-50 text-red-700 border-red-200',        dot: 'bg-red-600' },
];

const CATEGORIES = [
  { value: 'general',    label: 'General' },
  { value: 'operations', label: 'Operations' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'safety',     label: 'Safety' },
  { value: 'hr',         label: 'HR' },
  { value: 'training',   label: 'Training' },
  { value: 'shift',      label: 'Shift Brief' },
];

export default function BroadcastComposer({ open, onClose, tenantId, publisherName, publisherRole }) {
  const [step, setStep] = useState('compose'); // compose | sent
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    message: '',
    priority: 'info',
    category: 'general',
    requires_acknowledgement: false,
    pinned: false,
    outlet_id: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const now = new Date();
    const expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days default
    await base44.entities.Announcement.create({
      ...form,
      tenant_id: tenantId,
      outlet_id: form.outlet_id || null,
      published_by_name: publisherName,
      published_by_role: publisherRole,
      is_active: true,
      acknowledged_by: [],
      views_count: 0,
      expiry_date: expiry.toISOString(),
    });
    setLoading(false);
    setStep('sent');
  };

  const handleClose = () => {
    setStep('compose');
    setForm({ title: '', message: '', priority: 'info', category: 'general', requires_acknowledgement: false, pinned: false, outlet_id: '' });
    onClose();
  };

  const selectedPriority = PRIORITIES.find(p => p.value === form.priority);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {step === 'compose' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <div className="w-8 h-8 rounded-lg orbitan-gradient flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-white" />
                </div>
                Broadcast Announcement
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {/* Priority Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</Label>
                <div className="grid grid-cols-4 gap-2">
                  {PRIORITIES.map(p => {
                    const Icon = p.icon;
                    return (
                      <button key={p.value} type="button"
                        onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-xl border p-2.5 text-[11px] font-semibold transition-all',
                          form.priority === p.value ? p.color + ' ring-2 ring-offset-1 ring-current/30' : 'border-border bg-background text-muted-foreground hover:bg-muted'
                        )}>
                        <Icon className="w-4 h-4" />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category + Scope */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scope</Label>
                  <Select value={form.outlet_id || 'all'} onValueChange={v => setForm(f => ({ ...f, outlet_id: v === 'all' ? '' : v }))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Outlets (Tenant-Wide)</SelectItem>
                      <SelectItem value="taqueria_pte_ltd_main" className="text-xs">La Birria Tacos (NB)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Headline</Label>
                <Input
                  placeholder="e.g. Shift change this Friday — please read"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required className="text-sm h-9"
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message</Label>
                <Textarea
                  placeholder="Write your announcement here..."
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  required className="text-sm h-28 resize-none"
                />
              </div>

              {/* Toggles */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.requires_acknowledgement}
                    onCheckedChange={v => setForm(f => ({ ...f, requires_acknowledgement: v }))}
                    id="ack-toggle"
                  />
                  <Label htmlFor="ack-toggle" className="text-xs text-muted-foreground cursor-pointer">Require "Got it"</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.pinned}
                    onCheckedChange={v => setForm(f => ({ ...f, pinned: v }))}
                    id="pin-toggle"
                  />
                  <Label htmlFor="pin-toggle" className="text-xs text-muted-foreground cursor-pointer">Pin to top</Label>
                </div>
              </div>

              {/* Preview chip */}
              {form.title && (
                <div className={cn('flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs', selectedPriority?.color)}>
                  {selectedPriority && <selectedPriority.icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
                  <div>
                    <p className="font-bold leading-snug">{form.title}</p>
                    {form.message && <p className="opacity-80 mt-0.5 line-clamp-2">{form.message}</p>}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
                <Button type="submit" className="flex-1 gap-1.5" disabled={loading}>
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Megaphone className="w-3.5 h-3.5" />}
                  Broadcast Now
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center py-10 text-center gap-4">
            <div className="w-16 h-16 bg-orbitan-green-light rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-orbitan-green" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-foreground text-lg">Broadcast Sent</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">Your announcement has been published to all workers instantly.</p>
            </div>
            <Button onClick={handleClose} className="mt-2 px-8">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}