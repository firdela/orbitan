import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Recycle, Package, ShoppingCart, CheckSquare, Shield,
  BarChart2, Users, Leaf, Plus, CheckCircle2, Clock,
  Truck, UserCheck, Phone, Mail, MapPin
} from 'lucide-react';

const NAV = [
  { type: 'section', label: 'Sustainability Ops' },
  { href: '/t2/dashboard', icon: Leaf, label: 'Dashboard' },
  { href: '/t2/collections', icon: Recycle, label: 'Collections' },
  { href: '/t2/inventory', icon: Package, label: 'Recovered Materials' },
  { href: '/t2/procurement', icon: ShoppingCart, label: 'Procurement' },
  { type: 'section', label: 'People & Tasks' },
  { href: '/t2/workforce', icon: Users, label: 'Workforce' },
  { href: '/t2/tasks', icon: CheckSquare, label: 'Tasks' },
  { type: 'section', label: 'Governance' },
  { href: '/t2/compliance', icon: Shield, label: 'Compliance' },
  { href: '/t2/reporting', icon: BarChart2, label: 'Reporting' },
];

const DEMO_STAFF = [
  { id: 'e1', full_name: 'Ahmad Fadzli', role: 'supervisor', position: 'Senior Driver', status: 'active', phone: '+65 9123 4567', employment_type: 'full_time', clock_status: 'clocked_in', collections_today: 4 },
  { id: 'e2', full_name: 'Hamka Bin Yusof', role: 'tenant_admin', position: 'Operations Manager', status: 'active', phone: '+65 9234 5678', employment_type: 'full_time', clock_status: 'clocked_in', collections_today: null },
  { id: 'e3', full_name: 'Siti Rahimah', role: 'worker', position: 'Sorter', status: 'active', phone: '+65 9345 6789', employment_type: 'full_time', clock_status: 'clocked_in', collections_today: null },
  { id: 'e4', full_name: 'Benny Tan', role: 'worker', position: 'Driver', status: 'active', phone: '+65 9456 7890', employment_type: 'part_time', clock_status: 'clocked_out', collections_today: 3 },
  { id: 'e5', full_name: 'Nurul Atikah', role: 'worker', position: 'Sorter', status: 'active', phone: '+65 9567 8901', employment_type: 'full_time', clock_status: 'clocked_in', collections_today: null },
  { id: 'e6', full_name: 'Kevin Lim', role: 'worker', position: 'Driver', status: 'on_leave', phone: '+65 9678 9012', employment_type: 'full_time', clock_status: 'absent', collections_today: 0 },
];

const ROLE_LABELS = { tenant_admin: 'Admin', supervisor: 'Supervisor', worker: 'Worker', outlet_manager: 'Manager' };

const STATUS_MAP = {
  clocked_in:  { label: 'On Duty',     bg: 'bg-[#F0FDF4]', color: 'text-[#16A34A]' },
  clocked_out: { label: 'Off Duty',    bg: 'bg-muted',      color: 'text-muted-foreground' },
  absent:      { label: 'Absent',      bg: 'bg-amber-50',   color: 'text-amber-700' },
  on_break:    { label: 'On Break',    bg: 'bg-blue-50',    color: 'text-blue-700' },
};

const EMP_STATUS_MAP = {
  active:    { label: 'Active',    color: 'text-[#16A34A]', bg: 'bg-[#F0FDF4] border-green-200' },
  on_leave:  { label: 'On Leave',  color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  inactive:  { label: 'Inactive',  color: 'text-muted-foreground', bg: 'bg-muted border-border' },
};

export default function T2Workforce() {
  const [activeTab, setActiveTab] = useState('team');

  const onDuty = DEMO_STAFF.filter(e => e.clock_status === 'clocked_in').length;

  return (
    <AppShell navigation={NAV} title="Workforce — Renewed Resources">
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Workforce"
          subtitle="Renewed Resources Pte Ltd · Driver & staff management"
          actions={
            <Button size="sm" className="gap-2" style={{ background: '#16A34A' }}>
              <Plus className="w-3.5 h-3.5" /> Add Staff
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Staff', value: DEMO_STAFF.length, color: 'text-foreground', bg: 'bg-card border-border' },
            { label: 'On Duty Now', value: onDuty, color: 'text-[#16A34A]', bg: 'bg-[#F0FDF4] border-green-200' },
            { label: 'On Leave', value: DEMO_STAFF.filter(e => e.status === 'on_leave').length, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
            { label: 'Collections Today', value: DEMO_STAFF.reduce((s, e) => s + (e.collections_today || 0), 0), color: 'text-primary', bg: 'bg-orbitan-blue-light border-blue-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
              <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 w-full sm:w-auto">
          {[{ id: 'team', label: 'Team' }, { id: 'attendance', label: "Today's Attendance" }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-none text-sm font-medium px-5 py-2 rounded-lg transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'team' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEMO_STAFF.map(emp => {
              const es = EMP_STATUS_MAP[emp.status] || EMP_STATUS_MAP.active;
              return (
                <div key={emp.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: '#16A34A' }}>
                    {emp.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{emp.full_name}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${es.bg} ${es.color}`}>{es.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{emp.position} · {ROLE_LABELS[emp.role]}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{emp.phone}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {DEMO_STAFF.map(emp => {
                const cs = STATUS_MAP[emp.clock_status] || STATUS_MAP.clocked_out;
                return (
                  <div key={emp.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: '#16A34A' }}>
                        {emp.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.position}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {emp.collections_today !== null && (
                        <span className="text-xs text-muted-foreground hidden sm:block">{emp.collections_today} collections</span>
                      )}
                      <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${cs.bg} ${cs.color}`}>{cs.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}