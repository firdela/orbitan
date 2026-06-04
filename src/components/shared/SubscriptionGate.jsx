/**
 * OrbitanOS — SubscriptionGate Component
 * Exit-Ready: UI wrapper that enforces plan-based feature gating.
 * Uses the pure orbitan-plans.js library — no platform lock-in.
 * 
 * Usage:
 *   <SubscriptionGate tenant={tenant} requiredModule="ai_suite">
 *     <AIFeature />
 *   </SubscriptionGate>
 */
import React from 'react';
import { SUBSCRIPTION_PLANS } from '@/lib/orbitan-config';

function hasModuleAccess(tenant, moduleKey) {
  if (!tenant) return false;
  const plan = SUBSCRIPTION_PLANS[tenant.subscription_plan];
  if (!plan) return false;
  if (plan.allowed_modules.includes("all")) return true;
  if (tenant.feature_flags?.[moduleKey] === true) return true;
  if (tenant.feature_flags?.[moduleKey] === false) return false;
  return (tenant.enabled_modules || []).includes(moduleKey);
}

function hasPackAccess(tenant, packKey) {
  if (!tenant) return false;
  const plan = SUBSCRIPTION_PLANS[tenant.subscription_plan];
  if (!plan) return false;
  if (plan.allowed_packs.includes("all")) return true;
  return (tenant.enabled_packs || []).includes(packKey);
}

function meetsMinimumPlan(tenant, minPlanKey) {
  if (!tenant) return false;
  const current = SUBSCRIPTION_PLANS[tenant.subscription_plan];
  const required = SUBSCRIPTION_PLANS[minPlanKey];
  if (!current || !required) return false;
  return current.tier_level >= required.tier_level;
}
import { Lock } from 'lucide-react';
import { PlanBadge } from '@/components/shared/PackBadge';
import { cn } from '@/lib/utils';

export default function SubscriptionGate({
  tenant,
  requiredModule,
  requiredPack,
  minimumPlan,
  children,
  fallback,
  className,
}) {
  // Evaluate access
  let hasAccess = true;

  if (requiredModule && !hasModuleAccess(tenant, requiredModule)) {
    hasAccess = false;
  }
  if (requiredPack && !hasPackAccess(tenant, requiredPack)) {
    hasAccess = false;
  }
  if (minimumPlan && !meetsMinimumPlan(tenant, minimumPlan)) {
    hasAccess = false;
  }

  if (hasAccess) return <>{children}</>;

  // Determine which plan unlocks this
  const requiredPlanLabel = minimumPlan ? (SUBSCRIPTION_PLANS[minimumPlan]?.name || minimumPlan) : 'a higher plan';

  if (fallback) return <>{fallback}</>;

  return (
    <div className={cn(
      'relative rounded-xl border border-border bg-card overflow-hidden',
      className
    )}>
      {/* Blurred content preview */}
      <div className="blur-sm pointer-events-none select-none opacity-40 p-6">
        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
        <div className="h-4 bg-muted rounded w-1/2 mb-2" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-heading font-semibold text-foreground text-sm">Feature Locked</p>
          <p className="text-xs text-muted-foreground mt-1">
            {requiredModule && `Requires the "${requiredModule}" module. `}
            {requiredPack && `Requires the "${requiredPack}" pack. `}
            Upgrade to <span className="font-semibold text-foreground">{requiredPlanLabel}</span> to unlock.
          </p>
        </div>
        {minimumPlan && <PlanBadge plan={minimumPlan} />}
      </div>
    </div>
  );
}