// ============================================================
// ORBITAN — Tenant Switcher
// Phase B: Dynamic Launchpad
//
// Allows Platform Owner / admin to switch active tenant context.
// Uses DEMO_TENANTS from TenantContext — no hard-coded routes.
// EXIT-READY: Pure React. Replace DEMO_TENANTS with API call.
// ============================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTenant } from '@/lib/use-tenant';
import { PackBadgeGroup, PlanBadge } from '@/components/shared/PackBadge';
import { INDUSTRY_LABELS } from '@/lib/orbitan-config';
import { Building2, ChevronRight } from 'lucide-react';
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
  const { currentTenant, switchTenant, allTenants, dashboardPath } = useTenant();
  const navigate = useNavigate();

  const handleSwitch = (tenant) => {
    switchTenant(tenant.id);
    navigate(`/workspace/${tenant.id}/dashboard`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-2 text-xs max-w-[200px]', className)}
        >
          <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{currentTenant?.name || 'No Tenant'}</span>
          <ChevronRight className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
          Switch Tenant
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {(allTenants || []).map(tenant => {
          const isActive = currentTenant && tenant.id === currentTenant.id;
          return (
            <DropdownMenuItem
              key={tenant.id}
              onClick={() => handleSwitch(tenant)}
              className={cn(
                'flex flex-col items-start gap-1.5 py-3 cursor-pointer',
                isActive && 'bg-accent'
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium text-sm">{tenant.name}</span>
                <PlanBadge plan={tenant.subscription_plan} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {INDUSTRY_LABELS[tenant.industry]}
              </p>
              <PackBadgeGroup packs={tenant.enabled_packs} size="xs" />
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate('/leader-org')}
          className="text-xs text-muted-foreground"
        >
          ← Back to Platform Console
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}