// ============================================================
// ORBITAN — Enterprise Identity Bar
// Phase A: Enterprise Multi-Pack Visual Identity
//
// Renders the tenant name + multi-pack badge strip.
// For Enterprise tenants: shows all activated capability packs.
// For non-Enterprise: shows plan badge + primary pack.
// EXIT-READY: Zero Base44 dependency. Pure React + CSS.
// ============================================================

import React from 'react';
import { cn } from '@/lib/utils';
import { PackBadgeGroup, PlanBadge } from '@/components/shared/PackBadge';
import { SUBSCRIPTION_PLANS } from '@/lib/orbitan-config';

export default function EnterpriseIdentityBar({
  tenant,
  className,
  showPlan = true,
  showOutlet = false,
  size = 'md', // 'sm' | 'md' | 'lg'
}) {
  if (!tenant) return null;

  const plan = SUBSCRIPTION_PLANS[tenant.subscription_plan];
  const isEnterprise = plan?.tier_level === 4;
  const packs = tenant.enabled_packs || [];

  const titleClass = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-bold',
    lg: 'text-xl font-bold',
  }[size];

  const subClass = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  }[size];

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {/* Tenant name row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn('font-heading text-foreground tracking-tight', titleClass)}>
          {tenant.name}
        </span>
        {showPlan && <PlanBadge plan={tenant.subscription_plan} />}
      </div>

      {/* Outlet / brand subtitle */}
      {showOutlet && (tenant.outlet || tenant.brand) && (
        <p className={cn('text-muted-foreground', subClass)}>
          {tenant.brand}{tenant.outlet ? ` · ${tenant.outlet}` : ''}
        </p>
      )}

      {/* Multi-pack capability strip */}
      {packs.length > 0 && (
        <PackBadgeGroup
          packs={packs}
          size={size === 'lg' ? 'sm' : 'xs'}
        />
      )}

      {/* Enterprise indicator stripe */}
      {isEnterprise && (
        <div
          className="h-0.5 w-16 rounded-full mt-0.5"
          style={{ background: 'linear-gradient(90deg, #D4AF37, #92620A)' }}
          title="Orbitan Enterprise"
        />
      )}
    </div>
  );
}