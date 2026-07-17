import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/shared/StatCard';
import { Loader2 } from 'lucide-react';

/**
 * RegistryMetrics — renders KPIs dynamically from the MetricDefinition
 * registry (ADR-0033) via the metricsEngine backend function.
 *
 * Each metric config drives a StatCard with:
 *  - Registry-sourced display name + description (contextual help)
 *  - Standardised value formatting per unit
 *  - Drill-down navigation to the relevant module page (Golden UI/UX)
 *
 * This replaces inline dashboard calculations with a single source of
 * truth — dashboards never recompute KPIs locally.
 */
const UNIT_FORMATTERS = {
  currency: (v) => `S$${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
  percentage: (v) => `${(v || 0).toFixed(1)}%`,
  count: (v) => `${v || 0}`,
  ratio: (v) => `${(v || 0).toFixed(2)}`,
  hours: (v) => `${(v || 0).toFixed(1)}h`,
  days: (v) => `${(v || 0).toFixed(1)}d`,
  none: (v) => `${v || 0}`,
};

export default function RegistryMetrics({ metrics = [], outletId }) {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all(
      metrics.map((m) =>
        base44.functions
          .invoke('metricsEngine', { metric_key: m.metric_key, outlet_id: outletId })
          .then((res) => ({ metric_key: m.metric_key, data: res.data || res }))
          .catch((err) => ({ metric_key: m.metric_key, error: err?.message || 'Failed' }))
      )
    )
      .then((responses) => {
        if (!active) return;
        const map = {};
        responses.forEach((r) => { map[r.metric_key] = r; });
        setResults(map);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [metrics.map((m) => m.metric_key).join(','), outletId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2.5">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Computing registry metrics…</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {metrics.map((m) => {
        const res = results[m.metric_key];
        const data = res?.data;
        const value = data ? (UNIT_FORMATTERS[data.unit] || UNIT_FORMATTERS.none)(data.value) : '—';
        const subtitle = data ? `${data.record_count} records · v${data.formula_version}` : 'Unavailable';
        return (
          <StatCard
            key={m.metric_key}
            title={data?.display_name || m.fallbackTitle || m.metric_key}
            value={value}
            subtitle={subtitle}
            icon={m.icon}
            color={m.color || 'blue'}
            to={m.drillTo}
            help={
              data?.description
                ? { title: data.display_name, content: data.description, tips: m.tips }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}