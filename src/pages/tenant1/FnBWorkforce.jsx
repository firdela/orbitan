import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import WorkforceInsightsPanel from '@/components/workforce/WorkforceInsightsPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Search, X, UserCircle, Brain, Users, Clock, TrendingUp, Phone, Mail, Calendar, DollarSign, Shield, Loader2 } from 'lucide-react';
import { T1_NAV, T1_TENANT } from '@/lib/tenant-nav';

const T1_TENANT_ID = 'taqueria_pte_ltd';
const T1_OUTLET_ID = 'taqueria_pte_ltd_main';

const ROLE_CONFIG = {
  outlet_manager: { color: 'bg-orbitan-blue-light text-orbitan-blue border border-blue-200', label: 'Outlet Manager', dot: 'bg-orbitan-blue' },
  supervisor:     { color: 'bg-orbitan-purple-light text-orbitan-purple border border-purple-200', label: 'Supervisor', dot: 'bg-orbitan-purple' },
  worker:         { color: 'bg-secondary text-muted-foreground border border-border', label: 'Worker', dot: 'bg-muted-foreground' },
  tenant_admin:   { color: 'bg-amber-50 text-amber-700 border border-amber-200', label: 'Admin', dot: 'bg-amber-500' },
};

const PAY_TYPE_LABEL = { monthly: '/mo', hourly: '/hr', daily: '/day' };

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-500',
  'from-pink-500 to-rose-600',
  'from-cyan-500 to-blue-500',
];

export default function FnBWorkforce() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState('staff');
  const [roleFilter, setRoleFilter] = useState('all');
  const [newStaff, setNewStaff] = useState({ full_name: '', position: '', role: 'worker', employment_type: 'full_time', email: '', phone: '', pay_rate: '', pay_type: 'monthly' });

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['employees', T1_TENANT_ID],
    queryFn: () => base44.entities.Employee.filter({ tenant_id: T1_TENANT_ID }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.create({ ...data, tenant_id: T1_TENANT_ID, outlet_id: T1_OUTLET_ID, status: 'active', hire_date: new Date().toISOString().split('T')[0] }),
    onSuccess: () => { queryClient.invalidateQueries(['employees', T1_TENANT_ID]); setShowAdd(false); setNewStaff({ full_name: '', position: '', role: 'worker', employment_type: 'full_time', email: '', phone: '', pay_rate: '', pay_type: 'monthly' }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: (updated) => { queryClient.invalidateQueries(['employees', T1_TENANT_ID]); setSelected(updated); },
  });

  const filtered = staff.filter(s => {
    const matchSearch = s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.position?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || s.role === roleFilter;
    return matchSearch && matchRole;
  });

  const activeCount = staff.filter(s => s.status === 'active').length;
  const ftCount = staff.filter(s => s.employment_type === 'full_time').length;
  const ptCount = staff.filter(s => s.employment_type === 'part_time').length;
  const totalPayroll = staff.filter(s => s.pay_type === 'monthly').reduce((a, s) => a + (s.pay_rate || 0), 0);

  return (
    <AppShell navigation={T1_NAV} tenant={T1_TENANT} title="" headerRight={<TenantSwitcher />}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #3B82F6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #8B5CF6 0%, transparent 40%)' }} />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="text-blue-300 text-xs font-semibold uppercase tracking-widest">My Team</span>
              </div>
              <h1 className="text-2xl font-display font-bold">La Birria Tacos Workforce</h1>
              <p className="text-white/60 text-sm mt-1">North Bridge Rd · Workforce Module · OrbitanOS</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" className="gap-1.5 bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => setActiveTab(activeTab === 'insights' ? 'staff' : 'insights')}>
                <Brain className="w-4 h-4" />
                {activeTab === 'insights' ? 'Team View' : 'AI Insights'}
              </Button>
              <Button size="sm" className="gap-1.5 bg-blue-500 hover:bg-blue-600 text-white border-0" onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4" /> Add Staff
              </Button>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Active Staff', value: activeCount, icon: Users, color: 'text-blue-300' },
              { label: 'Full-Time', value: ftCount, icon: Shield, color: 'text-emerald-300' },
              { label: 'Part-Time', value: ptCount, icon: Clock, color: 'text-amber-300' },
              { label: 'Monthly Payroll', value: `S$${totalPayroll.toLocaleString()}`, icon: DollarSign, color: 'text-purple-300' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-1"><Icon className={`w-3.5 h-3.5 ${color}`} /><span className="text-[10px] text-white/60 uppercase tracking-wider">{label}</span></div>
                <p className="text-xl font-display font-bold text-white">{value || (isLoading ? '–' : 0)}</p>
              </div>
            ))}
          </div>
        </div>

        {activeTab === 'insights' && <WorkforceInsightsPanel tenantId={T1_TENANT_ID} outletId={T1_OUTLET_ID} />}

        {activeTab === 'staff' && (
          <div className="space-y-5">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name or position..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex gap-2 flex-wrap">
                {['all', 'outlet_manager', 'supervisor', 'worker'].map(r => (
                  <button key={r} onClick={() => setRoleFilter(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${roleFilter === r ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
                    {r === 'all' ? 'All Roles' : r.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Loading team...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 bg-card border border-border rounded-2xl">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="font-semibold text-foreground">No team members found</p>
                <p className="text-sm text-muted-foreground mt-1">Add your first staff member to get started.</p>
                <Button size="sm" className="mt-4 gap-1.5" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Staff</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((emp, idx) => {
                  const role = ROLE_CONFIG[emp.role] || ROLE_CONFIG.worker;
                  const grad = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
                  return (
                    <button key={emp.id} onClick={() => setSelected(emp)}
                      className="bg-card border border-border rounded-2xl p-5 text-left hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 transition-all group">
                      <div className="flex items-start gap-3 mb-4">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-md`}>
                          <span className="text-white font-bold text-sm">{getInitials(emp.full_name)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-heading font-semibold text-foreground truncate group-hover:text-primary transition-colors">{emp.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{emp.position || 'Staff'}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${emp.status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                      </div>

                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${role.color}`}>{role.label}</span>
                        <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full capitalize border border-border">
                          {(emp.employment_type || 'full_time').replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border/60">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{emp.hire_date || '—'}</span>
                        {emp.pay_rate && <span className="text-xs font-semibold text-foreground">S${emp.pay_rate}{PAY_TYPE_LABEL[emp.pay_type] || '/mo'}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Staff Detail Modal */}
        {selected && (() => {
          const role = ROLE_CONFIG[selected.role] || ROLE_CONFIG.worker;
          const grad = AVATAR_GRADIENTS[0];
          return (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                {/* Modal header with gradient */}
                <div className="bg-gradient-to-br from-slate-900 to-blue-950 p-6 text-white relative">
                  <button onClick={() => setSelected(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-lg`}>
                      <span className="text-white font-bold text-xl">{getInitials(selected.full_name)}</span>
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-xl">{selected.full_name}</h3>
                      <p className="text-white/70 text-sm">{selected.position || 'Staff'}</p>
                      <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize bg-white/20 text-white`}>{role.label}</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  {[
                    { icon: Shield, label: 'Status', value: <StatusBadge status={selected.status} /> },
                    { icon: Calendar, label: 'Hire Date', value: selected.hire_date || '—' },
                    { icon: DollarSign, label: 'Pay Rate', value: selected.pay_rate ? `S$${selected.pay_rate}${PAY_TYPE_LABEL[selected.pay_type] || '/mo'}` : '—' },
                    { icon: Mail, label: 'Email', value: selected.email || '—' },
                    { icon: Phone, label: 'Phone', value: selected.phone || '—' },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm"><Icon className="w-3.5 h-3.5" />{label}</div>
                      <span className="text-sm font-medium text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="px-6 pb-6 flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => updateMutation.mutate({ id: selected.id, data: { status: selected.status === 'active' ? 'inactive' : 'active' } })}>
                    {selected.status === 'active' ? 'Deactivate' : 'Reactivate'}
                  </Button>
                  <Button className="flex-1" onClick={() => setSelected(null)}>Close</Button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Add Staff Modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-heading font-bold text-lg">Add Team Member</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">La Birria Tacos · North Bridge Rd</p>
                </div>
                <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-secondary transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div><label className="text-xs font-medium text-muted-foreground">Full Name *</label><Input value={newStaff.full_name} onChange={e => setNewStaff({ ...newStaff, full_name: e.target.value })} className="mt-1" placeholder="e.g. Siti Rahimah" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Position</label><Input value={newStaff.position} onChange={e => setNewStaff({ ...newStaff, position: e.target.value })} className="mt-1" placeholder="e.g. Cook" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-muted-foreground">Role</label>
                    <select value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                      <option value="worker">Worker</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="outlet_manager">Outlet Manager</option>
                    </select>
                  </div>
                  <div><label className="text-xs font-medium text-muted-foreground">Type</label>
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
                  <div><label className="text-xs font-medium text-muted-foreground">Pay Type</label>
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
                <Button className="flex-1 gap-2" onClick={() => createMutation.mutate(newStaff)} disabled={createMutation.isPending || !newStaff.full_name}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Add Staff
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}