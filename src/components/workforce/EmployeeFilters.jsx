import React from 'react';
import { Search, Users, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'tenant_admin', label: 'Tenant Admin' },
  { value: 'outlet_manager', label: 'Outlet Manager' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'worker', label: 'Team Member' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' },
];

export default function EmployeeFilters({ search, onSearchChange, roleFilter, onRoleChange, statusFilter, onStatusChange, outlets, outletFilter, onOutletChange, resultCount }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-5 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, position, or skill..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Role filter */}
        <Select value={roleFilter} onValueChange={onRoleChange}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map(r => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Outlet filter */}
        {outlets.length > 1 && (
          <Select value={outletFilter} onValueChange={onOutletChange}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Outlet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outlets</SelectItem>
              {outlets.map(o => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="w-3.5 h-3.5" />
        <span>
          Showing <span className="font-medium text-foreground">{resultCount}</span> staff {resultCount !== 1 ? 'members' : 'member'}
        </span>
      </div>
    </div>
  );
}