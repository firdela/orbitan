// ============================================================
// ORBITANOS — Tenant Switcher (Stage B: Workspace Context System)
// Architecture Version 1.0
//
// The canonical workspace switcher. Consumes useWorkspace() — the
// unified operational context (ADR-0050). Shows the authenticated
// user's REAL memberships (not demo tenants) and performs in-session
// switching via switchWorkspace(), which preserves the session, UI
// shell, and websocket while invalidating only tenant-scoped cache.
//
// Routing: after switching the active membership, navigates to the
// workspace-scoped URL so WorkspaceLayout and its :tenantId param
// stay in sync. The memberships cache is NOT invalidated on switch
// — it is identity-bound, not workspace-bound.
//
// Exit-Ready: Pure React. No direct Base44 SDK calls.
// ============================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/workspace';
import { PackBadgeGroup, PlanBadge } from '@/components/shared/PackBadge';
import { INDUSTRY_LABELS } from '@/lib/orbitan-config';
import { Building2, ChevronRight, Check, Shield } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export default function TenantSwitcher({ className }) {
  const {
    memberships,
    activeMembership,
    tenant: activeTenant,
    switchWorkspace,
  } = useWorkspace();
  const navigate = useNavigate();

  const handleSwitch = (membership) => {
    const ok = switchWorkspace(membership.organisation_id);
    if (ok) {
      navigate(`/workspace/${membership.organisation_id}/dashboard`, {
        replace: true,
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-2 text-xs max-w-[220px]', className)}
        >
          <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">
            {activeTenant?.name || activeMembership?.display_name || 'Select Workspace'}
          </span>
          <ChevronRight className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
          Your Workspaces ({memberships.length})
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {memberships.length === 0 && (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            No workspace memberships found.
          </div>
        )}

        {memberships.map((membership) => {
          const isActive =
            activeMembership?.organisation_id === membership.organisation_id;
          const industry = membership.industry || activeTenant?.industry;
          return (
            <DropdownMenuItem
              key={membership.organisation_id}
              onClick={() => handleSwitch(membership)}
              className={cn(
                'flex flex-col items-start gap-1.5 py-3 cursor-pointer',
                isActive && 'bg-accent'
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium text-sm">
                  {membership.display_name || 'Unnamed Workspace'}
                </span>
                {isActive ? (
                  <Check className="w-3.5 h-3.5 text-orbitan-blue flex-shrink-0" />
                ) : (
                  <Shield className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                )}
              </div>
              {industry && (
                <p className="text-[10px] text-muted-foreground">
                  {INDUSTRY_LABELS[industry] || industry}
                </p>
              )}
            </DropdownMenuItem>
          );
        })}

        {memberships.length > 1 && <DropdownMenuSeparator />}

        <DropdownMenuItem
          onClick={() => navigate('/leader-org')}
          className="text-xs text-muted-foreground"
        >
          ← Platform Console
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}