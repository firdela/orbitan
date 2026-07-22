import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { auditFrontend, ACTION_TYPES } from '@/lib/audit';
import { ArrowLeftRight, Check, X, Loader2, Users, Clock } from 'lucide-react';

export default function ShiftTradesPage() {
  const { user } = useAuth();
  const { tenantId } = useOutletContext() || {};
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedShift, setSelectedShift] = useState('');
  const [targetEmployee, setTargetEmployee] = useState('');
  const [reason, setReason] = useState('');

  const outletId = user?.data?.outlet_id || user?.outlet_id;
  const isManager = ['admin', 'tenant_admin', 'outlet_manager', 'supervisor'].includes(user?.role);

  const { data: tradeRequests = [], isLoading } = useQuery({
    queryKey: ['shift-trades', tenantId],
    queryFn: () => base44.entities.ShiftTradeRequest.filter({ tenant_id: tenantId }, '-created_date', 100),
    enabled: !!tenantId,
  });

  const { data: myShifts = [] } = useQuery({
    queryKey: ['my-shifts-for-trade', user?.id],
    queryFn: () => base44.entities.Shift.filter({ employee_id: user.id, status: 'scheduled' }),
    enabled: !!user?.id,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['outlet-employees-for-trade', tenantId],
    queryFn: () => base44.entities.Employee.filter({ tenant_id: tenantId }, '-created_date', 100),
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ShiftTradeRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-trades'] });
      setShowForm(false);
      setSelectedShift('');
      setTargetEmployee('');
      setReason('');
      toast({ title: 'Trade Request Submitted', description: 'Your manager will review this request.' });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ trade, approved }) => {
      const auditEntry = await auditFrontend({
        tenant_id: tenantId,
        outlet_id: outletId,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: approved ? ACTION_TYPES.SHIFT_TRADE_APPROVED : ACTION_TYPES.SHIFT_TRADE_DENIED,
        module: 'scheduling',
        target_entity: 'ShiftTradeRequest',
        target_record_id: trade.id,
        details: `Shift trade ${approved ? 'approved' : 'denied'}: ${trade.requesting_employee_name} → ${trade.target_employee_name || 'N/A'} for ${trade.shift_date}`,
      });

      const updated = await base44.entities.ShiftTradeRequest.update(trade.id, {
        status: approved ? 'approved' : 'denied',
        reviewed_by_id: user.id,
        reviewed_by_name: user.full_name,
        reviewed_date: new Date().toISOString(),
        audit_log_id: auditEntry?.id,
      });

      if (approved && trade.target_employee_id) {
        await base44.entities.Shift.update(trade.shift_id, {
          employee_id: trade.target_employee_id,
          employee_name: trade.target_employee_name,
        });
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-trades'] });
      queryClient.invalidateQueries({ queryKey: ['outlet-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['my-shifts-for-trade'] });
      toast({ title: 'Trade Reviewed', description: 'The schedule has been updated.' });
    },
  });

  const handleCreate = () => {
    const shift = myShifts.find(s => s.id === selectedShift);
    const target = employees.find(e => e.id === targetEmployee);
    if (!shift || !target) return;

    createMutation.mutate({
      tenant_id: tenantId,
      outlet_id: outletId,
      shift_id: shift.id,
      shift_date: shift.date,
      shift_start_time: shift.start_time,
      shift_end_time: shift.end_time,
      requesting_employee_id: user.id,
      requesting_employee_name: user.full_name,
      target_employee_id: target.id,
      target_employee_name: target.full_name,
      reason,
      status: 'pending',
      created_date: new Date().toISOString(),
    });
  };

  const pending = tradeRequests.filter(t => t.status === 'pending');
  const resolved = tradeRequests.filter(t => t.status === 'approved' || t.status === 'denied');

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <PageHeader
        title="Shift Trade Requests"
        subtitle={`${pending.length} pending · ${tradeRequests.length} total`}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
            <ArrowLeftRight className="w-4 h-4" /> Request Trade
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Pending" value={pending.length} subtitle="Awaiting review" icon={Clock} color="amber" />
        <StatCard title="Approved" value={tradeRequests.filter(t => t.status === 'approved').length} icon={Check} color="green" />
        <StatCard title="Denied" value={tradeRequests.filter(t => t.status === 'denied').length} icon={X} color="red" />
        <StatCard title="Total Requests" value={tradeRequests.length} icon={Users} color="blue" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : tradeRequests.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="No shift trade requests" description="Request a shift trade and your manager will be notified." color="blue" onAction={() => setShowForm(true)} actionLabel="Request Trade" />
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h3 className="text-sm font-heading font-semibold text-muted-foreground mb-3">Pending Review</h3>
              <div className="space-y-3">
                {pending.map(trade => (
                  <div key={trade.id} className="bg-card border border-border rounded-xl p-4 card-elevated">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{trade.requesting_employee_name}</span>
                          <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-semibold text-sm">{trade.target_employee_name || 'Open'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{trade.shift_date} · {trade.shift_start_time}–{trade.shift_end_time}</p>
                        {trade.reason && <p className="text-xs text-muted-foreground mt-1 italic">"{trade.reason}"</p>}
                      </div>
                      {isManager && (
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" className="gap-1 text-xs" onClick={() => reviewMutation.mutate({ trade, approved: true })} disabled={reviewMutation.isPending}>
                            <Check className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => reviewMutation.mutate({ trade, approved: false })} disabled={reviewMutation.isPending}>
                            <X className="w-3.5 h-3.5" /> Deny
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resolved.length > 0 && (
            <div>
              <h3 className="text-sm font-heading font-semibold text-muted-foreground mb-3">History</h3>
              <div className="space-y-2">
                {resolved.slice(0, 20).map(trade => (
                  <div key={trade.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <span className="text-sm font-medium">{trade.requesting_employee_name}</span>
                      <span className="text-xs text-muted-foreground"> → {trade.target_employee_name || 'Open'}</span>
                      <span className="text-xs text-muted-foreground ml-2">· {trade.shift_date}</span>
                    </div>
                    <StatusBadge status={trade.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Shift Trade</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1 block">Your Shift</Label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger><SelectValue placeholder="Select shift to trade..." /></SelectTrigger>
                <SelectContent>
                  {myShifts.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.date} · {s.start_time}–{s.end_time}</SelectItem>
                  ))}
                  {myShifts.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1.5">No upcoming scheduled shifts.</p>}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Trade With (optional)</Label>
              <Select value={targetEmployee} onValueChange={setTargetEmployee}>
                <SelectTrigger><SelectValue placeholder="Select colleague..." /></SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.id !== user.id).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Reason</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Why do you need this trade?" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!selectedShift || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}