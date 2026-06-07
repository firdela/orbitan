import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Users, Plus, Search, Home, Package, ShoppingCart, FileText,
  Calendar, CheckSquare, BarChart2, Shield, Layers, Building2,
  Phone, Mail, Briefcase, UserCheck, UserX, Clock
} from 'lucide-react';

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

const ROLE_COLORS = {
  tenant_admin: 'bg-orbitan-purple-light text-orbitan-purple',
  outlet_manager: 'bg-orbitan-blue-light text-orbitan-blue',
  supervisor: 'bg-orbitan-green-light text-orbitan-green',
  worker: 'bg-secondary text-muted-foreground',
};

const AVATAR_COLORS = [
  'orbitan-gradient', 'bg-orbitan-purple', 'bg-orbitan-green', 'bg-orbitan-amber',
];

export default function WorkforcePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [newEmp, setNewEmp] = useState({
    full_name: '', email: '', phone: '', role: 'worker',
    position: '', employment_type: 'full_time',
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['outlet-employees'],
    queryFn: () => base44.entities.Employee.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlet-employees'] });
      setShowAdd(false);
      setNewEmp({ full_name: '', email: '', phone: '', role: 'worker', position: '', employment_type: 'full_time' });
    },
  });

  const filtered = employees.filter(e =>
    !search ||
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.position?.toLowerCase().includes(search.toLowerCase())
  );

  const active = employees.filter(e => e.status === 'active').length;
  const onLeave = employees.filter(e => e.status === 'on_leave').length;

  return (
    <AppShell navigation={NAV} title="">
      <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
        <PageHeader
          title="My Team"
          subtitle={`${employees.length} members · ${active} active`}
          actions={
            <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" />
              Add Member
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Staff" value={employees.length} icon={Users} color="blue" />
          <StatCard title="Active" value={active} icon={UserCheck} color="green" />
          <StatCard title="On Leave" value={onLeave} icon={Clock} color="amber" />
          <StatCard title="Roles" value={new Set(employees.map(e => e.role)).size} icon={Briefcase} color="purple" />
        </div>

        {/* Search */}
        <div className="relative max-w-xs mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search team..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Team grid */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Loading team...</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No team members" description="Add your first team member to get started." action={() => setShowAdd(true)} actionLabel="Add Member" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((emp, i) => (
              <div
                key={emp.id}
                onClick={() => setSelected(emp)}
                className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-primary/20 transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${AVATAR_COLORS[i % 4]}`}>
                    {emp.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading font-semibold text-sm text-foreground truncate">{emp.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{emp.position || 'Staff'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[emp.role] || 'bg-secondary text-muted-foreground'}`}>
                    {emp.role?.replace('_', ' ')}
                  </span>
                  <StatusBadge status={emp.status || 'active'} size="sm" />
                </div>
                {emp.email && (
                  <p className="text-[10px] text-muted-foreground mt-2 truncate flex items-center gap-1">
                    <Mail className="w-2.5 h-2.5" />{emp.email}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Team Member</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full orbitan-gradient flex items-center justify-center text-white text-xl font-bold">
                  {selected.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg">{selected.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{selected.position || 'Staff'}</p>
                  <StatusBadge status={selected.status || 'active'} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selected.email && <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{selected.email}</p></div>}
                {selected.phone && <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium">{selected.phone}</p></div>}
                <div><p className="text-xs text-muted-foreground">Role</p><p className="font-medium capitalize">{selected.role?.replace('_', ' ')}</p></div>
                <div><p className="text-xs text-muted-foreground">Type</p><p className="font-medium capitalize">{selected.employment_type?.replace('_', ' ') || 'Full Time'}</p></div>
                {selected.hire_date && <div><p className="text-xs text-muted-foreground">Hire Date</p><p className="font-medium">{selected.hire_date}</p></div>}
                {selected.pay_rate && <div><p className="text-xs text-muted-foreground">Pay Rate</p><p className="font-medium">S${selected.pay_rate}/{selected.pay_type || 'hr'}</p></div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add member modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1 block">Full Name *</Label>
              <Input value={newEmp.full_name} onChange={e => setNewEmp(p => ({ ...p, full_name: e.target.value }))} placeholder="e.g. Ahmad Rizal" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Email</Label>
                <Input value={newEmp.email} onChange={e => setNewEmp(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Phone</Label>
                <Input value={newEmp.phone} onChange={e => setNewEmp(p => ({ ...p, phone: e.target.value }))} placeholder="+65 9123 4567" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Position</Label>
              <Input value={newEmp.position} onChange={e => setNewEmp(p => ({ ...p, position: e.target.value }))} placeholder="e.g. Kitchen Staff" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Role</Label>
                <Select value={newEmp.role} onValueChange={v => setNewEmp(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker">Worker</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="outlet_manager">Outlet Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Employment Type</Label>
                <Select value={newEmp.employment_type} onValueChange={v => setNewEmp(p => ({ ...p, employment_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ ...newEmp, status: 'active' })}
              disabled={!newEmp.full_name || createMutation.isPending}
            >
              {createMutation.isPending ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}