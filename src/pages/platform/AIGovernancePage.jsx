import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Shield, Bot, Cpu, FileCheck, Activity, AlertTriangle, CheckCircle2, XCircle, Zap, Clock, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import OrbitanLoader from '@/components/brand/OrbitanLoader';
import PageHeader from '@/components/shared/PageHeader';
import BackBar from '@/components/shared/BackBar';
import EmptyState from '@/components/shared/EmptyState';
import AIApprovalQueue from '@/components/platform/AIApprovalQueue';
import { getConfiguredProviders, PROVIDER_REGISTRY } from '@/lib/ai/ai-provider-adapter';
import { AUTONOMY_LEVELS } from '@/lib/ai/ai-autonomy-levels';

const LIFECYCLE_VARIANT = {
  approved: 'default',
  draft: 'secondary',
  evaluation: 'secondary',
  restricted: 'outline',
  deprecated: 'destructive',
  retired: 'destructive',
};

function StatusBadge({ status }) {
  const variant = LIFECYCLE_VARIANT[status] || 'secondary';
  return <Badge variant={variant} className="text-xs capitalize">{status}</Badge>;
}

function ModelsSection() {
  const { data: models, isLoading } = useQuery({
    queryKey: ['ai-models'],
    queryFn: async () => {
      const result = await base44.entities.AIModel.list('-created_date', 50);
      return result || [];
    },
  });

  if (isLoading) return <OrbitanLoader size="md" message="Loading models..." />;
  if (!models || models.length === 0) {
    return <EmptyState icon={Cpu} title="No AI models registered" description="Register models to enable lifecycle enforcement." />;
  }

  return (
    <div className="grid gap-3">
      {models.map((model) => (
        <Card key={model.id} className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Cpu className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-sm truncate">{model.display_name}</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{model.model_key}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="text-xs capitalize">{model.provider}</Badge>
                  <StatusBadge status={model.lifecycle_status} />
                  {model.is_active ? (
                    <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {model.cost_config?.credit_multiplier && (
                  <p className="text-xs text-muted-foreground">×{model.cost_config.credit_multiplier} credits</p>
                )}
                {model.context_window_tokens && (
                  <p className="text-xs text-muted-foreground mt-1">{model.context_window_tokens.toLocaleString()} ctx</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AgentsSection() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: async () => {
      const result = await base44.entities.AIAgent.list('-created_date', 50);
      return result || [];
    },
  });

  if (isLoading) return <OrbitanLoader size="md" message="Loading agents..." />;
  if (!agents || agents.length === 0) {
    return <EmptyState icon={Bot} title="No AI agents registered" description="Register agents to enable identity governance." />;
  }

  return (
    <div className="grid gap-3">
      {agents.map((agent) => (
        <Card key={agent.id} className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-sm truncate">{agent.name}</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{agent.agent_id}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{agent.purpose}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <StatusBadge status={agent.lifecycle_status} />
                  <Badge variant="outline" className="text-xs">
                    {AUTONOMY_LEVELS[agent.autonomy_level]?.label || agent.autonomy_level}
                  </Badge>
                  {agent.is_active ? (
                    <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PoliciesSection() {
  const { data: policies, isLoading } = useQuery({
    queryKey: ['ai-policies'],
    queryFn: async () => {
      const result = await base44.entities.AIPolicy.list('-created_date', 50);
      return result || [];
    },
  });

  if (isLoading) return <OrbitanLoader size="md" message="Loading policies..." />;
  if (!policies || policies.length === 0) {
    return <EmptyState icon={Shield} title="No AI policies configured" description="Create policies to enforce deny-by-default AI governance." />;
  }

  return (
    <div className="grid gap-3">
      {policies.map((policy) => (
        <Card key={policy.id} className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FileCheck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-sm truncate">{policy.display_name}</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{policy.policy_key}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{policy.description}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant={policy.decision === 'deny' ? 'destructive' : 'outline'} className="text-xs capitalize">
                    {policy.decision.replace(/_/g, ' ')}
                  </Badge>
                  {policy.is_active ? (
                    <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AuditSection() {
  const { data: events, isLoading } = useQuery({
    queryKey: ['ai-audit-events'],
    queryFn: async () => {
      const result = await base44.entities.AIAuditEvent.list('-created_date', 20);
      return result || [];
    },
  });

  if (isLoading) return <OrbitanLoader size="md" message="Loading audit events..." />;
  if (!events || events.length === 0) {
    return <EmptyState icon={Activity} title="No AI audit events yet" description="AI executions will appear here with full provenance." />;
  }

  return (
    <div className="grid gap-3">
      {events.map((event) => (
        <Card key={event.id} className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-sm truncate">{event.service_key}</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{event.request_id?.substring(0, 12)}...</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{event.provider || 'unknown'}</Badge>
                  <Badge variant="outline" className="text-xs">{event.model_key || 'unknown'}</Badge>
                  <StatusBadge status={event.outcome} />
                  <Badge variant="secondary" className="text-xs capitalize">{event.provenance_state?.replace(/_/g, ' ')}</Badge>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {event.credits_consumed != null && (
                  <p className="text-xs text-muted-foreground">{event.credits_consumed} credits</p>
                )}
                {event.runtime_ms != null && (
                  <p className="text-xs text-muted-foreground mt-1">{event.runtime_ms}ms</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProviderSection() {
  const configured = getConfiguredProviders();

  return (
    <div className="grid gap-3">
      {Object.values(PROVIDER_REGISTRY).map((provider) => {
        const isConfigured = provider.status === 'configured';
        return (
          <Card key={provider.provider_id} className="card-elevated">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{provider.display_name}</span>
                    {isConfigured ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{provider.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={isConfigured ? 'default' : 'secondary'} className="text-xs capitalize">
                      {provider.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{provider.region}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function AIGovernancePage() {
  return (
    <div className="min-h-screen bg-background">
      <BackBar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24">
        <PageHeader
          title="AI Governance"
          subtitle="Model lifecycle, agent identity, policy enforcement, audit provenance, and provider status for the Orbitan AI Operating Layer."
        />

        {/* Runtime Enforcement Status Banner */}
        <div className="flex items-start gap-3 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 mb-6">
          <Zap className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Runtime Governance Enforcement Active — Hardened (Build #28.2O)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              The Nexus gateway enforces model lifecycle, agent lifecycle, autonomy levels, AI policy evaluation (deny-by-default), execution policy validation, pre-execution audit for consequential actions, idempotency via caller-provided keys, tenant membership validation, Worker-safe Orbit Inbox routing, and AIApproval lifecycle. Migration mode is <strong>inactive</strong> — baseline policies seeded, deny-by-default applies when no policy matches.
            </p>
          </div>
        </div>

        {/* Hardened Controls Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card">
            <Lock className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Idempotency</p>
              <p className="text-sm font-medium text-emerald-600">Active</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card">
            <Shield className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Fail-Closed Audit</p>
              <p className="text-sm font-medium text-emerald-600">Enforced</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Migration Mode</p>
              <p className="text-sm font-medium text-emerald-600">Exited</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card">
            <Clock className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Worker-Safe Links</p>
              <p className="text-sm font-medium text-emerald-600">Enforced</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 mt-6">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-heading font-semibold">AI Models</h2>
            </div>
            <ModelsSection />
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-heading font-semibold">AI Agents</h2>
            </div>
            <AgentsSection />
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileCheck className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-heading font-semibold">AI Policies</h2>
            </div>
            <PoliciesSection />
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-heading font-semibold">Pending Approvals</h2>
            </div>
            <AIApprovalQueue />
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-heading font-semibold">AI Audit Events</h2>
            </div>
            <AuditSection />
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-heading font-semibold">Provider Status</h2>
            </div>
            <ProviderSection />
          </section>
        </div>
      </div>
    </div>
  );
}