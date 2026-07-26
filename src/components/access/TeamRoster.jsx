// TeamRoster — read-only roster of tenant employees grouped by role.
// Reuses the existing Employee entity + Access Engine. No new RBAC logic.
// Completes the Access Control "assigned-users roster" gap (Build #26A.4 P1-5).
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2 } from 'lucide-react';

const ROLE_ORDER = ['tenant_admin', 'client_manager', 'outlet_manager', 'supervisor', 'worker'];
const ROLE_LABELS = {
  tenant_admin: 'Tenant Admin',
  client_manager: 'Client Manager',
  outlet_manager: 'Outlet Manager',
  supervisor: 'Supervisor',
  worker: 'Worker',
};

export default function TeamRoster({ tenantId }) {
  const { data: employees, isLoading } = useQuery({
    queryKey: ['access-roster', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const result = await base44.entities.Employee.filter({ tenant_id: tenantId }, '-created_date', 200);
      return result || [];
    },
    enabled: !!tenantId,
  });

  const grouped = {};
  (employees || []).forEach((e) => {
    const r = e.role || 'worker';
    (grouped[r] = grouped[r] || []).push(e);
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Team &amp; Roles
          <Badge variant="secondary" className="text-[10px] ml-auto">{employees?.length || 0} members</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading roster…
          </div>
        ) : ROLE_ORDER.filter((r) => grouped[r]?.length).length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">
            No employees linked to this tenant yet. Onboard staff in the Workforce module to populate the roster.
          </p>
        ) : (
          ROLE_ORDER.filter((r) => grouped[r]?.length).map((role) => (
            <div key={role} className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground">{ROLE_LABELS[role] || role}</span>
                <Badge variant="outline" className="text-[10px]">{grouped[role].length}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {grouped[role].map((e) => (
                  <span key={e.id} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {e.full_name || e.email || 'Unnamed'}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
        <p className="text-[10px] text-muted-foreground pt-1">
          Read-only view of who holds each role. Manage role assignments in the Workforce module.
        </p>
      </CardContent>
    </Card>
  );
}