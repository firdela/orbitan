// ============================================================
// ORBITANOS — Tenant Switcher (Build #25 UX Refinement)
// Architecture Version 1.1
//
// Canonical workspace switcher. Consumes useWorkspace().
// Build #25: guided empty state, search, richer item display
// (organisation, role, industry, status), clearer hierarchy.
// ============================================================

import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/workspace';
import { INDUSTRY_LABELS } from '@/lib/orbitan-config';
import { useTenantNames } from '@/lib/hooks/useTenantNames';
import { Building2, ChevronRight, Check, Shield, Search, Plus, ArrowRight, Layers } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const ROLE_LABELS = {
  tenant_admin: 'Tenant Admin',
  outlet_manager: 'Outlet Manager',
  supervisor: 'Supervisor',
  worker: 'Worker',
  admin: 'Platform Admin',
};

function RoleBadge({ role }) {
  if (!role) return null;
  const label = ROLE_LABELS[role] || role;
  const styles = {
    tenant_admin: 'bg-orbitan-blue-light text-orbitan-blue-700',
    outlet_manager: 'bg-orbitan-green-light text-orbitan-green-700',
    supervisor: 'bg-orbitan-amber-light text-orbitan-amber-700',
    worker: 'bg-muted text-muted-foreground',
    admin: 'bg-orbitan-purple-light text-orbitan-purple-700',
  };
  return (
    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-medium', styles[role] || styles.worker)}>
      {label}
    </span>
  );
}

export default function TenantSwitcher({ className }) {
  const { memberships, activeMembership, tenant: activeTenant, switchWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  // ── Shared tenant-name hydration (Build #28.2A) ──
  // Uses the canonical useTenantNames hook so TenantSwitcher and UserMenu
  // share the same resolution logic, cache, and fallback behaviour.
  const orgIds = memberships.map((m) => m.organisation_id).filter(Boolean);
  const tenantMap = useTenantNames(orgIds);

  // ── Build #28.2E — Context-Aware Workspace Switch ──
  // When switching from the Platform Console (/leader-org) or a
  // platform route (/platform/*), stay on the current page — the
  // workspace context update alone is sufficient. Integration Hub
  // and other platform pages consume useWorkspace() and re-render
  // with the new tenant context automatically.
  //
  // When switching from a /workspace/* route, navigate to the new
  // tenant's workspace dashboard.
  const location = useLocation();
  const handleSwitch = (membership) => {
    const ok = switchWorkspace(membership.organisation_id);
    if (!ok) return;

    const currentPath = location.pathname;
    const isPlatformContext =
      currentPath.startsWith('/leader-org') ||
      currentPath.startsWith('/platform/');

    if (isPlatformContext) {
      // Stay on current page — context switch only.
      // The current page (e.g. Integration Hub) will re-render
      // with the new activeTenantId from WorkspaceProvider.
      return;
    }

    navigate(`/workspace/${membership.organisation_id}/dashboard`, { replace: true });
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return memberships;
    const q = query.toLowerCase();
    return memberships.filter((m) => {
      const tenant = tenantMap[m.organisation_id];
      const name = tenant?.name || m.display_name || '';
      const industry = tenant?.industry || m.industry || '';
      return (
        name.toLowerCase().includes(q) ||
        industry.toLowerCase().includes(q) ||
        (INDUSTRY_LABELS[industry] || '').toLowerCase().includes(q)
      );
    });
  }, [memberships, query, tenantMap]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-2 text-xs max-w-[220px]', className)}
          aria-label="Switch workspace"
        >
          <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">
            {activeTenant?.name || activeMembership?.display_name || 'Select Workspace'}
          </span>
          <ChevronRight className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-3 pt-3">
          Your Workspaces ({memberships.length})
        </DropdownMenuLabel>

        {memberships.length > 0 && (
          <div className="px-2 pb-1">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search workspaces..."
                aria-label="Search workspaces"
                className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        )}

        <DropdownMenuSeparator />

        {memberships.length === 0 ? (
          // ── Guided empty state ──
          <div className="px-3 py-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Layers className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No workspaces yet</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  You haven&rsquo;t joined any workspaces. Request access from your organisation
                  administrator, or create a new workspace if you have permission.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Button size="sm" variant="default" onClick={() => navigate('/request-access')} className="w-full justify-start">
                <Plus className="w-3.5 h-3.5" /> Request Access
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/onboarding')} className="w-full justify-start">
                <Building2 className="w-3.5 h-3.5" /> Create a Workspace
              </Button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            No workspaces match &ldquo;{query}&rdquo;.
          </div>
        ) : (
          filtered.map((membership) => {
            const isActive = activeMembership?.organisation_id === membership.organisation_id;
            const role = membership.role_assignments?.[0]?.role || membership.role;
            const tenant = tenantMap[membership.organisation_id];
            const workspaceName = tenant?.name || 'Unnamed Workspace';
            const industry = tenant?.industry || membership.industry || (isActive ? activeTenant?.industry : null);
            const tenantStatus = tenant?.status || null;
            return (
              <DropdownMenuItem
                key={membership.organisation_id}
                onClick={() => handleSwitch(membership)}
                className={cn(
                  'flex flex-col items-start gap-1.5 py-2.5 px-3 cursor-pointer',
                  isActive && 'bg-accent'
                )}
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-orbitan-blue-light flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-orbitan-blue" />
                    </div>
                    <span className="font-medium text-sm truncate">
                      {workspaceName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isActive ? (
                      <Check className="w-3.5 h-3.5 text-orbitan-blue" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap pl-9">
                  <RoleBadge role={role} />
                  {industry && (
                    <span className="text-[10px] text-muted-foreground">
                      {INDUSTRY_LABELS[industry] || industry}
                    </span>
                  )}
                  {tenantStatus && !isActive && (
                    <span className="text-[10px] text-muted-foreground/70 capitalize">{tenantStatus}</span>
                  )}
                  {isActive && (
                    <span className="text-[10px] text-orbitan-green-700 font-medium">Active</span>
                  )}
                </div>
              </DropdownMenuItem>
            );
          })
        )}

        {memberships.length > 0 && <DropdownMenuSeparator />}

        <DropdownMenuItem
          onClick={() => navigate('/leader-org')}
          className="text-xs text-muted-foreground"
        >
          <Shield className="w-3 h-3 mr-1.5" /> Platform Console
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}