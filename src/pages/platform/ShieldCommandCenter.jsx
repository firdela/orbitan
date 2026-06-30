import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppShell from '@/components/layout/AppShell';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Plus, ToggleLeft, ToggleRight, Activity, Lock, Eye, Zap, AlertTriangle, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import OverrideReviewQueue from '@/components/shield/OverrideReviewQueue';

const SHIELD_NAV = [
  { href: '/platform/shield', label: 'Shield Command Center', icon: Shield },
  { href: '/platform/wallet', label: 'Orbitan Wallet', icon: Zap },
  { href: '/platform/marketplace', label: 'Marketplace', icon: Activity },
  { type: 'section', label: 'Platform' },
  { href: '/leader-org', label: 'Platform Console', icon: Eye },
];

const EFFECT_CONFIG = {
  block: { label: 'Block', icon: Lock, classes: 'bg-red-50 text-red-700 border-red-100' },
  notify: { label: 'Notify', icon: Eye, classes: 'bg-blue-50 text-blue-700 border-blue-100' },
  auto_remediate: { label: 'Auto-Remediate', icon: Zap, classes: 'bg-amber-50 text-amber-700 border-amber-100' }
};

const SEVERITY_CONFIG = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700'
};

const SHIELD_MODE_CONFIG = {
  auditor: { label: 'Auditor', classes: 'bg-blue-50 text-blue-700 border-blue-100', icon: Eye },
  guardian: { label: 'Guardian', classes: 'bg-yellow-50 text-yellow-700 border-yellow-100', icon: Lock }
};

const PLATFORM_TENANT_ID = 'orbitan_platform';

const DEFAULT_POLICIES = [
  { policy_name: 'no_audit_log_deletion', target_entity: 'AuditLog', trigger_action: 'delete', effect: 'block', shield_mode: 'guardian', severity: 'critical', description: 'Prevents deletion of immutable audit trail records', principle: 'regulate' },
  { policy_name: 'finance_high_value_gate', target_entity: 'FinanceSyncQueue', trigger_action: 'create', effect: 'notify', shield_mode: 'auditor', severity: 'high', description: 'Flags finance sync entries above threshold for review', principle: 'regulate', condition_json: { amount_gt: 5000 } },
  { policy_name: 'clock_record_tamper_alert', target_entity: 'ClockRecord', trigger_action: 'delete', effect: 'notify', shield_mode: 'auditor', severity: 'high', description: 'Alerts admin when clock records are deleted', principle: 'regulate' },
  { policy_name: 'compliance_rejection_escalation', target_entity: 'ComplianceRecord', trigger_action: 'update', effect: 'notify', shield_mode: 'auditor', severity: 'medium', description: 'Notifies tenant admin when compliance is rejected', principle: 'regulate', condition_json: { field: 'status', value: 'rejected' } },
  { policy_name: 'payroll_lock_enforcement', target_entity: 'ClockRecord', trigger_action: 'update', effect: 'block', shield_mode: 'guardian', severity: 'critical', description: 'Blocks edits to payroll-locked clock records', principle: 'regulate', condition_json: { field: 'payroll_locked', value: true } },
];

export default function ShieldCommandCenter() {
  const queryClient = useQueryClient();
  const [showAddPolicy, setShowAddPolicy] = useState(false);
  const [newPolicy, setNewPolicy] = useState({ policy_name: '', target_entity: '', effect: 'notify', shield_mode: 'auditor', severity: 'medium', description: '', principle: 'regulate' });

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['governance_policies'],
    queryFn: () => base44.entities.GovernancePolicy.list('-created_date', 100),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['shield_audit_logs'],
    queryFn: () => base44.entities.AuditLog.filter({ action_type: { $regex: 'shield_' } }, '-created_date', 20),
  });

  const createPolicy = useMutation({
    mutationFn: (data) => base44.entities.GovernancePolicy.create({ ...data, tenant_id: PLATFORM_TENANT_ID }),
    onSuccess: () => { queryClient.invalidateQueries(['governance_policies']); setShowAddPolicy(false); }
  });

  const togglePolicy = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.GovernancePolicy.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries(['governance_policies'])
  });

  const deletePolicy = useMutation({
    mutationFn: (id) => base44.entities.GovernancePolicy.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['governance_policies'])
  });

  const seedPolicies = useMutation({
    mutationFn: async () => {
      // Seed as platform-wide policies (tenant_id = 'orbitan_platform')
      const existing = await base44.entities.GovernancePolicy.list('', 200);
      const platformPolicies = existing.filter(p => p.tenant_id === PLATFORM_TENANT_ID);
      if (platformPolicies.length > 0) return; // Already seeded
      for (const p of DEFAULT_POLICIES) {
        await base44.entities.GovernancePolicy.create({ ...p, tenant_id: PLATFORM_TENANT_ID, is_active: true });
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['governance_policies'])
  });

  // Compute Shield metrics
  const activePolicies = policies.filter(p => p.is_active);
  const blockPolicies = activePolicies.filter(p => p.effect === 'block');
  const guardianPolicies = activePolicies.filter(p => p.shield_mode === 'guardian');
  const totalViolations = policies.reduce((sum, p) => sum + (p.violations_count || 0), 0);
  const integrityScore = policies.length === 0 ? 100 : Math.max(0, Math.min(100, 100 - (totalViolations * 2)));

  const shieldStatus = integrityScore >= 90 ? 'green' : integrityScore >= 70 ? 'amber' : 'red';

  const statusMap = {
    green: { label: 'All Systems Governed', icon: ShieldCheck, color: 'text-[#2563EB]', bg: 'from-blue-600 to-blue-800' },
    amber: { label: 'Compliance Alert Active', icon: ShieldAlert, color: 'text-amber-600', bg: 'from-amber-500 to-amber-700' },
    red: { label: 'Integrity Failure Detected', icon: ShieldX, color: 'text-red-600', bg: 'from-red-600 to-red-800' }
  };
  const StatusIcon = statusMap[shieldStatus].icon;

  return (
    <AppShell
      navigation={SHIELD_NAV}
      title="Orbitan Shield™"
      headerRight={
        <div className="flex items-center gap-2">
          <Badge className="bg-[#111827] text-[#D4AF37] border-0 text-xs font-bold px-3">Enterprise</Badge>
          <Button size="sm" onClick={() => setShowAddPolicy(true)} className="gap-1.5 bg-[#2563EB] hover:bg-blue-700">
            <Plus className="w-3.5 h-3.5" /> New Policy
          </Button>
        </div>
      }
    >
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

        {/* Hero Shield Status Banner */}
        <div className={cn('rounded-2xl p-6 bg-gradient-to-br text-white relative overflow-hidden', statusMap[shieldStatus].bg)}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white transform translate-x-16 -translate-y-16" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white transform -translate-x-12 translate-y-12" />
          </div>
          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/15 backdrop-blur-sm">
                <StatusIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">Orbitan Shield™ · Powered by Regulate</p>
                <h2 className="text-xl font-display font-bold text-white">{statusMap[shieldStatus].label}</h2>
                <p className="text-sm text-white/70 mt-1">
                  {activePolicies.length} active policies · {blockPolicies.length} hard blocks · {guardianPolicies.length} Guardian-mode rules
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-white/60 mb-1">Integrity Score</p>
              <p className="text-5xl font-display font-bold text-white tabular-nums">{integrityScore}<span className="text-2xl text-white/70">%</span></p>
            </div>
          </div>

          {/* Score bar */}
          <div className="relative mt-4">
            <div className="h-1.5 rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${integrityScore}%` }} />
            </div>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Policies', value: activePolicies.length, icon: Shield, color: 'text-[#2563EB]', bg: 'bg-blue-50' },
            { label: 'Hard Blocks', value: blockPolicies.length, icon: Lock, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Guardian Rules', value: guardianPolicies.length, icon: ShieldCheck, color: 'text-[#D4AF37]', bg: 'bg-yellow-50' },
            { label: 'Total Violations', value: totalViolations, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl p-4 border border-border/60 card-elevated">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', kpi.bg)}>
                <kpi.icon className={cn('w-4 h-4', kpi.color)} />
              </div>
              <p className="text-2xl font-display font-bold text-foreground tabular-nums">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Audit Vault — Override Review Queue */}
        <OverrideReviewQueue />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Policy Registry */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-border/60 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#2563EB]" />
                <h3 className="font-heading font-semibold text-sm text-foreground">Policy Registry</h3>
                <Badge variant="outline" className="text-[10px] tabular-nums">{policies.length}</Badge>
              </div>
              {policies.length === 0 && (
                <Button size="sm" variant="outline" onClick={() => seedPolicies.mutate()} disabled={seedPolicies.isPending} className="text-xs">
                  {seedPolicies.isPending ? 'Seeding...' : 'Seed Default Policies'}
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading policies...</div>
            ) : policies.length === 0 ? (
              <div className="p-8 text-center">
                <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No policies defined yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Seed defaults or create your first policy</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {policies.map(policy => {
                  const effectConf = EFFECT_CONFIG[policy.effect] || EFFECT_CONFIG.notify;
                  const EffectIcon = effectConf.icon;
                  const modeConf = SHIELD_MODE_CONFIG[policy.shield_mode] || SHIELD_MODE_CONFIG.auditor;

                  return (
                    <div key={policy.id} className={cn('flex items-start gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors', !policy.is_active && 'opacity-40')}>
                      <div className={cn('flex items-center justify-center w-7 h-7 rounded-lg border flex-shrink-0 mt-0.5', effectConf.classes)}>
                        <EffectIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground truncate font-mono">{policy.policy_name}</p>
                          <span className={cn('text-[10px] border rounded-full px-1.5 py-0.5 font-bold uppercase tracking-wide', effectConf.classes)}>{effectConf.label}</span>
                          <span className={cn('text-[10px] border rounded-full px-1.5 py-0.5 font-bold uppercase tracking-wide', modeConf.classes)}>{modeConf.label}</span>
                          <span className={cn('text-[10px] rounded-full px-1.5 py-0.5 font-bold uppercase', SEVERITY_CONFIG[policy.severity])}>{policy.severity}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{policy.description || `Target: ${policy.target_entity} · ${policy.trigger_action}`}</p>
                        {policy.violations_count > 0 && (
                          <p className="text-[10px] text-amber-600 mt-0.5 tabular-nums">{policy.violations_count} violations · Last: {policy.last_triggered_at ? format(new Date(policy.last_triggered_at), 'dd MMM HH:mm') : '—'}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => togglePolicy.mutate({ id: policy.id, is_active: !policy.is_active })}
                          className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
                          title={policy.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {policy.is_active ? <ToggleRight className="w-4 h-4 text-[#2563EB]" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => deletePolicy.mutate(policy.id)}
                          className="p-1 hover:bg-red-50 rounded transition-colors text-muted-foreground hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Shield Activity Log */}
          <div className="bg-white rounded-xl border border-border/60 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-border/60 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#2563EB]" />
              <h3 className="font-heading font-semibold text-sm text-foreground">Shield Activity</h3>
            </div>
            <div className="divide-y divide-border/30 max-h-[480px] overflow-y-auto">
              {auditLogs.length === 0 ? (
                <div className="p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-[#2563EB]/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No shield events yet</p>
                </div>
              ) : auditLogs.map(log => {
                const isBlock = log.action_type === 'shield_block';
                const isRemediate = log.action_type === 'shield_auto_remediate';

                return (
                  <div key={log.id} className="px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start gap-2">
                      <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', isBlock ? 'bg-red-500' : isRemediate ? 'bg-amber-500' : 'bg-[#2563EB]')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{log.details}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="w-2.5 h-2.5 text-muted-foreground/50" />
                          <span className="text-[10px] text-muted-foreground">{format(new Date(log.created_date), 'dd MMM HH:mm')}</span>
                          <span className="text-[10px] text-muted-foreground truncate">· {log.actor_name || log.actor_id}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add Policy Dialog */}
      <Dialog open={showAddPolicy} onOpenChange={setShowAddPolicy}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#2563EB]" />
              New Governance Policy
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Policy Name (no spaces)</label>
                <Input placeholder="e.g. no_audit_log_deletion" value={newPolicy.policy_name} onChange={e => setNewPolicy(p => ({ ...p, policy_name: e.target.value.replace(/\s/g, '_') }))} className="font-mono text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Target Entity</label>
                <Input placeholder="e.g. AuditLog" value={newPolicy.target_entity} onChange={e => setNewPolicy(p => ({ ...p, target_entity: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Effect</label>
                <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={newPolicy.effect} onChange={e => setNewPolicy(p => ({ ...p, effect: e.target.value }))}>
                  <option value="notify">Notify (Auditor)</option>
                  <option value="block">Block (Guardian)</option>
                  <option value="auto_remediate">Auto-Remediate</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Shield Mode</label>
                <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={newPolicy.shield_mode} onChange={e => setNewPolicy(p => ({ ...p, shield_mode: e.target.value }))}>
                  <option value="auditor">Auditor (Starter/Growth)</option>
                  <option value="guardian">Guardian (Enterprise)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Severity</label>
                <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={newPolicy.severity} onChange={e => setNewPolicy(p => ({ ...p, severity: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Input placeholder="What does this policy enforce?" value={newPolicy.description} onChange={e => setNewPolicy(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddPolicy(false)}>Cancel</Button>
              <Button size="sm" onClick={() => createPolicy.mutate(newPolicy)} disabled={!newPolicy.policy_name || !newPolicy.target_entity || createPolicy.isPending} className="bg-[#2563EB] hover:bg-blue-700">
                {createPolicy.isPending ? 'Creating...' : 'Create Policy'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}