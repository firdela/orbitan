import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cpu, Zap, Brain, ShieldCheck, Lock, Activity, ToggleLeft, ToggleRight,
  RefreshCw, Layers, Eye, EyeOff, Search, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import OrbitanLogo from '@/components/layout/OrbitanLogo';
import PlatformFooter from '@/components/layout/PlatformFooter';

// ── Tier metadata ──────────────────────────────────────────
const TIER_CONFIG = {
  1: {
    label: 'Tier 1 — Deterministic',
    icon: Cpu,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    dot: 'bg-emerald-500',
    description: 'Stateless function. Zero policy required.',
  },
  2: {
    label: 'Tier 2 — Assistant Synthesizer',
    icon: Zap,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    dot: 'bg-blue-500',
    description: 'LLM + tools. Shield governance-gated.',
  },
  3: {
    label: 'Tier 3 — Autonomous Delegate',
    icon: Brain,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    dot: 'bg-purple-500',
    description: 'Agentic loop. Enterprise + high trust only.',
  },
};

const MODULE_COLORS = {
  finance: 'bg-amber-100 text-amber-800',
  inventory: 'bg-cyan-100 text-cyan-800',
  procurement: 'bg-indigo-100 text-indigo-800',
  workforce: 'bg-rose-100 text-rose-800',
  compliance: 'bg-emerald-100 text-emerald-800',
  sales: 'bg-orange-100 text-orange-800',
  scheduling: 'bg-violet-100 text-violet-800',
  retail: 'bg-lime-100 text-lime-800',
  sustainability: 'bg-green-100 text-green-800',
  system: 'bg-slate-100 text-slate-800',
};

const SANITIZATION_CONFIG = {
  strict: { label: 'Strict', color: 'text-red-700 bg-red-50 border-red-200', icon: Lock },
  permissive: { label: 'Permissive', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Eye },
  disabled: { label: 'Disabled', color: 'text-slate-700 bg-slate-50 border-slate-200', icon: EyeOff },
};

function CapabilityCard({ capability, onToggle, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const tierCfg = TIER_CONFIG[capability.tier] || TIER_CONFIG[1];
  const TierIcon = tierCfg.icon;
  const sanCfg = SANITIZATION_CONFIG[capability.sanitization?.mode || 'strict'] || SANITIZATION_CONFIG.strict;
  const SanIcon = sanCfg.icon;

  return (
    <Card className={`overflow-hidden transition-all ${!capability.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${tierCfg.color}`}>
              <TierIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-heading truncate">
                  {capability.display_name}
                </CardTitle>
                <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {capability.capability_key}
                </code>
              </div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {capability.description}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggle(capability)}
            className="shrink-0"
          >
            {capability.is_active ? (
              <ToggleRight className="h-6 w-6 text-emerald-600" />
            ) : (
              <ToggleLeft className="h-6 w-6 text-muted-foreground" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Metadata badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={tierCfg.color}>
            <TierIcon className="h-3 w-3 mr-1" />
            T{capability.tier}
          </Badge>
          <Badge variant="secondary" className={MODULE_COLORS[capability.module] || MODULE_COLORS.system}>
            {capability.module}
          </Badge>
          {capability.governance?.domain_id && (
            <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
              <ShieldCheck className="h-3 w-3 mr-1" />
              {capability.governance.domain_id}
            </Badge>
          )}
          <Badge variant="outline" className={sanCfg.color}>
            <SanIcon className="h-3 w-3 mr-1" />
            {sanCfg.label}
          </Badge>
          {capability.tenant_id !== 'system' && (
            <Badge variant="outline" className="text-violet-700 border-violet-200 bg-violet-50">
              Tenant Override
            </Badge>
          )}
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Activity className="h-3.5 w-3.5" />
            {capability.fire_count || 0} invocations
          </span>
          <span className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            {capability.default_credits} credit{capability.default_credits !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Lock className="h-3.5 w-3.5" />
            {capability.min_plan_required}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full justify-between text-xs text-muted-foreground hover:text-foreground"
        >
          <span>{expanded ? 'Hide' : 'Show'} configuration details</span>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>

        {expanded && (
          <div className="space-y-2 pt-1 text-xs">
            <Separator />
            <div className="grid grid-cols-1 gap-1.5">
              <div>
                <span className="text-muted-foreground">Handler:</span>{' '}
                <code className="bg-muted px-1.5 py-0.5 rounded">
                  {capability.handler?.type} → {capability.handler?.ref}
                </code>
              </div>
              {capability.handler?.type === 'function' && (
                <div>
                  <span className="text-muted-foreground">Fallback:</span>{' '}
                  {capability.fallback_capability_key ? (
                    <code className="bg-muted px-1.5 py-0.5 rounded">{capability.fallback_capability_key}</code>
                  ) : (
                    <span className="text-muted-foreground italic">none</span>
                  )}
                </div>
              )}
              {capability.governance?.requires_consent && (
                <div>
                  <span className="text-muted-foreground">Consent:</span>{' '}
                  <span className="text-amber-700">requires tenant opt-in (ADR-0044)</span>
                </div>
              )}
              {capability.governance?.model_override && (
                <div>
                  <span className="text-muted-foreground">Model pin:</span>{' '}
                  <code className="bg-muted px-1.5 py-0.5 rounded">{capability.governance.model_override}</code>
                </div>
              )}
              {capability.sanitization?.permitted_fields?.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Permitted fields:</span>{' '}
                  {capability.sanitization.permitted_fields.join(', ')}
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Version:</span> {capability.version || '1.0.0'}
                {capability.last_fired_at && (
                  <> · <span className="text-muted-foreground">Last fired:</span>{' '}
                    {new Date(capability.last_fired_at).toLocaleString('en-SG', { dateStyle: 'short', timeStyle: 'short' })}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CapabilityManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCapability, setEditingCapability] = useState(null);
  const [editForm, setEditForm] = useState({ display_name: '', description: '', notes: '' });

  // Fetch all capabilities (RLS: admin only)
  const { data: capabilities, isLoading, refetch } = useQuery({
    queryKey: ['nexusCapabilities'],
    queryFn: async () => {
      const result = await base44.entities.NexusCapabilityRegistry.filter({}, '-tier', 200);
      return result || [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (capability) => {
      await base44.entities.NexusCapabilityRegistry.update(capability.id, {
        is_active: !capability.is_active,
      });
    },
    onSuccess: (_, capability) => {
      queryClient.invalidateQueries({ queryKey: ['nexusCapabilities'] });
      toast({
        title: `Capability ${capability.is_active ? 'disabled' : 'enabled'}`,
        description: `${capability.display_name} is now ${capability.is_active ? 'offline' : 'live'}.`,
      });
    },
    onError: (err) => {
      toast({ title: 'Failed to toggle', description: err.message, variant: 'destructive' });
    },
  });

  const saveEditMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.NexusCapabilityRegistry.update(editingCapability.id, {
        display_name: editForm.display_name,
        description: editForm.description,
        notes: editForm.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nexusCapabilities'] });
      setEditDialogOpen(false);
      toast({ title: 'Capability updated', description: 'Metadata changes saved to the registry.' });
    },
    onError: (err) => {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    },
  });

  const filtered = (capabilities || []).filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.capability_key?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = tierFilter === 'all' || c.tier === parseInt(tierFilter);
    return matchesSearch && matchesTier;
  });

  const stats = {
    total: (capabilities || []).length,
    active: (capabilities || []).filter((c) => c.is_active).length,
    tier3: (capabilities || []).filter((c) => c.tier === 3).length,
    totalFires: (capabilities || []).reduce((sum, c) => sum + (c.fire_count || 0), 0),
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OrbitanLogo size="sm" />
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="font-heading font-bold text-lg flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                Capability Manager
              </h1>
              <p className="text-xs text-muted-foreground">Registry-Driven Intelligence · ADR-0046</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="text-2xl font-display font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Registered capabilities</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="text-2xl font-display font-bold text-emerald-600">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="text-2xl font-display font-bold text-purple-600">{stats.tier3}</div>
              <p className="text-xs text-muted-foreground">Autonomous (Tier 3)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="text-2xl font-display font-bold text-blue-600">{stats.totalFires.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Lifetime invocations</p>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by capability key or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {['all', '1', '2', '3'].map((t) => (
              <Button
                key={t}
                variant={tierFilter === t ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTierFilter(t)}
              >
                {t === 'all' ? 'All Tiers' : `Tier ${t}`}
              </Button>
            ))}
          </div>
        </div>

        {/* Capability grid */}
        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading registry...
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Cpu className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No capabilities match your filters.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((cap) => (
              <CapabilityCard
                key={cap.id}
                capability={cap}
                onToggle={(c) => toggleMutation.mutate(c)}
                onEdit={(c) => {
                  setEditingCapability(c);
                  setEditForm({
                    display_name: c.display_name || '',
                    description: c.description || '',
                    notes: c.notes || '',
                  });
                  setEditDialogOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </main>

      <PlatformFooter />
    </div>
  );
}