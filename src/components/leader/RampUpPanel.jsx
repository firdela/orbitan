// ============================================================
// ORBITAN — RampUpPanel Component
// LeaderOrg "Ramp Up" Tab — Tenant Activation Console
// Exit-Ready: reads manifests from onboardingService backend.
// ============================================================

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PackBadgeGroup, PlanBadge } from '@/components/shared/PackBadge';
import { MODULES, INDUSTRY_LABELS } from '@/lib/orbitan-config';
import {
  Rocket, CheckCircle2, AlertTriangle, Loader2, ChevronDown, ChevronUp,
  Zap, Shield, ClipboardList, Package, Users, FileText, Play, RefreshCw,
  Building2, Activity, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PACK_COLORS = {
  fnb: '#F97316',
  recycling: '#16A34A',
  retail: '#22C55E',
};

const INDUSTRY_ICONS = {
  food_beverage: '🌮',
  recycling_sustainability: '♻️',
  retail: '👗',
};

function ActivationReport({ report }) {
  const [expanded, setExpanded] = useState(false);
  const isSuccess = report.status === 'success';
  const isPartial = report.status === 'partial';

  return (
    <div className={cn(
      "rounded-xl border p-4 text-sm mt-3 animate-fade-in",
      isSuccess ? "bg-orbitan-green-light border-green-200" :
      isPartial ? "bg-orbitan-amber-light border-amber-200" :
      "bg-orbitan-red-light border-red-200"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSuccess ? <CheckCircle2 className="w-4 h-4 text-orbitan-green" /> :
           isPartial ? <AlertTriangle className="w-4 h-4 text-orbitan-amber" /> :
           <AlertTriangle className="w-4 h-4 text-orbitan-red" />}
          <span className="font-semibold text-foreground">
            {isSuccess ? 'Activation Complete' : isPartial ? 'Partial Activation' : 'Activation Failed'}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {report.records_created.length} records seeded
          </Badge>
          {report.audit_logged && (
            <Badge className="text-[10px] bg-orbitan-blue-light text-orbitan-blue border-0">
              <Shield className="w-2.5 h-2.5 mr-1" /> Audit Logged
            </Badge>
          )}
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/60 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Records Created</p>
              {report.records_created.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs py-0.5">
                  <CheckCircle2 className="w-3 h-3 text-orbitan-green flex-shrink-0" />
                  <span className="text-foreground truncate">{r.title}</span>
                  <span className="text-muted-foreground text-[10px] ml-auto flex-shrink-0">{r.entity}</span>
                </div>
              ))}
            </div>
            {report.errors.length > 0 && (
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Errors</p>
                {report.errors.map((e, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs py-0.5">
                    <AlertTriangle className="w-3 h-3 text-orbitan-red flex-shrink-0" />
                    <span className="text-foreground truncate">{e.title || e.entity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Activated at {new Date(report.activated_at).toLocaleString('en-SG')} by {report.activated_by}
          </p>
        </div>
      )}
    </div>
  );
}

function ManifestCard({ manifest, onActivate, activating, report }) {
  const [expanded, setExpanded] = useState(false);
  const packColor = PACK_COLORS[manifest.pack] || '#2563EB';
  const icon = INDUSTRY_ICONS[manifest.industry] || '🏢';
  const totalSeeds = manifest.seed_counts.total;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header stripe */}
      <div className="h-1.5 w-full" style={{ background: packColor }} />

      <div className="p-5">
        {/* Identity */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: packColor + '15' }}>
              {icon}
            </div>
            <div>
              <h3 className="font-heading font-bold text-foreground">{manifest.display_name}</h3>
              <p className="text-xs text-muted-foreground">{INDUSTRY_LABELS[manifest.industry]}</p>
            </div>
          </div>
          <PlanBadge plan={manifest.plan} />
        </div>

        {/* Pack badges */}
        <div className="mb-4">
          <PackBadgeGroup packs={manifest.enabled_packs} size="xs" />
        </div>

        {/* Seed Data Preview */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-muted rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{manifest.seed_counts.compliance_records}</p>
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" /> Compliance Records
            </p>
          </div>
          <div className="bg-muted rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{manifest.seed_counts.tasks}</p>
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <ClipboardList className="w-3 h-3" /> Activation Tasks
            </p>
          </div>
        </div>

        {/* Expandable seed preview */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors mb-3 py-1"
        >
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Preview {totalSeeds} seed records
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {expanded && (
          <div className="mb-4 space-y-2 animate-fade-in">
            {manifest.seed_preview.ComplianceRecord?.length > 0 && (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Compliance Records
                </p>
                {manifest.seed_preview.ComplianceRecord.map((title, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs py-0.5">
                    <div className="w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                    <span className="text-foreground">{title}</span>
                  </div>
                ))}
              </div>
            )}
            {manifest.seed_preview.Task?.length > 0 && (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <ClipboardList className="w-3 h-3" /> Activation Tasks
                </p>
                {manifest.seed_preview.Task.map((title, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs py-0.5">
                    <div className="w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                    <span className="text-foreground">{title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modules */}
        <div className="flex flex-wrap gap-1 mb-4">
          {manifest.enabled_modules.slice(0, 5).map((m) => (
            <span key={m} className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
              {MODULES[m]?.name || m}
            </span>
          ))}
          {manifest.enabled_modules.length > 5 && (
            <span className="text-[10px] text-muted-foreground px-1.5 py-0.5">
              +{manifest.enabled_modules.length - 5} more
            </span>
          )}
        </div>

        {/* Activate button */}
        <Button
          onClick={() => onActivate(manifest.tenant_ref)}
          disabled={activating === manifest.tenant_ref || activating === 'all'}
          className="w-full gap-2 font-semibold"
          style={{ background: packColor }}
        >
          {activating === manifest.tenant_ref ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Activating...</>
          ) : (
            <><Play className="w-4 h-4" /> Activate {manifest.display_name}</>
          )}
        </Button>
      </div>

      {/* Activation Report */}
      {report && (
        <div className="px-5 pb-5">
          <ActivationReport report={report} />
        </div>
      )}
    </div>
  );
}

export default function RampUpPanel() {
  const [manifests, setManifests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(null); // tenant_ref | 'all' | null
  const [reports, setReports] = useState({}); // { tenant_ref: report }
  const [error, setError] = useState(null);

  useEffect(() => { loadManifests(); }, []);

  const loadManifests = async () => {
    setLoading(true);
    setError(null);
    const res = await base44.functions.invoke('onboardingService', { action: 'get_manifests' });
    setManifests(res.data.manifests || []);
    setLoading(false);
  };

  const handleActivate = async (tenantRef) => {
    setActivating(tenantRef);
    const res = await base44.functions.invoke('onboardingService', {
      action: 'activate_tenant',
      tenant_ref: tenantRef,
    });
    setReports(prev => ({ ...prev, [tenantRef]: res.data.report }));
    setActivating(null);
  };

  const handleActivateAll = async () => {
    setActivating('all');
    const res = await base44.functions.invoke('onboardingService', { action: 'activate_all' });
    const newReports = {};
    (res.data.reports || []).forEach(r => { newReports[r.tenant_ref] = r; });
    setReports(newReports);
    setActivating(null);
  };

  const totalSeeds = manifests.reduce((acc, m) => acc + m.seed_counts.total, 0);
  const completedCount = Object.values(reports).filter(r => r.status === 'success').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 rounded-xl orbitan-gradient flex items-center justify-center">
          <Rocket className="w-5 h-5 text-white" />
        </div>
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading activation manifests...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Rocket className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-lg">Operational Ramp Up</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Activate each launch tenant by executing its Pack Activation Manifest — seeds compliance records, tasks, and writes a full audit trace.
          </p>
        </div>
        <Button
          onClick={handleActivateAll}
          disabled={activating !== null}
          className="gap-2 orbitan-gradient text-white font-semibold flex-shrink-0"
        >
          {activating === 'all' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Activating All...</>
          ) : (
            <><Zap className="w-4 h-4" /> Activate All Tenants</>
          )}
        </Button>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{manifests.length}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <Building2 className="w-3 h-3" /> Tenants
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalSeeds}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <Package className="w-3 h-3" /> Total Seed Records
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-orbitan-green">{completedCount}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Activated
          </p>
        </div>
      </div>

      {/* Architecture Notice */}
      <div className="bg-muted rounded-xl p-4 mb-6 flex items-start gap-3">
        <Shield className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Exit-Ready Architecture:</span>{' '}
          Each activation reads from a standardised JSON manifest in{' '}
          <code className="bg-card px-1.5 py-0.5 rounded font-mono text-foreground">functions/onboardingService.js</code>.
          The engine executes: <strong>Validate → Seed → Audit</strong>. Every action is written to the{' '}
          <code className="bg-card px-1.5 py-0.5 rounded font-mono text-foreground">AuditLog</code> entity.
          To port: export manifests as JSON, reimplement the loop in your target stack.
        </div>
      </div>

      {/* Manifest Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {manifests.map((manifest) => (
          <ManifestCard
            key={manifest.tenant_ref}
            manifest={manifest}
            onActivate={handleActivate}
            activating={activating}
            report={reports[manifest.tenant_ref]}
          />
        ))}
      </div>
    </div>
  );
}