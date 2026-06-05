import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import WorkforceInsightsPanel from '@/components/workforce/WorkforceInsightsPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, X, UserCircle, Brain } from 'lucide-react';
import { T1_NAV, T1_TENANT } from '@/lib/tenant-nav';

// Demo tenant/outlet IDs — replace with real IDs from the Tenant entity
const T1_TENANT_ID = 'taqueria-pte-ltd';
const T1_OUTLET_ID = 'la-birria-northbridge';

const ROLE_COLORS = {
  outlet_manager: 'bg-orbitan-blue-light text-orbitan-blue',
  supervisor: 'bg-orbitan-purple-light text-orbitan-purple',
  worker: 'bg-secondary text-muted-foreground',
};

const INIT_STAFF = [
  { id: 'e1', full_name: 'Ahmad Fauzi', position: 'Outlet Manager', role: 'outlet_manager', employment_type: 'full_time', status: 'active', email: 'ahmad@taqueria.sg', phone: '+65 9101 2345', hire_date: '2024-01-15', pay_rate: 3800, pay_type: 'monthly' },
  { id: 'e2', full_name: 'Sarah Lim', position: 'Senior Cook', role: 'supervisor', employment_type: 'full_time', status: 'active', email: 'sarah@taqueria.sg', phone: '+65 9202 3456', hire_date: '2024-03-01', pay_rate: 2800, pay_type: 'monthly' },
  { id: 'e3', full_name: 'Ravi Kumar', position: 'Cook', role: 'worker', employment_type: 'full_time', status: 'active', email: 'ravi@taqueria.sg', phone: '+65 9303 4567', hire_date: '2024-06-10', pay_rate: 2200, pay_type: 'monthly' },
  { id: 'e4', full_name: 'Nurul Ain', position: 'Cashier', role: 'worker', employment_type: 'part_time', status: 'active', email: 'nurul@taqueria.sg', phone: '+65 9404 5678', hire_date: '2025-01-20', pay_rate: 10.5, pay_type: 'hourly' },
  { id: 'e5', full_name: 'James Tan', position: 'Service Crew', role: 'worker', employment_type: 'part_time', status: 'active', email: 'james@taqueria.sg', phone: '+65 9505 6789', hire_date: '2025-03-05', pay_rate: 9.5, pay_type: 'hourly' },
];

export default function FnBWorkforce() {
  const [staff, setStaff] = useState(INIT_STAFF);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'insights'
  const [newStaff, setNewStaff] = useState({ full_name: '', position: '', role: 'worker', employment_type: 'full_time', email: '', phone: '', pay_rate: '', pay_type: 'monthly' });

  const filtered = staff.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.position.toLowerCase().includes(search.toLowerCase())
  );

  function addStaff() {
    if (!newStaff.full_name) return;
    setStaff(prev => [...prev, { ...newStaff, id: `e${Date.now()}`, status: 'active', hire_date: new Date().toISOString().split('T')[0] }]);
    setShowAdd(false);
    setNewStaff({ full_name: '', position: '', role: 'worker', employment_type: 'full_time', email: '', phone: '', pay_rate: '', pay_type: 'monthly' });
  }

  function toggleStatus(id) {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s));
    setSelected(prev => prev ? { ...prev, status: prev.status === 'active' ? 'inactive' : 'active' } : prev);
  }

  return (
    <AppShell navigation={T1_NAV} tenant={T1_TENANT} title="" headerRight={<TenantSwitcher />}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Workforce Management"
          subtitle="La Birria Tacos · North Bridge Rd · Workforce Module"
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setActiveTab(activeTab === 'insights' ? 'staff' : 'insights')}>
                <Brain className="w-4 h-4 text-orbitan-purple" />
                {activeTab === 'insights' ? 'Staff List' : 'AI Insights'}
              </Button>
              {activeTab === 'staff' && (
                <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
                  <Plus className="w-4 h-4" /> Add Staff
                </Button>
              )}
            </div>
          }
        />

        {/* AI Workforce Insights Panel */}
        {activeTab === 'insights' && (
          <WorkforceInsightsPanel tenantId={T1_TENANT_ID} outletId={T1_OUTLET_ID} />
        )}

        {activeTab === 'staff' && (
        <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-foreground">{staff.filter(s => s.status === 'active').length}</p>
            <p className="text-xs text-muted-foreground">Active Staff</p>
          </div>
          <div className="bg-orbitan-blue-light border border-blue-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-orbitan-blue">{staff.filter(s => s.employment_type === 'full_time').length}</p>
            <p className="text-xs text-muted-foreground">Full-Time</p>
          </div>
          <div className="bg-orbitan-purple-light border border-purple-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-orbitan-purple">{staff.filter(s => s.employment_type === 'part_time').length}</p>
            <p className="text-xs text-muted-foreground">Part-Time</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search staff..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Staff Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(emp => (
            <button
              key={emp.id}
              onClick={() => setSelected(emp)}
              className="bg-card border border-border rounded-xl p-5 text-left hover:shadow-md hover:border-primary/30 transition-all group"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-orbitan-blue-light rounded-xl flex items-center justify-center flex-shrink-0">
                  <UserCircle className="w-6 h-6 text-orbitan-blue" />
                </div>
                <div className="min-w-0">
                  <p className="font-heading font-semibold text-foreground truncate group-hover:text-primary transition-colors">{emp.full_name}</p>
                  <p className="text-xs text-muted-foreground">{emp.position}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[emp.role] || 'bg-secondary text-muted-foreground'}`}>
                  {emp.role.replace('_', ' ')}
                </span>
                <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full capitalize">
                  {emp.employment_type.replace('_', ' ')}
                </span>
                <StatusBadge status={emp.status} size="sm" />
              </div>
            </button>
          ))}
        </div>
      </div>

      </div>
      )}

      {/* Staff Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orbitan-blue-light rounded-2xl flex items-center justify-center">
                  <UserCircle className="w-7 h-7 text-orbitan-blue" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg">{selected.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{selected.position}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-2 text-sm mb-5">
              <div className="flex justify-between"><span className="text-muted-foreground">Employment</span><span className="capitalize">{selected.employment_type.replace('_', ' ')}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Role</span><span className="capitalize">{selected.role.replace('_', ' ')}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={selected.status} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Hire Date</span><span>{selected.hire_date}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Pay Rate</span><span className="font-semibold">S${selected.pay_rate} / {selected.pay_type}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="text-orbitan-blue">{selected.email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{selected.phone}</span></div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => toggleStatus(selected.id)}
              >
                {selected.status === 'active' ? 'Deactivate' : 'Reactivate'}
              </Button>
              <Button className="flex-1 text-xs" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg">Add Staff Member</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground">Full Name</label><Input value={newStaff.full_name} onChange={e => setNewStaff({ ...newStaff, full_name: e.target.value })} className="mt-1" placeholder="e.g. Siti Rahimah" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Position</label><Input value={newStaff.position} onChange={e => setNewStaff({ ...newStaff, position: e.target.value })} className="mt-1" placeholder="e.g. Cook" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Role</label>
                  <select value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="worker">Worker</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="outlet_manager">Outlet Manager</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <select value={newStaff.employment_type} onChange={e => setNewStaff({ ...newStaff, employment_type: e.target.value })} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="full_time">Full-Time</option>
                    <option value="part_time">Part-Time</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Email</label><Input value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} className="mt-1" placeholder="email@taqueria.sg" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Phone</label><Input value={newStaff.phone} onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })} className="mt-1" placeholder="+65 9xxx xxxx" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground">Pay Rate (S$)</label><Input type="number" value={newStaff.pay_rate} onChange={e => setNewStaff({ ...newStaff, pay_rate: e.target.value })} className="mt-1" /></div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Pay Type</label>
                  <select value={newStaff.pay_type} onChange={e => setNewStaff({ ...newStaff, pay_type: e.target.value })} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="monthly">Monthly</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addStaff}>Add Staff</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}