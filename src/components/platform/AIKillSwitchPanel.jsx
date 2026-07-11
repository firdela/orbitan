import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Power, Zap, Shield, Activity, AlertTriangle, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AIKillSwitchPanel() {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.list();
      return result?.[0] || null;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      if (!settings?.id) {
        const user = await base44.auth.me();
        if (user.role !== 'admin') throw new Error('Only admins can create system settings');
        return await base44.entities.SystemSettings.create(data);
      }
      return await base44.entities.SystemSettings.update(settings.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
    },
  });

  const toggleAI = (enabled) => {
    updateMutation.mutate({
      nexus_ai_enabled: enabled,
      nexus_ai_disabled_reason: enabled ? '' : reason || 'Manual toggle by admin',
    });
    if (enabled) setReason('');
  };

  const toggleEvolution = (enabled) => {
    updateMutation.mutate({ orbit_evolution_enabled: enabled });
  };

  const setGovernanceMode = (mode) => {
    updateMutation.mutate({ ai_governance_mode: mode });
  };

  if (isLoading) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">Loading AI settings...</CardContent></Card>;
  }

  const aiEnabled = settings?.nexus_ai_enabled !== false;
  const evolutionEnabled = settings?.orbit_evolution_enabled !== false;
  const governanceMode = settings?.ai_governance_mode || 'proactive_approval';

  return (
    <div className="space-y-4">
      {/* AI Kill Switch */}
      <Card className={aiEnabled ? '' : 'border-destructive/40 bg-destructive/5'}>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Power className={`w-5 h-5 ${aiEnabled ? 'text-green-600' : 'text-destructive'}`} />
                Orbit Nexus AI Kill Switch
              </CardTitle>
              <CardDescription className="mt-1">
                Immediately disable all AI intelligence across OrbitanOS. Core modules continue operating.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${aiEnabled ? 'text-green-600' : 'text-destructive'}`}>
                {aiEnabled ? 'ACTIVE' : 'DISABLED'}
              </span>
              <Switch
                checked={aiEnabled}
                onCheckedChange={toggleAI}
                disabled={updateMutation.isPending}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!aiEnabled && (
            <>
              <div>
                <Label className="text-xs mb-1.5 block">Reason for disabling (admin audit trail)</Label>
                <Textarea
                  value={reason || settings?.nexus_ai_disabled_reason || ''}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Emergency cost freeze, Compliance investigation, Model provider outage"
                  className="text-sm min-h-[60px]"
                  disabled={updateMutation.isPending}
                />
              </div>
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  When disabled, all AI-augmented features return graceful "AI disabled" responses. No errors. OrbitanOS core operations (inventory, procurement, scheduling, workforce) continue normally.
                </AlertDescription>
              </Alert>
            </>
          )}
          {aiEnabled && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-green-500" />
              AI intelligence is fully operational. All modules with AI augmentation are active.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Governance Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-primary" />
            AI Governance Mode
          </CardTitle>
          <CardDescription>
            Choose how AI-driven actions are governed. Both modes are available for users to choose from.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setGovernanceMode('passive_logging')}
              disabled={updateMutation.isPending}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                governanceMode === 'passive_logging'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Unlock className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Passive Logging</span>
                {governanceMode === 'passive_logging' && <Badge variant="default" className="text-[10px] ml-auto">Active</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                AI acts immediately, then records to AuditLog. Optimised for operational velocity. Best for low-risk actions like inventory suggestions.
              </p>
            </button>

            <button
              onClick={() => setGovernanceMode('proactive_approval')}
              disabled={updateMutation.isPending}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                governanceMode === 'proactive_approval'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Proactive Approval</span>
                {governanceMode === 'proactive_approval' && <Badge variant="default" className="text-[10px] ml-auto">Active</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                AI creates an approval request and waits for human review before high-impact actions. Best for procurement, finance, and compliance-sensitive operations.
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Orbit Evolution Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className={`w-5 h-5 ${evolutionEnabled ? 'text-purple-600' : 'text-muted-foreground'}`} />
                Orbit Evolution
              </CardTitle>
              <CardDescription className="mt-1">
                Continuously observes operational patterns and generates improvement proposals. Aligned with the Refine principle.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${evolutionEnabled ? 'text-purple-600' : 'text-muted-foreground'}`}>
                {evolutionEnabled ? 'OBSERVING' : 'PAUSED'}
              </span>
              <Switch
                checked={evolutionEnabled}
                onCheckedChange={toggleEvolution}
                disabled={updateMutation.isPending || !aiEnabled}
              />
            </div>
          </div>
        </CardHeader>
        {!aiEnabled && (
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Orbit Evolution requires AI to be enabled. Enable the AI Kill Switch above to activate.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}