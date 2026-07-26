// ============================================================
// ORBITAN — BlueprintAdvisor Component
// Persistent slide-in panel evaluating tenant configuration health.
// Consumes the blueprint-registry for rules, scores, and violations.
//
// Orbitan Scalability Principle: This component reads from the
// registry — never hardcoded. Adding an industry = one registry entry.
// Exit-Ready: pure UI layer over static rule data.
// ============================================================

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import BlueprintScoreRing from '@/components/advisor/BlueprintScoreRing';
import AdvisoryRuleCard from '@/components/advisor/AdvisoryRuleCard';
import {
  getActiveAdvisoryRules,
  calculateBlueprintScore,
  getPlanGatingViolations,
  getDependencyViolations,
  MODULE_DEPENDENCY_MAP,
} from '@/lib/onboarding/blueprint-registry';
import { useAdvisoryConfig } from '@/lib/hooks/useAdvisoryConfig';
import { MODULES, INDUSTRY_LABELS } from '@/lib/orbitan-config';

import {
  X, Target, Shield, Info, AlertTriangle, Layers,
  ChevronDown, ChevronUp, Zap, Building2, Sparkles,
  ArrowUpRight, Package
} from 'lucide-react';

// ── Score Breakdown Sub-component ────────────────────────────
function ScoreBreakdown({ state, industryRules }) {
  if (!industryRules) return null;

  const criticalCount = industryRules.critical_modules.length;
  const activatedCritical = industryRules.critical_modules.filter(
    m => state.enabled_modules?.includes(m)
  ).length;

  const depViolations = getDependencyViolations(state.enabled_modules || []);

  const items = [
    {
      label: 'Critical Modules',
      value: `${activatedCritical}/${criticalCount}`,
      color: activatedCritical === criticalCount ? '#16A34A' : '#DC2626',
      detail: industryRules.critical_modules.join(', '),
    },
    {
      label: 'Governance Gates',
      value: getActiveAdvisoryRules(state).filter(r => r.severity === 'governance_gate').length,
      suffix: 'active',
      color: '#DC2626',
    },
    {
      label: 'Dependencies',
      value: depViolations.length,
      suffix: 'violations',
      color: depViolations.length === 0 ? '#16A34A' : '#F59E0B',
    },
  ];

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{item.label}</span>
          <div className="flex items-center gap-1">
            <span className="font-semibold" style={{ color: item.color }}>
              {item.value}
            </span>
            {item.suffix && (
              <span className="text-muted-foreground">{item.suffix}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tenant Selector Sub-component ─────────────────────────────
function TenantSelector({ selectedTenant, onSelect, manifests }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-sm"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-foreground font-medium truncate">
            {selectedTenant ? selectedTenant.display_name : 'Select tenant...'}
          </span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> :
                 <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {manifests.map((m) => (
            <button
              key={m.tenant_ref}
              onClick={() => { onSelect(m); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2",
                selectedTenant?.tenant_ref === m.tenant_ref && "bg-muted"
              )}
            >
              <span className="truncate">{m.display_name}</span>
              <Badge variant="outline" className="text-[9px] ml-auto flex-shrink-0">
                {m.plan.replace('orbitan_', '').replace('_', ' ')}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main BlueprintAdvisor Component ───────────────────────────
export default function BlueprintAdvisor({ open, onClose }) {
  const { data: tenantsData } = useQuery({
    queryKey: ['advisor-tenants'],
    queryFn: async () => base44.entities.Tenant.list('-created_date', 100),
  });
  const manifests = useMemo(
    () => (tenantsData || []).map((t) => ({
      tenant_ref: t.id,
      display_name: t.name || 'Unnamed tenant',
      industry: t.industry || 'food_beverage',
      plan: t.subscription_plan || t.plan || 'orbitan_starter',
      enabled_modules: t.enabled_modules || [],
      enabled_packs: t.enabled_packs || [],
      is_virtual: t.is_virtual || false,
    })),
    [tenantsData]
  );
  const [selectedTenant, setSelectedTenant] = useState(null);

  const state = useMemo(() => {
    if (!selectedTenant) return null;
    return {
      industry: selectedTenant.industry || 'food_beverage',
      plan: selectedTenant.plan || 'orbitan_starter',
      enabled_modules: selectedTenant.enabled_modules || [],
      enabled_packs: selectedTenant.enabled_packs || [],
      is_virtual: selectedTenant.is_virtual || false,
    };
  }, [selectedTenant]);

  const score = useMemo(() => {
    if (!state) return null;
    return calculateBlueprintScore(state);
  }, [state]);

  const activeRules = useMemo(() => {
    if (!state) return [];
    return getActiveAdvisoryRules(state);
  }, [state]);

  const planViolations = useMemo(() => {
    if (!state) return [];
    return getPlanGatingViolations(state);
  }, [state]);

  const depViolations = useMemo(() => {
    if (!state) return [];
    return getDependencyViolations(state.enabled_modules || []);
  }, [state]);

  const governanceGates = activeRules.filter(r => r.severity === 'governance_gate');
  const softGates = activeRules.filter(r => r.severity === 'soft_gate');

  const { config: industryRules } = useAdvisoryConfig(state?.industry);

  const industryColor = industryRules?.color_hex || '#2563EB';

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-in Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-background border-l border-border z-50 shadow-2xl animate-slide-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg orbitan-gradient flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-sm text-foreground">Blueprint Advisor</h2>
              <p className="text-[10px] text-muted-foreground">OrbitanOS Onboarding Intelligence</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-5">
            {/* Tenant Selector */}
            <TenantSelector
              selectedTenant={selectedTenant}
              onSelect={setSelectedTenant}
              manifests={manifests}
            />

            {!selectedTenant ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Select a tenant above to evaluate their Blueprint health.
                </p>
              </div>
            ) : (
              <>
                {/* Score Section */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center gap-4">
                    <BlueprintScoreRing score={score} size={100} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm text-foreground mb-0.5">
                        {selectedTenant.display_name}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        {INDUSTRY_LABELS[selectedTenant.industry]} · {selectedTenant.plan.replace('orbitan_', '').replace('_', ' ')}
                      </p>
                      <ScoreBreakdown state={state} industryRules={industryRules} />
                    </div>
                  </div>

                  {/* Recommended Path Progress */}
                  {industryRules && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Recommended Activation Path
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {industryRules.recommended_path.map((moduleKey, idx) => {
                          const isActive = state.enabled_modules?.includes(moduleKey);
                          const mod = MODULES[moduleKey];
                          return (
                            <span
                              key={moduleKey}
                              className={cn(
                                "text-[10px] px-2 py-1 rounded-full flex items-center gap-1 transition-colors",
                                isActive
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
                                : "bg-muted text-muted-foreground"
                              )}
                            >
                              {isActive && <Zap className="w-2.5 h-2.5" />}
                              {mod?.name || moduleKey}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Governance Gates Section */}
                {governanceGates.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-orbitan-red" />
                      <h3 className="text-sm font-semibold text-foreground">Governance Gates</h3>
                      <Badge className="text-[10px] bg-destructive/10 text-destructive border-0">
                        {governanceGates.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {governanceGates.map((rule) => (
                        <AdvisoryRuleCard key={rule.id} rule={rule} compact />
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations Section */}
                {softGates.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="w-4 h-4 text-orbitan-blue" />
                      <h3 className="text-sm font-semibold text-foreground">Recommendations</h3>
                      <Badge className="text-[10px] bg-primary/10 text-primary border-0">
                        {softGates.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {softGates.map((rule) => (
                        <AdvisoryRuleCard key={rule.id} rule={rule} compact />
                      ))}
                    </div>
                  </div>
                )}

                {/* Module Dependencies Section */}
                {depViolations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-orbitan-amber" />
                      <h3 className="text-sm font-semibold text-foreground">Dependency Violations</h3>
                      <Badge className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-0">
                        {depViolations.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {depViolations.map((v, i) => (
                        <div key={i} className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5 text-xs">
                          <p className="font-medium text-foreground mb-0.5">
                            {MODULES[v.module]?.name || v.module} is missing:
                          </p>
                          <p className="text-muted-foreground mb-1">
                            {v.missing.map(m => MODULES[m]?.name || m).join(', ')}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{v.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Plan Gating Section */}
                {planViolations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowUpRight className="w-4 h-4 text-orbitan-purple" />
                      <h3 className="text-sm font-semibold text-foreground">Plan Limitations</h3>
                      <Badge className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-400 border-0">
                        {planViolations.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {planViolations.map((v, i) => (
                        <div key={i} className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2.5 text-xs">
                          <p className="text-foreground leading-relaxed">{v.message}</p>
                          {v.upgrade_plan && (
                            <p className="text-[10px] text-orbitan-purple mt-1 font-medium">
                              Upgrade to{' '}
                              {v.upgrade_plan.replace('orbitan_', '').replace('_', ' ')} to unlock.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Clear */}
                {governanceGates.length === 0 && softGates.length === 0 &&
                 depViolations.length === 0 && planViolations.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-orbitan-green" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">All Clear</p>
                      <p className="text-xs text-muted-foreground">
                        This tenant's configuration is fully aligned with OrbitanOS best practices.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/30 flex-shrink-0">
          <p className="text-[10px] text-muted-foreground text-center">
            Blueprint Advisor · Powered by OrbitanOS Shield™ · Regulate Principle
          </p>
        </div>
      </div>
    </>
  );
}