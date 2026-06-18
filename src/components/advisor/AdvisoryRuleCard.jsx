// ============================================================
// ORBITAN — AdvisoryRuleCard Component
// Renders a single advisory rule (soft-gate or governance gate).
// Exit-Ready: pure UI, consumes rule data from blueprint-registry.
// ============================================================

import React from 'react';
import { cn } from '@/lib/utils';
import { Shield, Info, AlertTriangle, ChevronRight } from 'lucide-react';

const SEVERITY_CONFIG = {
  soft_gate: {
    icon: Info,
    bg: 'bg-orbitan-blue-light',
    border: 'border-blue-200',
    text: 'text-orbitan-blue',
    label: 'Recommendation',
  },
  governance_gate: {
    icon: Shield,
    bg: 'bg-orbitan-red-light',
    border: 'border-red-200',
    text: 'text-orbitan-red',
    label: 'Governance Gate',
  },
};

const PRINCIPLE_COLORS = {
  regulate: '#DC2626',
  refine: '#7C3AED',
  respond: '#F97316',
  relate: '#2563EB',
  renew: '#16A34A',
  reach: '#0F172A',
};

export default function AdvisoryRuleCard({ rule, compact = false }) {
  const config = SEVERITY_CONFIG[rule.severity] || SEVERITY_CONFIG.soft_gate;
  const Icon = config.icon;
  const principleColor = PRINCIPLE_COLORS[rule.principle] || '#6B7280';

  if (compact) {
    return (
      <div className={cn(
        "flex items-start gap-2 px-2 py-1.5 rounded-md text-xs",
        config.bg, config.border, "border"
      )}>
        <Icon className={cn("w-3.5 h-3.5 mt-0.5 flex-shrink-0", config.text)} />
        <div className="flex-1 min-w-0">
          <p className="text-foreground leading-relaxed">{rule.message}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{config.label}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span className="text-[10px] text-muted-foreground capitalize">{rule.principle}</span>
          </div>
        </div>
        <div
          className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
          style={{ background: principleColor }}
        />
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border p-4 text-sm transition-all hover:shadow-sm",
      config.bg, config.border
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          config.bg
        )}>
          <Icon className={cn("w-4 h-4", config.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-xs font-semibold", config.text)}>
              {config.label}
            </span>
            <span className="text-[10px] text-muted-foreground capitalize">
              {rule.principle} principle
            </span>
            {rule.category && (
              <span className="text-[10px] bg-white/60 px-1.5 py-0.5 rounded-full text-muted-foreground">
                {rule.category}
              </span>
            )}
          </div>
          <p className="text-foreground leading-relaxed text-xs">{rule.message}</p>
          {rule.blocking && (
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-orbitan-red font-medium">
              <AlertTriangle className="w-3 h-3" />
              Requires tenant admin override
            </div>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-2" />
      </div>
    </div>
  );
}