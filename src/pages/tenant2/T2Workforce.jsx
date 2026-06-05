import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Button } from '@/components/ui/button';
import { Plus, Phone, Mail, Truck, CheckCircle2, Clock, X, UserPlus } from 'lucide-react';
import { T2_NAV, T2_TENANT } from '@/lib/tenant-nav';

const DEMO_STAFF = [
  { id: 'e1', full_name: 'Ahmad Fadzli', role: 'supervisor', position: 'Senior Driver', dept: 'Logistics', status: 'active', phone: '+65 9123 4567', email: 'ahmad@renewedresources.sg', employment_type: 'full_time', hire_date: '2022-03-01', pay_rate: 18, pay_type: 'hourly', clock_status: 'clocked_in', clock_in_time: '07:45', collections_today: 4, collections_month: 62 },
  { id: 'e2', full_name: 'Hamka Bin Yusof', role: 'tenant_admin', position: 'Operations Manager', dept: 'Management', status: 'active', phone: '+65 9234 5678', email: 'hamka@renewedresources.sg', employment_type: 'full_time', hire_date: '2021-06-15', pay_rate: 4800, pay_type: 'monthly', clock_status: 'clocked_in', clock_in_time: '08:00', collections_today: null, collections_month: null },
  { id: 'e3', full_name: 'Siti Rahimah', role: 'worker', position: 'Facility Sorter', dept: 'Processing', status: 'active', phone: '+65 9345 6789', email: 'siti@renewedresources.sg', employment_type: 'full_time', hire_date: '2023-01-10', pay_rate: 14, pay_type: 'hourly', clock_status: 'clocked_in', clock_in_time: '08:15', collections_today: null, collections_month: null },
  { id: 'e4', full_name: 'Benny Tan', role: 'worker', position: 'Driver', dept: 'Logistics', status: 'active', phone: '+65 9456 7890', email: 'benny@renewedresources.sg', employment_type: 'part_time', hire_date: '2023-09-05', pay_rate: 16, pay_type: 'hourly', clock_status: 'clocked_out', clock_in_time: '—', collections_today: 3, collections_month: 44 },
  { id: 'e5', full_name: 'Nurul Atikah', role: 'worker', position: 'Facility Sorter', dept: 'Processing', status: 'active', phone: '+65 9567 8901', email: 'nurul@renewedresources.sg', employment_type: 'full_time', hire_date: '2023-11-20', pay_rate: 14, pay_type: 'hourly', clock_status: 'clocked_in', clock_in_time: '08:30', collections_today: null, collections_month: null },
  { id: 'e6', full_name: 'Kevin Lim', role: 'worker', position: 'Driver', dept: 'Logistics', status: 'on_leave', phone: '+65 9678 9012', email: 'kevin@renewedresources.sg', employment_type: 'full_time', hire_date: '2022-07-18', pay_rate: 16, pay_type: 'hourly', clock_status: 'absent', clock_in_time: '—', collections_today: 0, collections_month: 28 },
];

const ROLE_LABELS = { tenant_admin: 'Admin', supervisor: 'Supervisor', worker: 'Worker', outlet_manager: 'Manager' };
const DEPT_COLORS = { Logistics: 'bg-blue-50 text-blue-700', Processing: 'bg-green-50 text-green-700', Management: 'bg-purple-50 text-purple-700' };
const CLOCK_MAP = {
  clocked_in:  { label: 'On Duty',  bg: 'bg-[#F0FDF4]', color: 'text-[#16A34A]', dot: 'bg-[#16A34A]' },
  clocked_out: { label: 'Off Duty', bg: 'bg-muted',      color: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  absent:      { label: 'Absent',   bg: 'bg-amber-50',   color: 'text-amber-700', dot: 'bg-amber-500' },
  on_break:    { label: 'On Break', bg: 'bg-blue-50',    color: 'text-blue-700', dot: 'bg-blue-500' },
};
const EMP_STATUS_MAP = {
  active:   { label: 'Active',   color: 'text-[#16A34A]', bg: 'bg-[#F0FDF4] border-green-200' },
  on_leave: { label: 'On Leave', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  inactive: { label: 'Inactive', color: 'text-muted-foreground', bg: 'bg-muted border-border' },
};

export default function T2Workforce() {
  const [activeTab, setActiveTab] = useState('team');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const onDuty = DEMO_STAFF.filter(e => e.clock_status === 'clocked_in').length;
  const drivers = DEMO_STAFF.filter(e => e.dept === 'Logistics');
  const totalCollections = DEMO_STAFF.reduce((s, e) => s + (e.collections_today || 0), 0);

  return (
    <AppShell navigation={T2_NAV} tenant={T2_TENANT} title="" headerRight={<TenantSwitcher />}>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Workforce"
          subtitle="Renewed Resources Pte Ltd · Driver & facility staff management"
          actions={
            <Button size="sm" className="gap-2" style={{ background: '#16A34A' }} onClick={() => setShowAdd(true)}>
              <UserPlus className="w-3.5 h-3.5" /> Add Staff
            </Button>
          }
        />

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Staff', value: DEMO_STAFF.length, color: 'text-foreground', bg: 'bg-card border-border' },
            { label: 'On Duty Now', value: onDuty, color: 'text-[#16A34A]', bg: 'bg-[#F0FDF4] border-green-200' },
            { label: 'On Leave', value: DEMO_STAFF.filter(e => e.status === 'on_leave').length, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
            { label: 'Collections Today', value: totalCollections, color: 'text-primary', bg: 'bg-orbitan-blue-light border-blue-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
              <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Live Duty Banner */}
        <div className="bg-[#F0FDF4] border border-green-200 rounded-xl px-5 py-3.5 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
          <p className="text-sm font-medium text-[#16A34A]">{onDuty} of {DEMO_STAFF.length} staff currently on duty · {drivers.filter(d => d.clock_status === 'clocked_in').length} drivers active in the field</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 w-full sm:w-auto">
          {[{ id: 'team', label: 'Team Directory' }, { id: 'attendance', label: "Today's Attendance" }, { id: 'drivers', label: 'Driver Activity' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-none text-sm font-medium px-4 py-2 rounded-lg transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'team' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEMO_STAFF.map(emp => {
              const es = EMP_STATUS_MAP[emp.status] || EMP_STATUS_MAP.active;
              const cs = CLOCK_MAP[emp.clock_status] || CLOCK_MAP.clocked_out;
              return (
                <div key={emp.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setSelectedEmp(emp)}>
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: '#16A34A' }}>
                      {emp.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${cs.dot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{emp.full_name}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${es.bg} ${es.color}`}>{es.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{emp.position} · {ROLE_LABELS[emp.role]}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${DEPT_COLORS[emp.dept] || 'bg-muted text-muted-foreground'}`}>{emp.dept}</span>
                      <span className="text-xs text-muted-foreground capitalize">{emp.employment_type.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Phone className="w-3 h-3" />{emp.phone}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Today — 5 June 2026</p>
              <p className="text-xs text-muted-foreground">{onDuty}/{DEMO_STAFF.length} present</p>
            </div>
            <div className="divide-y divide-border">
              {DEMO_STAFF.map(emp => {
                const cs = CLOCK_MAP[emp.clock_status] || CLOCK_MAP.clocked_out;
                return (
                  <div key={emp.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: '#16A34A' }}>
                          {emp.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${cs.dot}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.position} · Clock-in: {emp.clock_in_time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {emp.collections_today !== null && (
                        <span className="text-xs text-muted-foreground hidden sm:block">{emp.collections_today} collections</span>
                      )}
                      <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${cs.bg} ${cs.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cs.dot}`} />
                        {cs.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'drivers' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Active driver performance for today's collection runs.</p>
            {drivers.map(d => {
              const cs = CLOCK_MAP[d.clock_status] || CLOCK_MAP.clocked_out;
              const monthlyTarget = 60;
              const pct = d.collections_month ? Math.min(100, Math.round((d.collections_month / monthlyTarget) * 100)) : 0;
              return (
                <div key={d.id} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: '#16A34A' }}>
                        {d.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{d.full_name}</p>
                        <p className="text-xs text-muted-foreground">{d.position}</p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${cs.bg} ${cs.color}`}>{cs.label}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-foreground">{d.collections_today}</p>
                      <p className="text-[10px] text-muted-foreground">Today</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-foreground">{d.collections_month || 0}</p>
                      <p className="text-[10px] text-muted-foreground">This Month</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-[#16A34A]">{pct}%</p>
                      <p className="text-[10px] text-muted-foreground">vs Target</p>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-[#16A34A] transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Employee Detail Panel */}
      {selectedEmp && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelectedEmp(null)}>
          <div className="bg-white w-full max-w-sm h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <p className="font-heading font-semibold">Employee Profile</p>
              <button onClick={() => setSelectedEmp(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white" style={{ background: '#16A34A' }}>
                  {selectedEmp.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedEmp.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedEmp.position}</p>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[selectedEmp.role]} · {selectedEmp.dept}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4" />{selectedEmp.phone}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" />{selectedEmp.email}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Employment', value: selectedEmp.employment_type.replace('_', ' ') },
                  { label: 'Hire Date', value: selectedEmp.hire_date },
                  { label: 'Pay Rate', value: `S$${selectedEmp.pay_rate}/${selectedEmp.pay_type === 'hourly' ? 'hr' : 'mth'}` },
                  { label: 'Collections (MTD)', value: selectedEmp.collections_month ?? '—' },
                ].map(f => (
                  <div key={f.label} className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">{f.label}</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5 capitalize">{f.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">Edit Profile</Button>
                <Button size="sm" className="flex-1" style={{ background: '#16A34A' }}>Assign Task</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <p className="font-heading font-semibold">Add New Staff Member</p>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: 'Full Name', type: 'text', placeholder: 'e.g. Ahmad Razif' },
                { label: 'Position', type: 'text', placeholder: 'e.g. Driver' },
                { label: 'Phone', type: 'tel', placeholder: '+65 9XXX XXXX' },
                { label: 'Email', type: 'email', placeholder: 'email@renewedresources.sg' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-medium text-foreground mb-1">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button className="flex-1" style={{ background: '#16A34A' }} onClick={() => setShowAdd(false)}>Add Staff</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}