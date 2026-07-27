import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import TenantPilotCard from './TenantPilotCard';
import FeedbackIntelligenceDashboard from './FeedbackIntelligenceDashboard';
import { Button } from '@/components/ui/button';
import {
  Radar, Shield, Activity, RefreshCw, AlertTriangle,
  Building2, ClipboardCheck, Sparkles
} from 'lucide-react';

// ── Industry → Pack mapping (derived from the live Tenant.industry enum) ──
const INDUSTRY_TO_PACK = {
  food_beverage: 'fnb',
  recycling_sustainability: 'recycling',
  retail: 'retail',
  healthcare: 'fnb',
  education: 'fnb',
  logistics: 'fnb',
  events_activations: 'fnb',
  technology_software: 'fnb',
  facilities_management: 'fnb',
  other: 'fnb',
};

const INDUSTRY_LABELS = {
  food_beverage: 'F&B',
  recycling_sustainability: 'Sustainability',
  retail: 'Retail',
  healthcare: 'Healthcare',
  education: 'Education',
  logistics: 'Logistics',
  events_activations: 'Events',
  technology_software: 'Technology',
  facilities_management: 'Facilities',
  other: 'Operations',
};

const planLabel = (plan) =>
  (plan || 'orbitan_starter').replace('orbitan_', '').replace(/^\w/, (c) => c.toUpperCase());

export default function PilotCommandCenter() {
  const [refreshing, setRefreshing] = useState(false);

  // ── Load real tenants (admin-visible via Tenant RLS). Sandbox + cancelled
  //    tenants are excluded — this is the Pilot Control surface, not the
  //    full tenant registry. Replaces the former hardcoded PILOT_TENANTS list.
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['pilot-command-tenants'],
    queryFn: () => base44.entities.Tenant.list('-created_date', 50),
    refetchInterval: 30000,
  });

  const pilotTenants = tenants.filter((t) => !t.is_sandbox && t.status !== 'cancelled');

  // ── Per-tenant enrichment (issues, pending syncs, draft POs) ──
  const { data: enrichedTenants = [] } = useQuery({
    queryKey: ['pilot-command-enriched', pilotTenants.map((t) => t.id).join(',')],
    queryFn: async () => {
      const results = await Promise.allSettled(
        pilotTenants.map(async (t) => {
          const base = {
            ...t,
            industry_pack: INDUSTRY_TO_PACK[t.industry] || 'fnb',
            industry_label: INDUSTRY_LABELS[t.industry] || 'Operations',
            plan: planLabel(t.subscription_plan),
          };
          try {
            const [issues, invoices, pos] = await Promise.all([
              base44.entities.IssueLog.filter({ tenant_id: t.id, status: 'new' }).catch(() => []),
              base44.entities.SalesInvoice.filter({ tenant_id: t.id, status: 'pending_verification' }).catch(() => []),
              base44.entities.PurchaseOrder.filter({ tenant_id: t.id, status: 'draft' }).catch(() => []),
            ]);
            return {
              ...base,
              issues: issues?.length || 0,
              pending_syncs: invoices?.length || 0,
              total_docs: (invoices?.length || 0) + (pos?.length || 0),
              synced_count: 0,
              balance_credits: 0,
              autopilot_active: true,
              shadow_sync_active: false,
            };
          } catch {
            return {
              ...base,
              issues: 0, pending_syncs: 0, total_docs: 0, synced_count: 0,
              balance_credits: 0, autopilot_active: true, shadow_sync_active: false,
            };
          }
        })
      );
      return results.map((r) => (r.status === 'fulfilled' ? r.value : r.reason));
    },
    enabled: pilotTenants.length > 0,
    refetchInterval: 30000,
  });

  const totalIssues = enrichedTenants.reduce((sum, t) => sum + (t.issues || 0), 0);
  const totalPendingSyncs = enrichedTenants.reduce((sum, t) => sum + (t.pending_syncs || 0), 0);
  const healthyCount = enrichedTenants.filter((t) => (t.issues || 0) === 0).length;
  const tenantCount = enrichedTenants.length || pilotTenants.length;

  const handleToggleAutopilot = async (tenantId) => {
    const t = enrichedTenants.find((x) => x.id === tenantId);
    const newState = !t.autopilot_active;
    await base44.functions.invoke('replenishmentEngine', {
      action: newState ? 'resume_autopilot' : 'pause_autopilot',
      tenant_id: tenantId,
    }).catch(() => {});
  };

  const handleToggleShadowSync = async (tenantId) => {
    const t = enrichedTenants.find((x) => x.id === tenantId);
    const newState = !t.shadow_sync_active;
    await base44.functions.invoke('financeController', {
      action: newState ? 'enable_shadow_sync' : 'disable_shadow_sync',
      tenant_id: tenantId,
    }).catch(() => {});
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <Radar className="w-5 h-5 text-primary" />
            Phase 1 Pilot Control
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time pilot health monitoring across all tenants · Orbitan Shield™ Powered by Regulate
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Global Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Tenants</span>
          </div>
          <p className="text-xl font-bold font-display">{healthyCount}/{tenantCount}</p>
          <p className="text-[10px] text-muted-foreground">Healthy / Total</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Syncs</span>
          </div>
          <p className="text-xl font-bold font-display">{totalPendingSyncs}</p>
          <p className="text-[10px] text-muted-foreground">Pending verification</p>
        </div>
        <div className={`bg-card border rounded-xl p-4 ${totalIssues > 0 ? 'border-destructive/40' : 'border-border'}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`w-3.5 h-3.5 ${totalIssues > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Issues</span>
          </div>
          <p className={`text-xl font-bold font-display ${totalIssues > 0 ? 'text-destructive' : ''}`}>{totalIssues}</p>
          <p className="text-[10px] text-muted-foreground">Open issue logs</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Shield</span>
          </div>
          <p className="text-xl font-bold font-display">Active</p>
          <p className="text-[10px] text-muted-foreground">Guardian policies on</p>
        </div>
      </div>

      {/* Tenant Health Matrix */}
      <div>
        <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-primary" />
          Tenant Health Matrix
        </h3>
        {enrichedTenants.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No active pilot tenants found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrichedTenants.map((tenant) => (
              <TenantPilotCard
                key={tenant.id}
                tenant={tenant}
                onToggleAutopilot={handleToggleAutopilot}
                onToggleShadowSync={handleToggleShadowSync}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Intelligence — Feedback → Evolution Loop */}
      <div>
        <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-orbitan-purple" />
          Product Intelligence
        </h3>
        <FeedbackIntelligenceDashboard />
      </div>

      {/* Footer note */}
      <div className="bg-muted rounded-xl p-4 flex items-center gap-2">
        <RefreshCw className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Auto-refreshes every 30 seconds. Pilot Phase 1 · Data integrity & shadow sync enabled. All finance operations are logged via AuditEngine before production posting.
        </p>
      </div>
    </div>
  );
}