import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Users, Home,
  Package, ShoppingCart, FileText, CheckSquare, BarChart2,
  Shield, Layers, Building2, Clock, Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const SHIFT_COLORS = ['bg-orbitan-blue-light text-orbitan-blue border-blue-200', 'bg-orbitan-purple-light text-orbitan-purple border-purple-200', 'bg-orbitan-green-light text-orbitan-green border-green-200', 'bg-orbitan-amber-light text-orbitan-amber border-amber-200'];

const AVATAR_COLORS = [
  'orbitan-gradient', 'bg-orbitan-purple', 'bg-orbitan-green', 'bg-orbitan-amber',
];

export default function SchedulingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showAdd, setShowAdd] = useState(false);
  const [newShift, setNewShift] = useState({ employee_id: '', date: new Date().toISOString().split('T')[0], start_time: '09:00', end_time: '17:00' });

  const tenantId = user?.tenant_id || user?.data?.tenant_id;
  const outletId = user?.outlet_id || user?.data?.outlet_id;

  const { data: employees = [], isLoading: loadingEmps } = useQuery({
    queryKey: ['outlet-employees'],
    queryFn: () => base44.entities.Employee.list('-created_date', 100),
  });

  const { data: shifts = [], isLoading: loadingShifts } = useQuery({
    queryKey: ['outlet-shifts'],
    queryFn: () => base44.entities.Shift.list('-created_date', 200),
  });

  const createShiftMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlet-shifts'] });
      setShowAdd(false);
      setNewShift({ employee_id: '', date: new Date().toISOString().split('T')[0], start_time: '09:00', end_time: '17:00' });
    },
  });

  const publishAllMutation = useMutation({
    mutationFn: async () => {
      const unpublished = shifts.filter(s => !s.published);
      if (unpublished.length === 0) return;
      const updates = unpublished.map(s => ({ id: s.id, published: true }));
      await base44.entities.Shift.bulkUpdate(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlet-shifts'] });
    },
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const shiftsForDay = (day) => shifts.filter(s => isSameDay(new Date(s.date + 'T00:00:00'), day));

  const handleAddShift = () => {
    const emp = employees.find(e => e.id === newShift.employee_id);
    createShiftMutation.mutate({
      tenant_id: tenantId,
      outlet_id: outletId,
      employee_id: newShift.employee_id,
      employee_name: emp?.full_name || '',
      date: newShift.date,
      start_time: newShift.start_time,
      end_time: newShift.end_time,
      status: 'scheduled',
      published: false,
    });
  };

  const totalPublished = shifts.filter(s => s.published).length;
  const isLoading = loadingEmps || loadingShifts;

  return (
    <AppShell navigation={NAV} title="">
      <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
        <PageHeader
          title="Shift Schedule"
          subtitle={`Week of ${format(weekStart, 'd MMM')} · ${shifts.length} shifts · ${totalPublished} published`}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => publishAllMutation.mutate()} disabled={publishAllMutation.isPending} className="text-xs gap-1.5">
                <CheckSquare className="w-3.5 h-3.5" />
                Publish All
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4" />
                Add Shift
              </Button>
            </div>
          }
        />

        {/* Week navigation */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setWeekStart(d => addDays(d, -7))} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-medium text-sm text-foreground">
            {format(weekStart, 'd MMM')} – {format(addDays(weekStart, 6), 'd MMM yyyy')}
          </span>
          <button onClick={() => setWeekStart(d => addDays(d, 7))} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading schedule...
          </div>
        ) : employees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No employees yet"
            description="Add team members from the My Team page before scheduling shifts."
            color="blue"
          />
        ) : shifts.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No shifts scheduled"
            description="Click 'Add Shift' to create your first shift for this week."
            action={() => setShowAdd(true)}
            actionLabel="Add Shift"
            color="blue"
          />
        ) : (
          <>
            {/* Schedule grid — desktop */}
            <div className="hidden lg:block bg-card border border-border rounded-xl overflow-hidden mb-6">
              <div className="grid grid-cols-8 border-b border-border">
                <div className="px-4 py-3 text-xs font-semibold text-muted-foreground bg-muted/50">Employee</div>
                {weekDays.map((day, i) => (
                  <div key={i} className={`px-3 py-3 text-center border-l border-border bg-muted/50 ${isSameDay(day, new Date()) ? 'bg-orbitan-blue-light' : ''}`}>
                    <p className={`text-xs font-semibold ${isSameDay(day, new Date()) ? 'text-orbitan-blue' : 'text-muted-foreground'}`}>{format(day, 'EEE')}</p>
                    <p className={`text-sm font-bold ${isSameDay(day, new Date()) ? 'text-orbitan-blue' : 'text-foreground'}`}>{format(day, 'd')}</p>
                  </div>
                ))}
              </div>
              {employees.map((emp, ei) => (
                <div key={emp.id} className="grid grid-cols-8 border-b border-border last:border-b-0">
                  <div className="px-4 py-3 flex items-center gap-2 border-r border-border">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${AVATAR_COLORS[ei % 4]}`}>
                      {emp.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{emp.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{emp.position || 'Staff'}</p>
                    </div>
                  </div>
                  {weekDays.map((day, di) => {
                    const dayShifts = shiftsForDay(day).filter(s => s.employee_id === emp.id);
                    return (
                      <div key={di} className="px-2 py-2 border-l border-border min-h-[60px]">
                        {dayShifts.map(shift => (
                          <div key={shift.id} className={`text-[10px] font-medium px-2 py-1 rounded border ${SHIFT_COLORS[ei % 4]} mb-1`}>
                            <p>{shift.start_time} – {shift.end_time}</p>
                            {!shift.published && <span className="text-[9px] opacity-70">Draft</span>}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Mobile list */}
            <div className="lg:hidden space-y-3">
              {weekDays.map((day, di) => {
                const dayShifts = shiftsForDay(day);
                return (
                  <div key={di} className={`bg-card border rounded-xl overflow-hidden ${isSameDay(day, new Date()) ? 'border-orbitan-blue' : 'border-border'}`}>
                    <div className={`px-4 py-2.5 flex items-center justify-between ${isSameDay(day, new Date()) ? 'bg-orbitan-blue-light' : 'bg-muted/50'}`}>
                      <p className={`text-sm font-semibold ${isSameDay(day, new Date()) ? 'text-orbitan-blue' : 'text-foreground'}`}>
                        {format(day, 'EEEE, d MMM')} {isSameDay(day, new Date()) && '(Today)'}
                      </p>
                      <span className="text-xs text-muted-foreground">{dayShifts.length} shift(s)</span>
                    </div>
                    {dayShifts.length > 0 ? (
                      <div className="divide-y divide-border">
                        {dayShifts.map(shift => (
                          <div key={shift.id} className="px-4 py-3 flex items-center gap-3">
                            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">{shift.employee_name}</p>
                              <p className="text-xs text-muted-foreground">{shift.start_time} – {shift.end_time}</p>
                            </div>
                            <StatusBadge status={shift.status} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-xs text-muted-foreground">No shifts</div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Shift</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1 block">Employee</Label>
              <Select value={newShift.employee_id} onValueChange={v => setNewShift(p => ({ ...p, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Date</Label>
              <Input type="date" value={newShift.date} onChange={e => setNewShift(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Start Time</Label>
                <Input type="time" value={newShift.start_time} onChange={e => setNewShift(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">End Time</Label>
                <Input type="time" value={newShift.end_time} onChange={e => setNewShift(p => ({ ...p, end_time: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAddShift} disabled={!newShift.employee_id || createShiftMutation.isPending}>
              {createShiftMutation.isPending ? 'Adding...' : 'Add Shift'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}