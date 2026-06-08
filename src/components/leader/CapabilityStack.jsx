/**
 * CapabilityStack — OrbitanOS Tenant Intelligence Panel
 * Principle: Reach
 *
 * Shows each tenant's activated capability stack with:
 * - Active packs as coloured tags (Multi-Pack Enterprise Identity)
 * - Dimmed "locked" modules with one-click upgrade path
 * - Guided Growth upsell cards triggered by usage thresholds
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { MODULES, SUBSCRIPTION_PLANS, INDUSTRY_LABELS } from '@/lib/orbitan-config';
import { DEMO_TENANTS } from '@/lib/use-tenant.jsx';
import { PlanBadge } from '@/components/shared/PackBadge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Lock, ChevronRight, Zap, TrendingUp, Star } from 'lucide-react';

// Which packs/modules each plan unlocks (ordered upgrade path)
const UPGRADE_PROMPTS = {
  orbitan_starter:    { next: 'orbitan_growth',     unlocks: ['1 Industry Pack', 'Standard AI', 'Multi-outlet', '50 employees'] },
  orbitan_growth:     { next: 'orbitan_business',   unlocks: ['Multiple Packs', 'AI Studio', 'Finance Integration', '250 employees'] },
  orbitan_business:   { next: 'orbitan_enterprise', unlocks: ['All Packs', 'Orbitan Shield™ Guardian', 'SSO / MFA', 'Unlimited employees'] },
  orbitan_enterprise: { next: null, unlocks: [] },
};

const PLAN_NEXT_LABELS = {
  orbitan_growth:     { label: 'Business', price: 'S$399/mo', gradient: 'from-[#8B5CF6] to-[#6D28D9]' },
  orbitan_business:   { label: 'Enterprise', price: 'Custom', gradient: 'from-[#1F2937] to-[#111827]' },
  orbitan_enterprise: { label: null },
};

const PACK_META = {
  core:       { label: 'Core',       color: '#2563EB' },
  fnb:        { label: 'F&B',        color: '#F97316' },
  retail:     { label: 'Retail',     color: '#22C55E' },
  recycling:  { label: 'Recycling',  color: '#16A34A' },
  finance:    { label: 'Finance',    color: '#D4AF37' },
  compliance: { label: 'Compliance', color: '#EF4444' },
  ai:         { label: 'AI',         color: '#8B5CF6' },
};

const TENANT_PACKS = {
  tenant_taqueria: ['core', 'fnb', 'finance', 'compliance'],
  tenant_renewed:  ['core', 'recycling', 'compliance'],
  tenant_retail:   ['core', 'retail'],
};

const TENANT_ROUTES = {
  tenant_taqueria: '/t1/dashboard',
  tenant_renewed:  '/t2/dashboard',
  tenant_retail:   '/t3/dashboard',
};

export default function CapabilityStack() {
  const tenants = DEMO_TENANTS;

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="font-heading font-semibold text-lg mb-1">Capability Stack</h2>
        <p className="text-sm text-muted-foreground">
          Each tenant's activated operational capabilities. Dimmed items show upgrade opportunities.
        </p>
      </div>

      {tenants.map((tenant) => {
        const activePacks = TENANT_PACKS[tenant.id] || ['core'];
        const activeModules = tenant.enabled_modules || [];
        const plan = tenant.subscription_plan;
        const upgrade = UPGRADE_PROMPTS[plan];
        const nextPlanMeta = upgrade?.next ? PLAN_NEXT_LABELS[upgrade.next] : null;

        // All possible modules — split into active vs locked
        const allModuleKeys = Object.keys(MODULES);
        const lockedModules = allModuleKeys.filter(k => !activeModules.includes(k)).slice(0, 4);

        return (
          <div key={tenant.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            {/* Tenant Header */}
            <div className="px-5 pt-5 pb-4 flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h3 className="font-heading font-semibold text-foreground">{tenant.name}</h3>
                  <PlanBadge plan={plan} />
                </div>
                <p className="text-xs text-muted-foreground">{INDUSTRY_LABELS[tenant.industry]} · {activeModules.length} modules active</p>
              </div>
              <Link to={TENANT_ROUTES[tenant.id] || '/leader-org'}>
                <Button variant="outline" size="sm" className="gap-1 text-xs whitespace-nowrap">
                  Open Console <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>

            {/* Active Pack Tags (Enterprise Multi-Pack Identity) */}
            <div className="px-5 pb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Active Packs</p>
              <div className="flex flex-wrap gap-1.5">
                {activePacks.map((packKey) => {
                  const meta = PACK_META[packKey];
                  if (!meta) return null;
                  return (
                    <span
                      key={packKey}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: meta.color + '18', color: meta.color, border: `1px solid ${meta.color}35` }}
                    >
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Active Modules */}
            <div className="px-5 pb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Active Modules</p>
              <div className="flex flex-wrap gap-1">
                {activeModules.slice(0, 10).map((modKey) => (
                  <span
                    key={modKey}
                    className="inline-flex items-center gap-1 text-[10px] bg-orbitan-blue-light text-orbitan-blue px-2 py-0.5 rounded-full font-medium"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {MODULES[modKey]?.name || modKey}
                  </span>
                ))}
              </div>
            </div>

            {/* Locked Modules (Upgrade Path) */}
            {lockedModules.length > 0 && (
              <div className="px-5 pb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Locked — Upgrade to Unlock</p>
                <div className="flex flex-wrap gap-1">
                  {lockedModules.map((modKey) => (
                    <span
                      key={modKey}
                      className="inline-flex items-center gap-1 text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full opacity-60"
                    >
                      <Lock className="w-2.5 h-2.5" />
                      {MODULES[modKey]?.name || modKey}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Guided Growth Upsell */}
            {nextPlanMeta && upgrade?.unlocks?.length > 0 && (
              <div className={`mx-5 mb-5 rounded-xl p-4 bg-gradient-to-r ${nextPlanMeta.gradient} flex flex-col sm:flex-row items-start sm:items-center gap-3`}>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-white/70" />
                    <p className="text-[11px] font-bold text-white/70 uppercase tracking-wider">Suggested Upgrade · {nextPlanMeta.label}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {upgrade.unlocks.map((item) => (
                      <span key={item} className="inline-flex items-center gap-1 text-[11px] text-white/90 font-medium">
                        <Zap className="w-2.5 h-2.5 text-[#D4AF37]" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-bold text-white">{nextPlanMeta.price}</span>
                  <Button size="sm" className="bg-white/15 hover:bg-white/25 text-white border-0 text-xs h-7 px-3 gap-1">
                    <Star className="w-3 h-3" /> Upgrade
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}