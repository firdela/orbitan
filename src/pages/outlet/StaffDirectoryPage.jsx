import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/use-tenant';
import useModuleAccess from '@/lib/hooks/useModuleAccess';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import EmployeeDirectory from '@/components/workforce/EmployeeDirectory';
import EmployeeFilters from '@/components/workforce/EmployeeFilters';
import EmployeeProfileDialog from '@/components/workforce/EmployeeProfileDialog';
import { Users, UserCheck, Clock, UserCog } from 'lucide-react';

export default function StaffDirectoryPage() {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [outletFilter, setOutletFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { can, user } = useModuleAccess('workforce');
  const canEdit = can('update');

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['staff-directory', tenantId],
    queryFn: () => base44.entities.Employee.filter({ tenant_id: tenantId }, '-created_date', 200),
    enabled: !!tenantId,
  });

  const { data: outlets = [] } = useQuery({
    queryKey: ['staff-directory-outlets', tenantId],
    queryFn: () => base44.entities.Outlet.filter({ tenant_id: tenantId }),
    enabled: !!tenantId,
  });

  // Apply filters
  const filtered = useMemo(() => {
    let result = [...employees];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.full_name?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.position?.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q) ||
        (e.skills && e.skills.some(s => s.toLowerCase().includes(q)))
      );
    }

    if (roleFilter !== 'all') result = result.filter(e => e.role === roleFilter);
    if (statusFilter !== 'all') result = result.filter(e => e.status === statusFilter);
    if (outletFilter !== 'all') result = result.filter(e => e.outlet_id === outletFilter);

    return result;
  }, [employees, search, roleFilter, statusFilter, outletFilter]);

  const active = employees.filter(e => e.status === 'active').length;
  const onLeave = employees.filter(e => e.status === 'on_leave').length;
  const managers = employees.filter(e => e.role === 'outlet_manager' || e.role === 'tenant_admin').length;

  const handleSelect = (emp) => {
    setSelected(emp);
    setDialogOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <PageHeader
        title="Staff Directory"
        subtitle="Centralised employee management — profiles, roles, skills, and assignments"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Staff" value={employees.length} icon={Users} color="blue" />
        <StatCard title="Active" value={active} icon={UserCheck} color="green" />
        <StatCard title="On Leave" value={onLeave} icon={Clock} color="amber" />
        <StatCard title="Managers" value={managers} icon={UserCog} color="purple" />
      </div>

      {/* Filters */}
      <EmployeeFilters
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        outlets={outlets}
        outletFilter={outletFilter}
        onOutletChange={setOutletFilter}
        resultCount={filtered.length}
      />

      {/* Directory */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Loading staff directory...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={employees.length === 0 ? "No staff members yet" : "No matches found"}
          description={employees.length === 0
            ? "Your staff directory will appear here once team members join your organisation. Use the Workforce module to invite your first team member."
            : "Try adjusting your search or filters to find the staff member you're looking for."}
          color="blue"
        />
      ) : (
        <EmployeeDirectory
          employees={filtered}
          outlets={outlets}
          onSelect={handleSelect}
          onEdit={canEdit}
        />
      )}

      {/* Profile dialog */}
      <EmployeeProfileDialog
        employee={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        outlets={outlets}
        canEdit={canEdit}
      />
    </div>
  );
}