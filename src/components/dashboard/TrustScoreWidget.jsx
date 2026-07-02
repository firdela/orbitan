// ============================================================
// ORBITANOS — TrustScoreWidget
// Renders the Operational Trust Score (OTS) synthesized by the
// complianceScoreboard aggregator. Registry-driven: the pillars
// shown are whatever the tenant's ActivationRegistry manifest
// defined — this widget has zero hardcoded industry logic.
//
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Shield, ShieldCheck, ShieldAlert, ChevronRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const RISK_STYLES = {
  green: {
    bg: 'from-emerald-500 to-emerald-600',
    ring: 'ring-emerald-500/20',
    text: 'text-emerald-600',
    bar: 'bg-emerald-500',
    icon: ShieldCheck,
    label: 'Healthy',
  },
  amber: {
    bg: 'from-amber-500 to-orange-500',
    ring: 'ring-amber-500/20',
    text: 'text-amber-600',
    bar: 'bg-amber-500',
    icon: ShieldAlert,
    label: 'At Risk',
  },
  red: {
    bg: 'from-red-500 to-rose-600',
    ring: 'ring-red-500/20',
    text: 'text-red-600',
    bar: 'bg-red-500',
    icon: ShieldAlert,
    label: 'Critical',
  },
};

export default function TrustScoreWidget({ tenantId, outletId, className }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchScore = async () => {
    try {
      setRefreshing(true);
      const res = await base44.functions.invoke('complianceScoreboard', {
        tenant_id: tenantId,
        outlet_id: outletId || null,
      });
      setData(res.data);
    } catch (err) {
      console.error('[TrustScoreWidget] fetch failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (tenantId) fetchScore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, outletId]);

  if (loading || !data) {
    return (
      <div className={cn("bg-card border border-border rounded-xl p-5 h-full min-h-[280px] flex flex-col animate-pulse", className)}>
        <div className="h-4 w-24 bg-muted rounded mb-4" />
        <div className="h-20 w-20 bg-muted rounded-full mx-auto mb-4" />
        <div className="space-y-2 mt-auto">
          <div className="h-2 bg-muted rounded" />
          <div className="h-2 bg-muted rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (data.ots === null) {
    return (
      <div className={cn("bg-card border border-border rounded-xl p-5 h-full min-h-[280px] flex flex-col items-center justify-center text-center", className)}>
        <Shield className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{data.reason || 'No trust data available'}</p>
      </div>
    );
  }

  const style = RISK_STYLES[data.risk_level] || RISK_STYLES.amber;
  const RiskIcon = style.icon;
  const pillarEntries = Object.entries(data.pillars || {});

  return (
    <div className={cn("bg-card border border-border rounded-xl p-5 h-full min-h-[280px] flex flex-col card-elevated", className)}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center", style.bg)}>
            <RiskIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-sm text-foreground leading-tight">Trust Score</h3>
            <p className="text-[10px] text-muted-foreground leading-tight">{style.label}</p>
          </div>
        </div>
        <button
          onClick={fetchScore}
          disabled={refreshing}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          title="Refresh"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", refreshing && "animate-spin")} />
        </button>
      </div>

      {/* ── Score Ring ── */}
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className={style.text}
              strokeDasharray={`${(data.ots / 100) * 264} 264`}
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-display font-bold tabular-nums text-foreground">{data.ots}</span>
            <span className="text-[9px] text-muted-foreground font-medium tracking-wide">OTS</span>
          </div>
        </div>
      </div>

      {/* ── Pillar Breakdown ── */}
      <div className="space-y-2 mb-3">
        {pillarEntries.map(([key, pillar]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground w-20 truncate flex-shrink-0">
              {pillar.label || key}
            </span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", style.bar)}
                style={{ width: `${pillar.score}%` }}
              />
            </div>
            <span className="text-[10px] font-bold tabular-nums text-foreground w-7 text-right">
              {pillar.score}
            </span>
          </div>
        ))}
      </div>

      {/* ── Top Recommendation ── */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="mt-auto pt-3 border-t border-border/60">
          <Link
            to={data.recommendations[0].link}
            className="flex items-center justify-between gap-2 group"
          >
            <span className="text-[11px] text-muted-foreground line-clamp-2 flex-1">
              {data.recommendations[0].label}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </Link>
        </div>
      )}
    </div>
  );
}