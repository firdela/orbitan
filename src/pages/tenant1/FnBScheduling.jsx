import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Package, ShoppingCart, FileText, Users, CheckSquare,
  Shield, BarChart2, Link2, Calendar, Plus, Clock,
  ChevronLeft, ChevronRight, Utensils, UserCheck, X
} from 'lucide-react';

const NAV = [
  { type: 'section', label: 'F&B Operations' },
  { href: '/t1/dashboard', icon: Utensils, label: 'Dashboard' },
  { href: '/t1/inventory', icon: Package, label: 'Inventory' },
  { href: '/t1/procurement', icon: ShoppingCart, label: 'Procurement' },
  { href: '/t1/sales', icon: FileText, label: 'Sales & Invoicing' },
  { href: '/t1/scheduling', icon: Calendar, label: 'Scheduling' },
  { type: 'section', label: 'People & Tasks' },
  { href: '/t1/workforce', icon: Users, label: 'Workforce' },
  { href: '/t1/tasks', icon: CheckSquare, label: 'Tasks' },
  { type: 'section', label: 'Governance' },
  { href: '/t1/compliance', icon: Shield, label: 'Compliance' },
  { href: '/t1/reporting', icon: BarChart2, label: 'Reporting' },
  { href: '/t1/xero', icon: Link2, label: 'Xero Integration' },
  { type: 'section', label: 'Platform' },
  { href: '/leader-org', icon: BarChart2, label: '← Platform Console' },
];

const STAFF = [
  { id: 'e1', name: 'Ahmad Fauzi', role: 'Outlet Manager' },
  { id: 'e2', name: 'Sarah Lim', role: 'Senior Cook' },
  { id: 'e3', name: 'Ravi Kumar', role: 'Cook' },
  { id: 'e4', name: 'Nurul Ain', role: 'Cashier' },
  { id: 'e5', name: 'James Tan', role: 'Service Crew' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DATES = ['02 Jun', '03 Jun', '04 Jun', '05 Jun', '06 Jun', '07 Jun', '08 Jun'];

const INIT_SHIFTS = [
  { id: 'sh1', employee_id: 'e1', day: 0, start_time: '09:00', end_time: '17:00', status: 'confirmed' },
  { id: 'sh2', employee_id: 'e2', day: 0, start_time: '10:00', end_time: '18:00', status: 'confirmed' },
  { id: 'sh3', employee_id: 'e3', day: 0, start_time: '11:00', end_time: '19:00', status: 'scheduled' },
  { id: 'sh4', employee_id: 'e4', day: 1, start_time: '10:00', end_time: '18:00', status: 'confirmed' },
  { id: 'sh5', employee_id: 'e5', day: 1, start_time: '11:00', end_time: '19:00', status: 'scheduled' },
  { id: 'sh6', employee_id: 'e1', day: 2, start_time: '09:00', end_time: '17:00', status: 'confirmed' },
  { id: 'sh7', employee_id: 'e2', day: 2, start_time: '10:00', end_time: '18:00', status: 'confirmed' },
  { id: 'sh8', employee_id: 'e3', day: 3, start_time: '11:00', end_time: '21:00', status: 'scheduled' },
  { id: 'sh9', employee_id: 'e4', day: 4, start_time: '12:00', end_time: '20:00', status: 'confirmed' },
  { id: 'sh10', employee_id: 'e5', day: 5, start_time: '10:00', end_time: '22:00', status: 'confirmed' },
  { id: 'sh11', employee_id: 'e1', day: 5, start_time: '10:00', end_time: '22:00', status: 'confirmed' },
  { id: 'sh12', employee_id: 'e2', day: 6, start_time: '09:00', end_time: '15:00', status: 'scheduled' },
];

export default function FnBScheduling() {
  const [shifts, setShifts] = useState(INIT_SHIFTS);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [newShift, setNewShift] = useState({ employee_id: 'e1', day: 0, start_time: '09:00', end_time: '17:00' });

  const staffShiftsThisWeek = shifts.length;
  const confirmedShifts = shifts.filter(s => s.status === 'confirmed').length;
  const unconfirmedShifts = shifts.filter(s => s.status === 'scheduled').length;

  function addShift() {
    const emp = STAFF.find(s => s.id === newShift.employee_id);
    setShifts(prev => [...prev, {
      id: `sh${Date.now()}`,
      ...newShift,
      day: parseInt(newShift.day),
      status: 'scheduled',
    }]);
    setShowAdd(false);
  }

  function deleteShift(id) {
    setShifts(prev => prev.filter(s => s.id !== id));
    setSelectedShift(null);
  }

  function confirmShift(id) {
    setShifts(prev => prev.map(s => s.id === id ? { ...s, status: 'confirmed' } : s));
    setSelectedShift(null);
  }

  return (
    <AppShell navigation={NAV} title="Scheduling — La Birria Tacos">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Shift Scheduling"
          subtitle="La Birria Tacos · North Bridge Rd · Workforce Module"
          actions={
            <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> Add Shift
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-foreground">{staffShiftsThisWeek}</p>
            <p className="text-xs text-muted-foreground">Shifts This Week</p>
          </div>
          <div className="bg-orbitan-green-light border border-green-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-orbitan-green">{confirmedShifts}</p>
            <p className="text-xs text-muted-foreground">Confirmed</p>
          </div>
          <div className="bg-orbitan-amber-light border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-orbitan-amber">{unconfirmedShifts}</p>
            <p className="text-xs text-muted-foreground">Unconfirmed</p>
          </div>
        </div>

        {/* Weekly Grid */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-36">Staff</th>
                  {DAYS.map((d, i) => (
                    <th key={d} className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <div>{d}</div>
                      <div className="text-[10px] font-normal text-muted-foreground/70">{DATES[i]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {STAFF.map(emp => (
                  <tr key={emp.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground text-xs">{emp.name}</p>
                      <p className="text-[10px] text-muted-foreground">{emp.role}</p>
                    </td>
                    {DAYS.map((_, dayIdx) => {
                      const dayShifts = shifts.filter(s => s.employee_id === emp.id && s.day === dayIdx);
                      return (
                        <td key={dayIdx} className="px-1 py-2 text-center align-top">
                          {dayShifts.map(sh => (
                            <button
                              key={sh.id}
                              onClick={() => setSelectedShift(sh)}
                              className={`w-full text-[10px] font-medium px-1.5 py-1 rounded-lg mb-0.5 text-left transition-all hover:opacity-80 ${
                                sh.status === 'confirmed'
                                  ? 'bg-orbitan-green-light text-orbitan-green border border-green-200'
                                  : 'bg-orbitan-amber-light text-orbitan-amber border border-amber-200'
                              }`}
                            >
                              {sh.start_time}–{sh.end_time}
                            </button>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orbitan-green-light border border-green-200 inline-block" /> Confirmed</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orbitan-amber-light border border-amber-200 inline-block" /> Scheduled (unconfirmed)</span>
        </div>
      </div>

      {/* Shift Detail Modal */}
      {selectedShift && (() => {
        const emp = STAFF.find(s => s.id === selectedShift.employee_id);
        return (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-lg">Shift Details</h3>
                <button onClick={() => setSelectedShift(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-2 text-sm mb-5">
                <div className="flex justify-between"><span className="text-muted-foreground">Staff</span><span className="font-medium">{emp?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Role</span><span>{emp?.role}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Day</span><span>{DAYS[selectedShift.day]} · {DATES[selectedShift.day]}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium">{selectedShift.start_time} – {selectedShift.end_time}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={selectedShift.status} /></div>
              </div>
              <div className="flex gap-2">
                {selectedShift.status === 'scheduled' && (
                  <Button className="flex-1 text-xs gap-1.5" onClick={() => confirmShift(selectedShift.id)}>
                    <UserCheck className="w-3.5 h-3.5" /> Confirm Shift
                  </Button>
                )}
                <Button variant="outline" className="flex-1 text-xs text-orbitan-red border-orbitan-red" onClick={() => deleteShift(selectedShift.id)}>
                  Remove
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Shift Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg">Add Shift</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Staff Member</label>
                <select
                  value={newShift.employee_id}
                  onChange={e => setNewShift({ ...newShift, employee_id: e.target.value })}
                  className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {STAFF.map(s => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Day</label>
                <select
                  value={newShift.day}
                  onChange={e => setNewShift({ ...newShift, day: e.target.value })}
                  className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {DAYS.map((d, i) => <option key={i} value={i}>{d} · {DATES[i]}</option>)}
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
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addShift}>Add Shift</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}