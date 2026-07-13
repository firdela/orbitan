import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield, Plus, AlertTriangle, CheckCircle2, Clock, XCircle,
  Home, Package, ShoppingCart, FileText, Users, Calendar,
  CheckSquare, BarChart2, Layers, Building2, PenTool, ShieldCheck
} from 'lucide-react';
import SignatureDialog from '@/components/compliance/SignatureDialog';
import AuditReadinessAnalytics from '@/components/compliance/AuditReadinessAnalytics';



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
  const [signRecord, setSignRecord] = useState(null);
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

  const onSigned = () => {
    queryClient.invalidateQueries({ queryKey: ['outlet-compliance'] });
  };

  const approved = records.filter(r => r.status === 'approved').length;
  const overdue = records.filter(r => r.status === 'overdue').length;
  const pending = records.filter(r => ['pending', 'in_review'].includes(r.status)).length;
  const score = records.length ? Math.round((approved / records.length) * 100) : 100;
  const riskColor = score >= 90 ? 'text-orbitan-green' : score >= 70 ? 'text-orbitan-amber' : 'text-orbitan-red';
  const riskLabel = score >= 90 ? 'Green' : score >= 70 ? 'Amber' : 'Red';

  return (
    <>
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

        <Tabs defaultValue="records" className="w-full">
          <TabsList className="mb-5">
            <TabsTrigger value="records" className="gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Records
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" /> Audit Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="records">
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
                      <div className="flex-shrink-0">
                        {rec.signature_hash
                          ? <ShieldCheck className="w-4 h-4 text-orbitan-green" />
                          : (STATUS_ICONS[rec.status] || <Clock className="w-4 h-4 text-muted-foreground" />)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{rec.title}</p>
                          {rec.signature_hash && (
                            <span className="text-[10px] font-semibold text-orbitan-green bg-orbitan-green-light px-1.5 py-0.5 rounded-full flex items-center gap-0.5 flex-shrink-0">
                              <ShieldCheck className="w-2.5 h-2.5" /> Signed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{rec.type} · {rec.category?.replace('_', ' ')}</p>
                        {rec.signed_by_name && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Signed by {rec.signed_by_name} · {rec.signed_date ? new Date(rec.signed_date).toLocaleDateString('en-SG') : ''}
                          </p>
                        )}
                      </div>
                      {rec.due_date && (
                        <p className="text-xs text-muted-foreground hidden sm:block">{rec.due_date}</p>
                      )}
                      <StatusBadge status={rec.status} size="sm" />
                      {!rec.signature_hash && rec.status !== 'approved' && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs h-7 flex-shrink-0" onClick={() => setSignRecord(rec)}>
                          <PenTool className="w-3 h-3" /> Sign
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <AuditReadinessAnalytics />
          </TabsContent>
        </Tabs>
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

      <SignatureDialog
        open={!!signRecord}
        onOpenChange={setSignRecord}
        record={signRecord}
        entityName="ComplianceRecord"
        onSigned={onSigned}
      />
    </>
  );
}