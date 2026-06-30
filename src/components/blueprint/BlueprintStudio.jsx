// ============================================================
// ORBITAN — Blueprint Studio (Editable Layouts)
// Visual editor where the Platform Owner designs tenant blueprints:
//   - Toggle modules (respecting plan gating)
//   - Drag-and-drop reorder the workspace layout
//   - Live Blueprint Score + governance gate feedback
//   - Export the edited blueprint as JSON
//
// Orbitan Scalability Principle: reads from the registry, never
// hardcoded. The working copy is in-memory; export produces a
// portable blueprint spec. Exit-Ready: pure UI over registry data.
// ============================================================

import React, { useState, useMemo } from 'react';
import { getManifestList, getManifest } from '@/lib/tenant-registry';
import {
  calculateBlueprintScore,
  getActiveAdvisoryRules,
  getPlanGatingViolations,
  getDependencyViolations,
  INDUSTRY_ADVISOR_RULES,
} from '@/lib/onboarding/blueprint-registry';
import { INDUSTRY_LABELS } from '@/lib/orbitan-config';
import { base44 } from '@/api/base44Client';
import ModulePalette from '@/components/blueprint/ModulePalette';
import LayoutCanvas from '@/components/blueprint/LayoutCanvas';
import BlueprintScoreRing from '@/components/advisor/BlueprintScoreRing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Building2, ChevronDown, Shield, Info, AlertTriangle,
  Download, RotateCcw, Check, Copy, Layers, Sparkles,
} from 'lucide-react';

export default function BlueprintStudio() {
  const manifests = useMemo(() => getManifestList(), []);
  const [selectedRef, setSelectedRef] = useState(manifests[0]?.tenant_ref || null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exported, setExported] = useState(false);
  const [copied, setCopied] = useState(false);

  const baseManifest = useMemo(() => getManifest(selectedRef), [selectedRef]);

  // Working copy of the editable layout
  const [layoutModules, setLayoutModules] = useState(
    () => baseManifest?.enabled_modules ? [...baseManifest.enabled_modules] : []
  );

  // Reset working copy when tenant changes
  React.useEffect(() => {
    setLayoutModules(baseManifest?.enabled_modules ? [...baseManifest.enabled_modules] : []);
    setExported(false);
  }, [selectedRef, baseManifest]);

  const state = useMemo(() => ({
    industry: baseManifest?.industry || 'food_beverage',
    plan: baseManifest?.plan || 'orbitan_starter',
    enabled_modules: layoutModules,
    enabled_packs: baseManifest?.enabled_packs || [],
    is_virtual: baseManifest?.is_virtual || false,
  }), [baseManifest, layoutModules]);

  const score = useMemo(() => calculateBlueprintScore(state), [state]);
  const activeRules = useMemo(() => getActiveAdvisoryRules(state), [state]);
  const planViolations = useMemo(() => getPlanGatingViolations(state), [state]);
  const depViolations = useMemo(() => getDependencyViolations(layoutModules), [layoutModules]);

  const industryRules = INDUSTRY_ADVISOR_RULES[state.industry];
  const recommendedPath = industryRules?.recommended_path || [];

  const governanceGates = activeRules.filter(r => r.severity === 'governance_gate');
  const softGates = activeRules.filter(r => r.severity === 'soft_gate');

  const handleToggle = (modKey) => {
    setLayoutModules(prev => prev.includes(modKey)
      ? prev.filter(m => m !== modKey)
      : [...prev, modKey]
    );
    setExported(false);
  };

  const handleExport = async () => {
    const blueprint = {
      tenant_ref: selectedRef,
      display_name: baseManifest?.display_name,
      plan: state.plan,
      industry: state.industry,
      enabled_modules: layoutModules,
      blueprint_score: score,
      generated_at: new Date().toISOString(),
    };
    try {
      const json = JSON.stringify(blueprint, null, 2);
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard may be blocked */ }
    setExported(true);
    // Capture the edit in the audit trail
    try {
      await base44.entities.AuditLog.create({
        tenant_id: 'orbitan_platform',
        actor_id: 'platform_owner',
        actor_name: 'Firdaus',
        actor_role: 'admin',
        action_type: 'blueprint_edited',
        module: 'system',
        target_entity: 'Blueprint',
        target_record_id: selectedRef,
        new_state: blueprint,
        details: `Blueprint edited for ${baseManifest?.display_name} — score ${score}`,
        shield_outcome: 'not_evaluated',
      });
    } catch { /* non-blocking */ }
  };

  const handleReset = () => {
    setLayoutModules(baseManifest?.enabled_modules ? [...baseManifest.enabled_modules] : []);
    setExported(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-heading font-semibold text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-orbitan-blue" /> Blueprint Studio
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Design tenant blueprints with editable, drag-and-drop module layouts — live advisor feedback.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleReset}>
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </Button>
          <Button size="sm" className="gap-1.5 text-xs" onClick={handleExport}>
            {copied ? <><Check className="w-3.5 h-3.5 text-orbitan-green" /> Copied</>
              : exported ? <><Check className="w-3.5 h-3.5 text-orbitan-green" /> Exported</>
              : <><Download className="w-3.5 h-3.5" /> Export Blueprint</>}
          </Button>
        </div>
      </div>

      {/* Tenant picker + live score */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 flex-wrap">
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors text-sm min-w-[220px]"
          >
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-foreground flex-1 text-left truncate">
              {baseManifest?.display_name || 'Select tenant'}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
          {pickerOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden max-h-64 overflow-y-auto">
              {manifests.map(m => (
                <button
                  key={m.tenant_ref}
                  onClick={() => { setSelectedRef(m.tenant_ref); setPickerOpen(false); }}
                  className={cn("w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between gap-2",
                    selectedRef === m.tenant_ref && "bg-muted")}
                >
                  <span className="truncate">{m.display_name}</span>
                  <Badge variant="outline" className="text-[9px] flex-shrink-0">
                    {INDUSTRY_LABELS[m.industry]}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 flex-1 min-w-0">
          <BlueprintScoreRing score={score} size={64} />
          <div className="flex flex-wrap gap-2">
            <Stat icon={Shield} label="Governance Gates" value={governanceGates.length} color="text-orbitan-red" />
            <Stat icon={Info} label="Recommendations" value={softGates.length} color="text-orbitan-blue" />
            <Stat icon={AlertTriangle} label="Dependencies" value={depViolations.length} color="text-orbitan-amber" />
            <Stat icon={Layers} label="Plan Limits" value={planViolations.length} color="text-orbitan-purple" />
          </div>
        </div>
      </div>

      {/* Editor grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ModulePalette
          plan={state.plan}
          activeModules={layoutModules}
          recommendedPath={recommendedPath}
          onToggle={handleToggle}
        />
        <LayoutCanvas
          activeModules={layoutModules}
          onReorder={setLayoutModules}
          onRemove={(k) => handleToggle(k)}
          lockedCount={planViolations.length}
        />
      </div>

      {/* Recommended path ribbon */}
      {recommendedPath.length > 0 && (
        <div className="bg-muted/40 border border-border/60 rounded-xl p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Industry Recommended Path — {INDUSTRY_LABELS[state.industry]}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recommendedPath.map((k, i) => {
              const active = layoutModules.includes(k);
              return (
                <span key={k} className={cn(
                  "text-[10px] px-2 py-1 rounded-full flex items-center gap-1",
                  active ? "bg-orbitan-green-light text-orbitan-green font-medium" : "bg-background text-muted-foreground border border-border"
                )}>
                  {active && <Check className="w-2.5 h-2.5" />}{i + 1}. {k.replace(/_/g, ' ')}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Governance gate callouts */}
      {governanceGates.length > 0 && (
        <div className="space-y-2">
          {governanceGates.map(rule => (
            <div key={rule.id} className="flex items-start gap-2 bg-orbitan-red-light/60 border border-red-200 rounded-lg px-3 py-2.5">
              <Shield className="w-4 h-4 text-orbitan-red flex-shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">{rule.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-1.5 bg-muted/40 rounded-lg px-2.5 py-1.5">
      <Icon className={cn("w-3.5 h-3.5", color)} />
      <span className="text-sm font-bold text-foreground tabular-nums">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}