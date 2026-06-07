import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Shield, Plus, AlertTriangle, CheckCircle2, Clock, XCircle,
  Home, Package, ShoppingCart, FileText, Users, Calendar,
  CheckSquare, BarChart2, Layers, Building2
} from 'lucide-react';

const NAV = [
  { type: 'section', label: 'Outlet' },
  { href: '/outlet', icon: Home, label: 'Dashboard' },
  { href: '/outlet/inventory', icon: Package, label: 'Inventory' },
  { href: '/outlet/procurement', icon: ShoppingCart, label: 'Purchase Orders' },
  { href: '/outlet/sales', icon: FileText, label: 'Sales & Reconciliation' },
  { type: 'section', label: 'Team' },
  { href: '/outlet/workforce', icon: Users, label: 'My Team' },
  { href: '/outlet/scheduling', icon: Calendar, label: 'Shift Schedule' },
  { href: '/outlet/tasks', icon: CheckSquare, label: 'Tasks' },
  { type: 'section', label: 'Reports' },
  { href: '/outlet/reports', icon: BarChart2, label: 'Reports' },
  { href: '/outlet/compliance', icon: Shield, label: 'Compliance' },
  { type: 'section', label: 'Navigation' },
  { href: '/company', icon: Building2, label: 'Company Dashboard' },
  { href: '/leader-org', icon: Layers, label: 'OrbitanOS Console' },
];

const STATUS_ICONS = {
  approved: <CheckCircle2 className="w-4 h-4 text-orbitan-green" />,
  pending: <Clock className="w-4 h-4 text-orbitan-amber" />,
  in_review: <Clock className="w-4 h-4 text-orbitan-amber" />,
  overdue: <AlertTriangle className="w-4 h-4 text-orbitan-red" />,
  rejected: <XCircle className="w-4 h-4 text-orbitan-red" />,
  submitted: <CheckCircle2 className="w-4 h-4 text-orbitan-blue" />,
};

export default function CompliancePage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newRec, setNewRec] = useState({ title: '', type: '', category: 'food_safety', due_date: '', status: 'pending' });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['outlet-compliance'],
    queryFn: () => base44.entities.ComplianceRecord.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ComplianceRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlet-compliance'] });
      setShowAdd(false);
      setNewRec({ title: '', type: '', category: 'food_safety', due_date: '', status: 'pending' });
    },
  });

  const approved = records.filter(r => r.status === 'approved').length;
  const overdue = records.filter(r => r.status === 'overdue').length;
  const pending = records.filter(r => ['pending', 'in_review'].includes(r.status)).length;
  const score = records.length ? Math.round((approved / records.length) * 100) : 100;
  const riskColor = score >= 90 ? 'text-orbitan-green' : score >= 70 ? 'text-orbitan-amber' : 'text-orbitan-red';
  const riskLabel = score >= 90 ? 'Green' : score >= 70 ? 'Amber' : 'Red';

  return (
    <AppShell navigation={NAV} title="">
      <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
        <PageHeader
          title="Compliance Centre"
          subtitle="Orbitan Shield™ · Powered by Regulate"
          actions={
            <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" />
              Add Record
            </Button>
          }
        />

        {/* Health Score Banner */}
        <div className="bg-card border border-border rounded-xl p-5 mb-6 flex items-center gap-6">
          <div className="text-center">
            <p className={`text-4xl font-display font-bold ${riskColor}`}>{score}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">Compliance Score</p>
          </div>
          <div className="w-px h-12 bg-border" />
          <div className="grid grid-cols-3 gap-6 flex-1">
            <div className="text-center">
              <p className="text-xl font-bold text-orbitan-green">{approved}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-orbitan-amber">{pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-orbitan-red">{overdue}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </div>
          <div className="hidden md:block">
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${score >= 90 ? 'bg-orbitan-green-light text-orbitan-green border-green-200' : score >= 70 ? 'bg-orbitan-amber-light text-orbitan-amber border-amber-200' : 'bg-orbitan-red-light text-orbitan-red border-red-200'}`}>
              Risk: {riskLabel}
            </span>
          </div>
        </div>

        {/* Records list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-heading font-semibold text-sm">Compliance Records</h3>
          </div>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading records...</div>
          ) : records.length === 0 ? (
            <EmptyState icon={Shield} title="No compliance records" description="Add your first compliance record to start tracking." action={() => setShowAdd(true)} actionLabel="Add Record" />
          ) : (
            <div className="divide-y divide-border">
              {records.map(rec => (
                <div key={rec.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-shrink-0">{STATUS_ICONS[rec.status] || <Clock className="w-4 h-4 text-muted-foreground" />}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{rec.title}</p>
                    <p className="text-xs text-muted-foreground">{rec.type} · {rec.category?.replace('_', ' ')}</p>
                  </div>
                  {rec.due_date && (
                    <p className="text-xs text-muted-foreground hidden sm:block">{rec.due_date}</p>
                  )}
                  <StatusBadge status={rec.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Compliance Record</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1 block">Title *</Label>
              <Input value={newRec.title} onChange={e => setNewRec(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Monthly Food Safety Audit" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Type</Label>
              <Input value={newRec.type} onChange={e => setNewRec(p => ({ ...p, type: e.target.value }))} placeholder="e.g. Food Safety Audit" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Category</Label>
                <Select value={newRec.category} onValueChange={v => setNewRec(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food_safety">Food Safety</SelectItem>
                    <SelectItem value="fire_safety">Fire Safety</SelectItem>
                    <SelectItem value="licensing">Licensing</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="environmental">Environmental</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Due Date</Label>
                <Input type="date" value={newRec.due_date} onChange={e => setNewRec(p => ({ ...p, due_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(newRec)}
              disabled={!newRec.title || createMutation.isPending}
            >
              {createMutation.isPending ? 'Adding...' : 'Add Record'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}