import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, Bell, ChevronRight, RefreshCw, CheckCircle2 } from 'lucide-react';

/**
 * NexusDailyBrief — compact "manage-by-exception" panel.
 * Surfaces prioritised, evidence-based items from the customerSuccess
 * overview payload (recommendations + at-risk tenants + renewals).
 * No autonomous actions — human approval required for all next steps.
 *
 * Data source: base44.functions.invoke('customerSuccess', { action: 'overview' })
 * Returns: { rollup, customers, recommendations }
 */

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', classes: 'bg-red-50 text-orbitan-red-700 border-red-200', icon: AlertTriangle },
  high:     { label: 'High',     classes: 'bg-orange-50 text-orange-700 border-orange-200', icon: Clock },
  medium:   { label: 'Medium',   classes: 'bg-amber-50 text-orbitan-amber-700 border-amber-200', icon: Bell },
  low:      { label: 'Low',      classes: 'bg-blue-50 text-orbitan-blue-700 border-blue-200', icon: Bell },
};

const TYPE_DESTINATION = {
  follow_up: '/platform/customer-success',
  low_adoption: '/platform/customer-success',
  compliance_risk: '/platform/pilot-readiness',
  escalation: '/platform/exception-centre',
  ai_usage: '/platform/customer-success',
  upsell: '/platform/customer-success',
  training: '/platform/customer-success',
  renewal: '/platform/customer-success',
};

export default function NexusDailyBrief({ data, loading, error }) {
  const items = useMemo(() => {
    if (!data) return [];
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...(data.recommendations || [])].sort(
      (a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9)
    );

    const result = sorted.slice(0, 6).map((r) => ({
      id: r.key,
      priority: r.severity,
      title: r.title,
      detail: r.detail,
      tenant: r.tenant_name,
      destination: TYPE_DESTINATION[r.type] || '/platform/customer-success',
    }));

    // Fallback: if no recommendations, surface at-risk tenants directly
    if (result.length === 0) {
      const atRisk = (data.customers || []).filter(
        (c) => c.health_tier === 'at_risk' || c.health_tier === 'critical'
      );
      for (const c of atRisk.slice(0, 3)) {
        result.push({
          id: `ar-${c.tenant_id}`,
          priority: c.health_tier === 'critical' ? 'critical' : 'high',
          title: `${c.name} — Health ${c.health}/100`,
          detail: `Adoption: ${c.adoption?.modules_used || 0}/8 modules active.`,
          tenant: c.name,
          destination: '/platform/customer-success',
        });
      }
    }
    return result;
  }, [data]);

  return (
    <section
      className="bg-card border border-border rounded-xl"
      aria-label="Orbit Nexus Daily Brief"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orbitan-blue-light flex items-center justify-center">
            <Bell className="w-4 h-4 text-orbitan-blue" />
          </div>
          <h3 className="font-heading font-semibold text-sm text-foreground">Orbit Nexus Daily Brief</h3>
        </div>
        <span className="text-[10px] text-muted-foreground hidden sm:inline">
          Evidence-based · No auto-actions
        </span>
      </div>

      {/* Body */}
      <div className="p-2">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground" role="status" aria-live="polite">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading brief…</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-4 px-3 text-xs text-orbitan-red-700 bg-red-50 rounded-lg" role="alert">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Brief unavailable: {error}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-2 py-4 px-3 text-xs text-muted-foreground bg-muted rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-orbitan-green flex-shrink-0" />
            <span>All clear — no priority items today.</span>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {items.map((item) => {
              const config = SEVERITY_CONFIG[item.priority] || SEVERITY_CONFIG.medium;
              const Icon = config.icon;
              return (
                <li key={item.id}>
                  <Link
                    to={item.destination}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 border', config.classes)}>
                      <Icon className="w-3 h-3" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{item.detail}</p>
                    </div>
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 border', config.classes)}>
                      {config.label}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors flex-shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}