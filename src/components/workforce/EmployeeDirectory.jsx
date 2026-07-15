import React, { useMemo } from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import { Mail, Phone, MapPin, Briefcase, Shield, Award } from 'lucide-react';

const ROLE_STYLES = {
  tenant_admin: { label: 'Tenant Admin', cls: 'bg-orbitan-purple-light text-orbitan-purple' },
  client_manager: { label: 'Client Manager', cls: 'bg-orbitan-amber-light text-orbitan-amber' },
  outlet_manager: { label: 'Outlet Manager', cls: 'bg-orbitan-blue-light text-orbitan-blue' },
  supervisor: { label: 'Supervisor', cls: 'bg-orbitan-green-light text-orbitan-green' },
  worker: { label: 'Team Member', cls: 'bg-secondary text-muted-foreground' },
};

const AVATAR_GRADIENTS = [
  'orbitan-gradient',
  'bg-orbitan-purple',
  'bg-orbitan-green',
  'bg-orbitan-amber',
];

function getInitials(name) {
  return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export default function EmployeeDirectory({ employees, outlets, onSelect, onEdit }) {
  const outletMap = useMemo(() => {
    const map = {};
    outlets.forEach(o => { map[o.id] = o; });
    return map;
  }, [outlets]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {employees.map((emp, i) => {
        const roleStyle = ROLE_STYLES[emp.role] || ROLE_STYLES.worker;
        const outlet = outletMap[emp.outlet_id];
        return (
          <div
            key={emp.id}
            onClick={() => onSelect(emp)}
            className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-primary/20 transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${AVATAR_GRADIENTS[i % 4]}`}>
                {getInitials(emp.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-heading font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">{emp.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{emp.position || 'Staff'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${roleStyle.cls}`}>
                {roleStyle.label}
              </span>
              <StatusBadge status={emp.status || 'active'} size="sm" />
            </div>
            <div className="space-y-1">
              {outlet && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 flex-shrink-0" />{outlet.name}
                </p>
              )}
              {emp.email && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3 flex-shrink-0" />{emp.email}
                </p>
              )}
              {emp.skills && emp.skills.length > 0 && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                  <Award className="w-3 h-3 flex-shrink-0" />{emp.skills.length} skill{emp.skills.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}