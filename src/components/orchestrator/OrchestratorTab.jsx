import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Shield, AlertTriangle, CheckCircle2, RefreshCw,
  Rocket, GitBranch, Clock, Zap, Eye, EyeOff,
  AlertCircle, ToggleLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  draft:               { label: 'Draft',              color: 'bg-slate-100 text-slate-600' },
  pending_validation:  { label: 'Pending Validation', color: 'bg-amber-100 text-amber-700' },
  validated:           { label: 'Validated',          color: 'bg-blue-100 text-blue-700' },
  live:                { label: 'Live',                color: 'bg-green-100 text-green-700' },
  rolled_back:         { label: 'Rolled Back',        color: 'bg-red-100 text-red-700' },
  failed:              { label: 'Failed',              color: 'bg-red-100 text-red-700' },
};

function MaintenancePanel({ settings, onUpdate, isUpdating }) {
  const [form, setForm] = useState({
    maintenance_title: settings?.maintenance_title || 'Scheduled Maintenance',
    maintenance_message: settings?.maintenance_message || '',
    expected_resume_at: settings?.expected_resume_at || '',
    shield_level: settings?.shield_level || 'auditor',
  });

  const isMaintenance = settings?.maintenance_mode === true;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isMaintenance ? 'bg-[#D4AF37]/10' : 'bg-muted'}`}>
            <Shield className={`w-4 h-4 ${isMaintenance ? 'text-[#D4AF37]' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Maintenance Mode</p>
            <p className="text-xs text-muted-foreground">Global kill-switch — affects all tenants instantly</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {isMaintenance && (
            <span className="text-xs font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-full animate-pulse">
              ACTIVE
            </span>
          )}
          <Switch
            checked={isMaintenance}
            disabled={isUpdating}
            onCheckedChange={(checked) => onUpdate({ maintenance_mode: checked })}
          />
        </div>
      </div>

      {/* Config fields */}
      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Maintenance Title</label>
            <Input
              value={form.maintenance_title}
              onChange={e => setForm(f => ({ ...f, maintenance_title: e.target.value }))}
              className="text-sm"
              placeholder="Scheduled Maintenance"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Expected Resume</label>
            <Input
              type="datetime-local"
              value={form.expected_resume_at ? form.expected_resume_at.slice(0, 16) : ''}
              onChange={e => setForm(f => ({ ...f, expected_resume_at: e.target.value }))}
              className="text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Message to Users</label>
          <Textarea
            value={form.maintenance_message}
            onChange={e => setForm(f => ({ ...f, maintenance_message: e.target.value }))}
            className="text-sm resize-none"
            rows={2}
            placeholder="OrbitanOS is undergoing scheduled maintenance..."
          />
        </div>

        {/* Shield Level */}
        <div className="flex items-center justify-between bg-muted rounded-lg px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Shield Level</p>
            <p className="text-xs text-muted-foreground">Guardian blocks high-risk actions platform-wide</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${form.shield_level === 'guardian' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
              {form.shield_level === 'guardian' ? 'Guardian' : 'Auditor'}
            </span>
            <Switch
              checked={form.shield_level === 'guardian'}
              onCheckedChange={c => setForm(f => ({ ...f, shield_level: c ? 'guardian' : 'auditor' }))}
            />
          </div>
        </div>

        <Button
          size="sm"
          className="w-full"
          disabled={isUpdating}
          onClick={() => onUpdate(form)}
        >
          {isUpdating ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</> : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}

function DeploymentCard({ log }) {
  const cfg = STATUS_CONFIG[log.deployment_status] || STATUS_CONFIG.draft;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3">
      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        <GitBranch className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-semibold text-foreground">v{log.version}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
          {log.release_type && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">{log.release_type}</span>
          )}
        </div>
        {log.release_notes && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{log.release_notes}</p>
        )}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {log.deployed_at && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(log.deployed_at), 'dd MMM yyyy, HH:mm')}
            </span>
          )}
          {log.deployed_by_name && <span>by {log.deployed_by_name}</span>}
          {log.shield_check_passed && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="w-3 h-3" /> Shield ✓
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function NewDeploymentForm({ onCreated }) {
  const [form, setForm] = useState({ version: '', release_notes: '', release_type: 'patch' });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.version) return;
    setSaving(true);
    await base44.entities.DeploymentLog.create({
      ...form,
      deployment_status: 'draft',
      deployed_at: new Date().toISOString(),
    });
    setSaving(false);
    setForm({ version: '', release_notes: '', release_type: 'patch' });
    toast.success(`Deployment draft v${form.version} created`);
    onCreated();
  };

  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4 space-y-3">
      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Rocket className="w-4 h-4 text-orbitan-blue" /> Log New Deployment
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Version</label>
          <Input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="e.g. 1.5.0" className="text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Type</label>
          <select
            className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background"
            value={form.release_type}
            onChange={e => setForm(f => ({ ...f, release_type: e.target.value }))}
          >
            <option value="hotfix">Hotfix</option>
            <option value="patch">Patch</option>
            <option value="minor">Minor</option>
            <option value="major">Major</option>
            <option value="maintenance_window">Maintenance Window</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Release Notes</label>
        <Textarea value={form.release_notes} onChange={e => setForm(f => ({ ...f, release_notes: e.target.value }))} rows={2} className="text-sm resize-none" placeholder="What changed in this release..." />
      </div>
      <Button size="sm" disabled={saving || !form.version} onClick={handleCreate} className="w-full gap-1.5">
        {saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Creating...</> : <><Zap className="w-3.5 h-3.5" /> Create Draft</>}
      </Button>
    </div>
  );
}

export default function OrchestratorTab() {
  const qc = useQueryClient();

  const { data: settingsArr = [], isLoading: loadingSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => base44.entities.SystemSettings.list(),
  });

  const { data: deployments = [], isLoading: loadingDeploys } = useQuery({
    queryKey: ['deployment-logs'],
    queryFn: () => base44.entities.DeploymentLog.list('-created_date', 20),
  });

  const settings = settingsArr[0] || null;

  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      if (settings?.id) {
        await base44.entities.SystemSettings.update(settings.id, updates);
      } else {
        await base44.entities.SystemSettings.create(updates);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('System settings updated');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading font-semibold text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#D4AF37]" /> Platform Orchestrator
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Maintenance control, deployment registry &amp; feature governance — powered by <span className="font-medium text-foreground">Regulate</span>.
          </p>
        </div>
        {settings?.maintenance_mode && (
          <div className="flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] px-3 py-1.5 rounded-lg text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            MAINTENANCE ACTIVE
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Maintenance Control */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Maintenance &amp; Shield</p>
          {loadingSettings ? (
            <div className="h-48 bg-muted rounded-xl animate-pulse" />
          ) : (
            <MaintenancePanel
              settings={settings}
              onUpdate={updateMutation.mutate}
              isUpdating={updateMutation.isPending}
            />
          )}

          {/* Platform version display */}
          {settings?.platform_version && (
            <div className="bg-muted rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Current Live Version</span>
              <span className="text-sm font-bold text-foreground font-mono">v{settings.platform_version}</span>
            </div>
          )}
        </div>

        {/* Right: Deployment Registry */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deployment Registry</p>
          <NewDeploymentForm onCreated={() => qc.invalidateQueries({ queryKey: ['deployment-logs'] })} />
          <div className="space-y-2">
            {loadingDeploys ? (
              <div className="h-32 bg-muted rounded-xl animate-pulse" />
            ) : deployments.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground bg-card border border-dashed border-border rounded-xl">
                No deployments logged yet.
              </div>
            ) : (
              deployments.map(d => <DeploymentCard key={d.id} log={d} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}