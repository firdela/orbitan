// ============================================================
// ORBITAN — Blueprint Studio: Module Palette
// Lists all platform modules with toggle + plan-gating indicators.
// Exit-Ready: pure presentational layer over registry data.
// ============================================================

import React from 'react';
import { MODULES } from '@/lib/orbitan-config';
import { PLAN_GATING_RULES } from '@/lib/onboarding/blueprint-registry';
import { cn } from '@/lib/utils';
import { Lock, CheckCircle2, Circle, Zap } from 'lucide-react';

export default function ModulePalette({ plan, activeModules, recommendedPath, onToggle }) {
  const tier = PLAN_GATING_RULES.module_tiers[plan];
  const lockedMap = tier?.locked || {};
  const allowedAll = tier?.allowed?.includes('all');

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Module Library</h4>
        <p className="text-[10px] text-muted-foreground mt-0.5">Toggle to add · locked modules require a higher plan</p>
      </div>
      <div className="divide-y divide-border/40 max-h-[420px] overflow-y-auto">
        {Object.values(MODULES).map(mod => {
          const isActive = activeModules.includes(mod.key);
          const isLocked = !allowedAll && !!lockedMap[mod.key];
          const recIdx = recommendedPath?.indexOf(mod.key);
          const isRecommended = recIdx !== -1 && recIdx !== undefined;

          return (
            <div
              key={mod.key}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 transition-colors",
                isActive ? "bg-orbitan-blue-light/40" : "hover:bg-muted/30",
                isLocked && "opacity-55"
              )}
            >
              <button
                onClick={() => !isLocked && onToggle(mod.key)}
                disabled={isLocked}
                className="flex-shrink-0"
                title={isLocked ? lockedMap[mod.key]?.message : undefined}
              >
                {isActive
                  ? <CheckCircle2 className="w-4 h-4 text-orbitan-blue" />
                  : isLocked
                  ? <Lock className="w-4 h-4 text-muted-foreground" />
                  : <Circle className="w-4 h-4 text-muted-foreground/50" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-foreground truncate">{mod.name}</p>
                  {isRecommended && (
                    <span className="text-[9px] bg-orbitan-amber-light text-orbitan-amber px-1.5 rounded-full font-bold flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5" />{recIdx + 1}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{mod.description}</p>
                {isLocked && (
                  <p className="text-[9px] text-orbitan-purple mt-0.5 truncate">{lockedMap[mod.key]?.message}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}