/**
 * TenantCommandCard — OrbitanOS Unified Tenant Intelligence Card
 * Merges: Identity · Capability Stack · Ramp-Up Activation
 * One card per tenant. Expandable. Exit-Ready.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { MODULES, INDUSTRY_LABELS, SUBSCRIPTION_PLANS } from '@/lib/orbitan-config';
import { PlanBadge } from '@/components/shared/PackBadge';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ChevronDown, ChevronUp, ChevronRight, CheckCircle2, Lock,
  Rocket, Play, Loader2, Zap, Star, TrendingUp, Shield,
  ClipboardList, Sparkles, AlertTriangle, ExternalLink
} from 'lucide-react';

const PACK_META = {
  core:       { label: 'Core',       color: '#2563EB' },
  fnb:        { label: 'F&B',        color: '#F97316' },
  retail:     { label: 'Retail',     color: '#22C55E' },
  recycling:  { label: 'Recycling',  color: '#16A34A' },
  finance:    { label: 'Finance',    color: '#D4AF37' },
  compliance: { label: 'Compliance', color: '#EF4444' },
  ai:         { label: 'AI',         color: '#8B5CF6' },
};

const INDUSTRY_ACCENT = {
  food_beverage:           '#F97316',
  recycling_sustainability:'#16A34A',
  retail:                  '#22C55E',
};

const UPGRADE_PROMPTS = {
  orbitan_starter:    { next: 'orbitan_growth',     label: 'Growth',     price: 'S$149/mo', gradient: 'from-[#34D399] to-[#059669]', unlocks: ['1 Industry Pack', 'Standard AI', 'Multi-outlet', '50 employees'] },
  orbitan_growth:     { next: 'orbitan_business',   label: 'Business',   price: 'S$399/mo', gradient: 'from-[#8B5CF6] to-[#6D28D9]', unlocks: ['Multiple Packs', 'AI Studio', 'Finance Integration', '250 employees'] },
  orbitan_business:   { next: 'orbitan_enterprise', label: 'Enterprise', price: 'Custom',   gradient: 'from-[#1F2937] to-[#111827]', unlocks: ['All Packs', 'Orbitan Shield™ Guardian', 'SSO / MFA', 'Unlimited employees'] },
  orbitan_enterprise: { next: null },
};

const TENANT_ROUTES = {
  tenant_taqueria: '/t1/dashboard',
  tenant_renewed:  '/t2/dashboard',
  tenant_retail:   '/t3/dashboard',
  tenant_izaliqa:  '/leader-org', // placeholder until T4 pages are built
};

// Maps DEMO_TENANT id → onboardingService tenant_ref
const TENANT_MANIFEST_REF = {
  tenant_taqueria: 'taqueria_pte_ltd',
  tenant_renewed:  'renewed_resources_pte_ltd',
  tenant_retail:   'renewed_fashion',
  tenant_izaliqa:  'izaliqa_bakes',
};

export default function TenantCommandCard({ tenant, manifest, activating, onActivate, report }) {
  const [expanded, setExpanded] = useState(false);

  const activeModules = tenant.enabled_modules || [];
  const activePacks   = tenant.enabled_packs   || [];
  const plan          = tenant.subscription_plan;
  const upgrade       = UPGRADE_PROMPTS[plan];
  const accentColor   = INDUSTRY_ACCENT[tenant.industry] || '#2563EB';
  const manifestRef   = TENANT_MANIFEST_REF[tenant.id];
  const route         = TENANT_ROUTES[tenant.id] || '/leader-org';
  const hasRoute      = route !== '/leader-org';
  const isActivating  = activating === manifestRef || activating === 'all';

  // Locked modules = all modules NOT in enabled list, capped at 4
  const allModuleKeys   = Object.keys(MODULES);
  const lockedModules   = allModuleKeys.filter(k => !activeModules.includes(k)).slice(0, 4);
  const hasManifest     = !!manifest;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Colour stripe */}
      <div className="h-1 w-full" style={{ background: accentColor }} />

      {/* ── Card Header ─────────────────────────────────── */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Industry icon circle */}
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: accentColor + '15' }}>
            {tenant.industry === 'food_beverage' ? '🌮' :
             tenant.industry === 'recycling_sustainability' ? '♻️' :
             tenant.industry === 'retail' ? '👗' : '🏢'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-heading font-bold text-foreground">{tenant.name}</h3>
              <StatusBadge status={tenant.status} />
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {INDUSTRY_LABELS[tenant.industry]}
              {tenant.outlet ? ` · ${tenant.outlet}` : ''}
              {tenant.max_employees ? ` · Up to ${tenant.max_employees} employees` : ''}
            </p>
            <PlanBadge plan={plan} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasRoute ? (
              <Link to={route}>
                <Button variant="outline" size="sm" className="gap-1 text-xs h-8">
                  Open <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            ) : (
              <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-1 rounded-lg font-medium">
                Pages Coming Soon
              </span>
            )}
            <button
              onClick={() => setExpanded(v => !v)}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Pack tags — always visible */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {activePacks.map(pk => {
            const meta = PACK_META[pk];
            if (!meta) return null;
            return (
              <span key={pk}
                className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                style={{ background: meta.color + '18', color: meta.color, border: `1px solid ${meta.color}35` }}>
                {meta.label}
              </span>
            );
          })}
          <span className="text-[11px] text-muted-foreground px-1 py-0.5 self-center">
            {activeModules.length} modules active
          </span>
        </div>
      </div>

      {/* ── Expandable Detail ───────────────────────────── */}
      {expanded && (
        <div className="border-t border-border animate-fade-in">

          {/* Active Modules */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Active Modules</p>
            <div className="flex flex-wrap gap-1">
              {activeModules.map(mk => (
                <span key={mk} className="inline-flex items-center gap-1 text-[10px] bg-orbitan-blue-light text-orbitan-blue px-2 py-0.5 rounded-full font-medium">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {MODULES[mk]?.name || mk}
                </span>
              ))}
            </div>
          </div>

          {/* Locked Modules */}
          {lockedModules.length > 0 && (
            <div className="px-5 pb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Locked — Upgrade to Unlock</p>
              <div className="flex flex-wrap gap-1">
                {lockedModules.map(mk => (
                  <span key={mk} className="inline-flex items-center gap-1 text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full opacity-60">
                    <Lock className="w-2.5 h-2.5" />
                    {MODULES[mk]?.name || mk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Upgrade Prompt */}
          {upgrade?.next && (
            <div className={`mx-5 mb-4 rounded-xl p-3.5 bg-gradient-to-r ${upgrade.gradient} flex flex-col sm:flex-row items-start sm:items-center gap-3`}>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Suggested Upgrade · {upgrade.label}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {upgrade.unlocks.map(item => (
                    <span key={item} className="inline-flex items-center gap-1 text-[11px] text-white/90 font-medium">
                      <Zap className="w-2.5 h-2.5 text-[#D4AF37]" />{item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-bold text-white">{upgrade.price}</span>
                <Button size="sm" className="bg-white/15 hover:bg-white/25 text-white border-0 text-xs h-7 px-3 gap-1">
                  <Star className="w-3 h-3" /> Upgrade
                </Button>
              </div>
            </div>
          )}

          {/* ── Ramp-Up Activation ───────────────────────── */}
          <div className="px-5 pb-5 border-t border-border pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Rocket className="w-3.5 h-3.5" /> Operational Ramp-Up
            </p>

            {!hasManifest ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">No activation manifest registered yet. Tenant pages in progress.</p>
              </div>
            ) : report ? (
              /* Activation Result */
              <div className={cn(
                "rounded-xl border p-3 text-xs",
                report.status === 'success' ? "bg-orbitan-green-light border-green-200" :
                report.status === 'partial'  ? "bg-amber-50 border-amber-200" :
                "bg-red-50 border-red-200"
              )}>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {report.status === 'success'
                    ? <CheckCircle2 className="w-4 h-4 text-orbitan-green" />
                    : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  <span className="font-semibold text-foreground">
                    {report.status === 'success' ? 'Activation Complete' : 'Partial Activation'}
                  </span>
                  <span className="text-[10px] bg-white/60 px-2 py-0.5 rounded-full border">
                    {report.records_created?.length || 0} records seeded
                  </span>
                  {report.ai_documents_generated?.length > 0 && (
                    <span className="text-[10px] bg-orbitan-purple-light text-orbitan-purple px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> {report.ai_documents_generated.length} AI docs
                    </span>
                  )}
                  {report.audit_logged && (
                    <span className="text-[10px] bg-orbitan-blue-light text-orbitan-blue px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5" /> Audit Logged
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-[10px]">
                  Activated {new Date(report.activated_at).toLocaleString('en-SG')} by {report.activated_by}
                </p>
              </div>
            ) : (
              /* Pre-activation: show manifest preview + activate button */
              <div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-muted rounded-xl p-3 text-center">
                    <p className="text-base font-bold text-foreground">{manifest.seed_counts?.compliance_records || 0}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                      <Shield className="w-3 h-3" /> Compliance Records
                    </p>
                  </div>
                  <div className="bg-muted rounded-xl p-3 text-center">
                    <p className="text-base font-bold text-foreground">{manifest.seed_counts?.tasks || 0}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                      <ClipboardList className="w-3 h-3" /> Activation Tasks
                    </p>
                  </div>
                </div>
                {manifest.seed_counts?.ai_documents > 0 && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-orbitan-blue-light rounded-lg">
                    <Sparkles className="w-3.5 h-3.5 text-orbitan-blue flex-shrink-0" />
                    <span className="text-xs text-orbitan-blue font-medium">
                      {manifest.seed_counts.ai_documents} AI documents will be generated
                    </span>
                  </div>
                )}
                <Button
                  onClick={() => onActivate(manifestRef)}
                  disabled={isActivating}
                  className="w-full gap-2 font-semibold text-white"
                  style={{ background: accentColor }}
                >
                  {isActivating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Activating...</>
                  ) : (
                    <><Play className="w-4 h-4" /> Activate Tenant</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}