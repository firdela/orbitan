import React, { useState, useMemo } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { T1_NAV, T1_TENANT } from '@/lib/tenant-nav';
import {
  Calendar, Plus, Clock, UserCheck, X, AlertTriangle,
  Users, TrendingUp, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

const T1_TENANT_ID = 'taqueria_pte_ltd';
const OVERTIME_THRESHOLD_HOURS = 8; // hours per shift before overtime kicks in

function calcHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

function calcOvertime(hours) {
  return Math.max(0, hours - OVERTIME_THRESHOLD_HOURS);
}

function ShiftChip({ shift, onClick }) {
  const hours = calcHours(shift.start_time, shift.end_time);
  const ot = calcOvertime(hours);
  const isOT = ot > 0;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left text-[10px] font-medium px-1.5 py-1 rounded-lg mb-0.5 transition-all hover:opacity-80 border ${
        isOT
          ? 'bg-orange-50 text-orange-700 border-orange-200'
          : shift.status === 'confirmed'
          ? 'bg-orbitan-green-light text-orbitan-green border-green-200'
          : 'bg-orbitan-amber-light text-orbitan-amber border-amber-200'
      }`}
    >
      <div>{shift.start_time}–{shift.end_time}</div>
      <div className="text-[9px] opacity-70">{hours.toFixed(1)}h{isOT ? ` · OT ${ot.toFixed(1)}h` : ''}</div>
    </button>
  );
}

export default function FnBScheduling() {
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [newShift, setNewShift] = useState({ employee_id: '', day_index: 0, start_time: '09:00', end_time: '17:00' });

  // Compute week dates
  const weekStart = useMemo(() => addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7), [weekOffset]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Fetch employees and shifts
  const { data: employees = [], isLoading: loadingEmp } = useQuery({
    queryKey: ['employees', T1_TENANT_ID],
    queryFn: () => base44.entities.Employee.filter({ tenant_id: T1_TENANT_ID, status: 'active' }),
  });

  const { data: shifts = [], isLoading: loadingShifts } = useQuery({
    queryKey: ['shifts', T1_TENANT_ID, weekOffset],
    queryFn: () => base44.entities.Shift.filter({ tenant_id: T1_TENANT_ID }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['shifts', T1_TENANT_ID]); setShowAdd(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['shifts', T1_TENANT_ID]); setSelectedShift(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Shift.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['shifts', T1_TENANT_ID]); setSelectedShift(null); },
  });

  // Filter shifts for current week view
  const weekShifts = useMemo(() => shifts.filter(s => {
    if (!s.date) return false;
    const d = new Date(s.date);
    return weekDays.some(wd => isSameDay(wd, d));
  }), [shifts, weekDays]);

  // Overtime summary stats
  const otShifts = weekShifts.filter(s => calcOvertime(calcHours(s.start_time, s.end_time)) > 0);
  const totalOTHours = otShifts.reduce((acc, s) => acc + calcOvertime(calcHours(s.start_time, s.end_time)), 0);
  const confirmedCount = weekShifts.filter(s => s.status === 'confirmed').length;

  function handleAddShift() {
    const day = weekDays[parseInt(newShift.day_index)];
    const hours = calcHours(newShift.start_time, newShift.end_time);
    const otHours = calcOvertime(hours);
    const emp = employees.find(e => e.id === newShift.employee_id);
    createMutation.mutate({
      tenant_id: T1_TENANT_ID,
      outlet_id: emp?.outlet_id || '',
      employee_id: newShift.employee_id,
      employee_name: emp?.full_name || '',
      date: format(day, 'yyyy-MM-dd'),
      start_time: newShift.start_time,
      end_time: newShift.end_time,
      scheduled_hours: hours,
      overtime_hours: otHours,
      status: 'scheduled',
    });
  }

  const isLoading = loadingEmp || loadingShifts;

  return (
    <AppShell navigation={T1_NAV} tenant={T1_TENANT} title="" headerRight={<TenantSwitcher />}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #6366F1 0%, transparent 50%), radial-gradient(circle at 80% 20%, #2563EB 0%, transparent 40%)' }} />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <span className="text-indigo-300 text-xs font-semibold uppercase tracking-widest">Respond · Shifts</span>
              </div>
              <h1 className="text-2xl font-display font-bold">Shift Scheduling</h1>
              <p className="text-white/60 text-sm mt-1">La Birria Tacos · North Bridge Rd · Workforce Module</p>
            </div>
            <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border-0" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> Add Shift
            </Button>
          </div>

          {/* Stats Strip */}
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Shifts This Week', value: weekShifts.length, icon: Calendar, color: 'text-blue-300' },
              { label: 'Confirmed', value: confirmedCount, icon: UserCheck, color: 'text-emerald-300' },
              { label: 'OT Shifts', value: otShifts.length, icon: AlertTriangle, color: 'text-orange-300' },
              { label: 'Total OT Hours', value: `${totalOTHours.toFixed(1)}h`, icon: Clock, color: 'text-red-300' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-1"><Icon className={`w-3.5 h-3.5 ${color}`} /><span className="text-[10px] text-white/60 uppercase tracking-wider">{label}</span></div>
                <p className="text-xl font-display font-bold text-white">{isLoading ? '–' : value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Week Navigator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setWeekOffset(w => w - 1)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-sm text-foreground">
              {format(weekStart, 'dd MMM')} – {format(weekDays[6], 'dd MMM yyyy')}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => setWeekOffset(0)} className="text-xs text-primary underline underline-offset-2 ml-1">Today</button>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orbitan-green-light border border-green-200 inline-block" /> Confirmed</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orbitan-amber-light border border-amber-200 inline-block" /> Scheduled</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-50 border border-orange-200 inline-block" /> Overtime</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading schedule...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[750px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-36">Staff</th>
                    {weekDays.map(d => (
                      <th key={d.toISOString()} className={`text-center px-2 py-3 text-xs font-semibold uppercase tracking-wide ${isSameDay(d, new Date()) ? 'text-primary' : 'text-muted-foreground'}`}>
                        <div>{format(d, 'EEE')}</div>
                        <div className={`text-[10px] font-normal mt-0.5 ${isSameDay(d, new Date()) ? 'bg-primary text-primary-foreground rounded-full px-1.5' : 'text-muted-foreground/70'}`}>{format(d, 'dd MMM')}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {employees.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No active staff found. Add employees in the Workforce module first.</td></tr>
                  ) : employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground text-xs">{emp.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">{emp.position || emp.role}</p>
                        {emp.pay_type === 'hourly' && <span className="text-[9px] text-orange-500 font-medium">Hourly · OT tracked</span>}
                      </td>
                      {weekDays.map(d => {
                        const dayShifts = weekShifts.filter(s => s.employee_id === emp.id && isSameDay(new Date(s.date), d));
                        return (
                          <td key={d.toISOString()} className="px-1 py-2 text-center align-top min-w-[90px]">
                            {dayShifts.map(sh => (
                              <ShiftChip key={sh.id} shift={sh} onClick={() => setSelectedShift(sh)} />
                            ))}
                            <button
                              onClick={() => { setNewShift({ employee_id: emp.id, day_index: weekDays.indexOf(d), start_time: '09:00', end_time: '17:00' }); setShowAdd(true); }}
                              className="w-full text-[10px] text-muted-foreground/40 hover:text-primary hover:bg-muted/40 rounded py-0.5 transition-colors"
                            >+</button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Overtime Alert */}
        {otShifts.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-800">{otShifts.length} shift{otShifts.length > 1 ? 's' : ''} with overtime this week — {totalOTHours.toFixed(1)} total OT hours</p>
              <p className="text-xs text-orange-600 mt-0.5">Overtime threshold is {OVERTIME_THRESHOLD_HOURS}h/shift. Review scheduling to manage labour costs.</p>
            </div>
          </div>
        )}
      </div>

      {/* Shift Detail Modal */}
      {selectedShift && (() => {
        const emp = employees.find(e => e.id === selectedShift.employee_id);
        const hours = calcHours(selectedShift.start_time, selectedShift.end_time);
        const ot = calcOvertime(hours);
        return (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-lg">Shift Details</h3>
                <button onClick={() => setSelectedShift(null)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2.5 text-sm mb-5">
                {[
                  { label: 'Staff', value: emp?.full_name || selectedShift.employee_name || '—' },
                  { label: 'Date', value: selectedShift.date ? format(new Date(selectedShift.date), 'EEE, dd MMM yyyy') : '—' },
                  { label: 'Time', value: `${selectedShift.start_time} – ${selectedShift.end_time}` },
                  { label: 'Hours', value: `${hours.toFixed(1)}h` },
                  { label: 'Overtime', value: ot > 0 ? <span className="text-orange-600 font-semibold">{ot.toFixed(1)}h OT</span> : <span className="text-emerald-600">None</span> },
                  { label: 'Status', value: <StatusBadge status={selectedShift.status} /> },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                {selectedShift.status === 'scheduled' && (
                  <Button className="flex-1 text-xs gap-1.5" onClick={() => updateMutation.mutate({ id: selectedShift.id, data: { status: 'confirmed' } })} disabled={updateMutation.isPending}>
                    <UserCheck className="w-3.5 h-3.5" /> Confirm
                  </Button>
                )}
                <Button variant="outline" size="sm" className="flex-1 text-xs text-destructive border-destructive/30" onClick={() => deleteMutation.mutate(selectedShift.id)} disabled={deleteMutation.isPending}>
                  Remove
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Shift Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg">Add Shift</h3>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Staff Member</label>
                <select value={newShift.employee_id} onChange={e => setNewShift({ ...newShift, employee_id: e.target.value })}
                  className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">— Select staff —</option>
                  {employees.map(s => <option key={s.id} value={s.id}>{s.full_name} — {s.position || s.role}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Day</label>
                <select value={newShift.day_index} onChange={e => setNewShift({ ...newShift, day_index: e.target.value })}
                  className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                  {weekDays.map((d, i) => <option key={i} value={i}>{format(d, 'EEE · dd MMM')}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Start Time</label>
                  <Input type="time" value={newShift.start_time} onChange={e => setNewShift({ ...newShift, start_time: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">End Time</label>
                  <Input type="time" value={newShift.end_time} onChange={e => setNewShift({ ...newShift, end_time: e.target.value })} className="mt-1" />
                </div>
              </div>
              {/* Overtime Preview */}
              {newShift.start_time && newShift.end_time && (() => {
                const h = calcHours(newShift.start_time, newShift.end_time);
                const ot = calcOvertime(h);
                return (
                  <div className={`rounded-lg p-3 text-xs ${ot > 0 ? 'bg-orange-50 border border-orange-200 text-orange-700' : 'bg-muted text-muted-foreground'}`}>
                    <strong>{h.toFixed(1)}h shift</strong>
                    {ot > 0 ? ` · ⚠ ${ot.toFixed(1)}h overtime will be recorded` : ' · No overtime'}
                  </div>
                );
              })()}
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleAddShift} disabled={createMutation.isPending || !newShift.employee_id}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Add Shift
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}