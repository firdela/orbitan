import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import {
  ShoppingBag, Package, FileText, Users, CheckSquare,
  BarChart2, Heart, Shirt, Plus, Phone
} from 'lucide-react';

const NAV = [
  { type: 'section', label: 'Retail Ops' },
  { href: '/t3/dashboard', icon: ShoppingBag, label: 'Dashboard' },
  { href: '/t3/catalog', icon: Shirt, label: 'Product Catalog' },
  { href: '/t3/inventory', icon: Package, label: 'Inventory' },
  { href: '/t3/sales', icon: FileText, label: 'Sales & POS' },
  { href: '/t3/customers', icon: Heart, label: 'Customers' },
  { type: 'section', label: 'People & Tasks' },
  { href: '/t3/workforce', icon: Users, label: 'Workforce' },
  { href: '/t3/tasks', icon: CheckSquare, label: 'Tasks' },
  { type: 'section', label: 'Intelligence' },
  { href: '/t3/reporting', icon: BarChart2, label: 'Reporting' },
];

const DEMO_STAFF = [
  { id: 'e1', full_name: 'Zara Lim', role: 'outlet_manager', position: 'Store Manager', status: 'active', phone: '+65 9100 1111', employment_type: 'full_time', clock_status: 'clocked_in', sales_today: 5 },
  { id: 'e2', full_name: 'Tommy Chen', role: 'worker', position: 'Sales Associate', status: 'active', phone: '+65 9200 2222', employment_type: 'full_time', clock_status: 'clocked_in', sales_today: 3 },
  { id: 'e3', full_name: 'Aisha Binte Jamal', role: 'worker', position: 'Sorter / Grader', status: 'active', phone: '+65 9300 3333', employment_type: 'part_time', clock_status: 'clocked_in', sales_today: null },
  { id: 'e4', full_name: 'Ravi Subramaniam', role: 'worker', position: 'Sales Associate', status: 'active', phone: '+65 9400 4444', employment_type: 'part_time', clock_status: 'clocked_out', sales_today: 0 },
  { id: 'e5', full_name: 'Clara Wong', role: 'supervisor', position: 'Senior Associate', status: 'on_leave', phone: '+65 9500 5555', employment_type: 'full_time', clock_status: 'absent', sales_today: 0 },
];

const CLOCK_MAP = {
  clocked_in:  { label: 'On Duty',  bg: 'bg-[#F0FDF4]', color: 'text-[#22C55E]' },
  clocked_out: { label: 'Off Duty', bg: 'bg-muted',      color: 'text-muted-foreground' },
  absent:      { label: 'Absent',   bg: 'bg-amber-50',   color: 'text-amber-700' },
};

const EMP_STATUS = {
  active:   { label: 'Active',   color: 'text-[#22C55E]', bg: 'bg-[#F0FDF4] border-green-200' },
  on_leave: { label: 'On Leave', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  inactive: { label: 'Inactive', color: 'text-muted-foreground', bg: 'bg-muted border-border' },
};

const ROLE_LABELS = { outlet_manager: 'Manager', supervisor: 'Supervisor', worker: 'Associate', tenant_admin: 'Admin' };

export default function T3Workforce() {
  const [tab, setTab] = useState('team');
  const onDuty = DEMO_STAFF.filter(e => e.clock_status === 'clocked_in').length;

  return (
    <AppShell navigation={NAV} title="Workforce — Retail Ops">
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Workforce"
          subtitle="Retail Operations · Staff management"
          actions={
            <Button size="sm" className="gap-2" style={{ background: '#22C55E' }}>
              <Plus className="w-3.5 h-3.5" /> Add Staff
            </Button>
          }
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Staff', value: DEMO_STAFF.length, color: 'text-foreground', bg: 'bg-card border-border' },
            { label: 'On Duty', value: onDuty, color: 'text-[#22C55E]', bg: 'bg-[#F0FDF4] border-green-200' },
            { label: 'On Leave', value: DEMO_STAFF.filter(e => e.status === 'on_leave').length, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
            { label: 'Sales Today', value: DEMO_STAFF.reduce((s, e) => s + (e.sales_today || 0), 0), color: 'text-primary', bg: 'bg-orbitan-blue-light border-blue-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
              <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
          {[{ id: 'team', label: 'Team' }, { id: 'attendance', label: "Today's Attendance" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`text-sm font-medium px-5 py-2 rounded-lg transition-all ${tab === t.id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'team' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEMO_STAFF.map(emp => {
              const es = EMP_STATUS[emp.status] || EMP_STATUS.active;
              return (
                <div key={emp.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: '#22C55E' }}>
                    {emp.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{emp.full_name}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${es.bg} ${es.color}`}>{es.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{emp.position} · {ROLE_LABELS[emp.role]}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Phone className="w-3 h-3" />{emp.phone}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'attendance' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {DEMO_STAFF.map(emp => {
                const cs = CLOCK_MAP[emp.clock_status] || CLOCK_MAP.clocked_out;
                return (
                  <div key={emp.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: '#22C55E' }}>
                        {emp.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.position}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {emp.sales_today !== null && <span className="text-xs text-muted-foreground hidden sm:block">{emp.sales_today} sales</span>}
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