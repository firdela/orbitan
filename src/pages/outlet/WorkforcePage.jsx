import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/use-tenant';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AccessRequestQueue from '@/components/workforce/AccessRequestQueue';
import InvitationPanel from '@/components/workforce/InvitationPanel';
import PerformanceHeatmap from '@/components/reporting/PerformanceHeatmap';
import {
  Users, Search, Home, Package, ShoppingCart, FileText,
  Calendar, CheckSquare, BarChart2, Shield, Layers, Building2,
  Mail, Briefcase, UserCheck, Clock, UserPlus, UserCog, Activity
} from 'lucide-react';
import { Input } from '@/components/ui/input';



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
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('directory');

  // Tenant-scoped query — prevents cross-tenant data exposure
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['outlet-employees', tenantId],
    queryFn: () => base44.entities.Employee.filter({ tenant_id: tenantId }),
    enabled: !!tenantId,
  });

  // Pending access requests count for the badge
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['access-requests-count', tenantId],
    queryFn: () => base44.entities.AccessRequest.filter({ tenant_id: tenantId, status: 'pending' }),
    enabled: !!tenantId,
  });

  const filtered = employees.filter(e =>
    !search ||
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.position?.toLowerCase().includes(search.toLowerCase())
  );

  const active = employees.filter(e => e.status === 'active').length;
  const onLeave = employees.filter(e => e.status === 'on_leave').length;

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
        <PageHeader
          title="Workforce Control Room"
          subtitle={`${employees.length} members · ${active} active`}
          help={{
            title: 'Workforce Control Room',
            content: 'Your central hub for managing staff, onboarding new team members, and monitoring attendance and performance across this outlet.',
            tips: [
              'Use Invitations to onboard staff — they receive a join link by email.',
              'Access Requests appear when existing users request to join your organisation.',
              'Click any team member card to view their profile and employment details.',
            ],
          }}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Staff" value={employees.length} icon={Users} color="blue" help={{ content: 'Every employee record in this organisation, including active, on-leave, and inactive staff.' }} />
          <StatCard title="Active" value={active} icon={UserCheck} color="green" help={{ content: 'Staff currently available for shifts and tasks. Inactive or terminated employees are excluded.' }} />
          <StatCard title="On Leave" value={onLeave} icon={Clock} color="amber" help={{ content: 'Staff with an "on_leave" status — they cannot be assigned new shifts until their status returns to active.' }} />
          <StatCard title="Pending Requests" value={pendingRequests.length} icon={UserCog} color="purple" help={{ content: 'Users who have requested access to your organisation and are awaiting your approval in the Access Requests tab.' }} />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-5">
            <TabsTrigger value="directory" className="gap-1.5">
              <Users className="w-3.5 h-3.5" /> Directory
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-1.5">
              <UserCog className="w-3.5 h-3.5" />
              Access Requests
              {pendingRequests.length > 0 && (
                <span className="ml-1 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-bold">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="invitations" className="gap-1.5">
              <UserPlus className="w-3.5 h-3.5" /> Invitations
            </TabsTrigger>
            <TabsTrigger value="punctuality" className="gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Punctuality & Performance
            </TabsTrigger>
          </TabsList>

          {/* Directory tab */}
          <TabsContent value="directory">
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

            {isLoading ? (
              <div className="text-center py-16 text-muted-foreground text-sm">Loading team...</div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No team members yet"
                description="Your team directory will appear here once members accept their invitations. Use the Invitations tab to invite your first team member."
                color="slate"
              />
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
          </TabsContent>

          {/* Access Requests tab */}
          <TabsContent value="requests">
            <AccessRequestQueue tenantId={tenantId} />
          </TabsContent>

          {/* Invitations tab */}
          <TabsContent value="invitations">
            <InvitationPanel tenantId={tenantId} />
          </TabsContent>

          {/* Punctuality & Performance tab */}
          <TabsContent value="punctuality">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-heading font-semibold text-sm mb-2">Punctuality & Task Performance</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Tracks employee clock-in punctuality and task completion rates. Performance scores are computed from ClockRecord late minutes and Task completion data.
              </p>
              <PerformanceHeatmap />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Employee detail modal */}
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
    </>
  );
}