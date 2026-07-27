import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, Plus, Save, Trash2, Shield, Eye, EyeOff, ArrowLeft, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import OrbitanLogo from '@/components/layout/OrbitanLogo';
import PlatformFooter from '@/components/layout/PlatformFooter';
import { useTenant } from '@/lib/use-tenant.jsx';
import { MODULES } from '@/lib/orbitan-config';
import { auditFrontend } from '@/lib/audit';
import TeamRoster from '@/components/access/TeamRoster';
import TenantSwitcher from '@/components/shared/TenantSwitcher';

const ROLES = [
  { key: 'tenant_admin', label: 'Tenant Admin' },
  { key: 'client_manager', label: 'Client Manager' },
  { key: 'outlet_manager', label: 'Outlet Manager' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'worker', label: 'Worker' },
];

const DATA_SCOPES = [
  { key: 'all_outlets', label: 'All Outlets' },
  { key: 'assigned_outlet_only', label: 'Assigned Outlet Only' },
  { key: 'own_records_only', label: 'Own Records Only' },
];

const PERMISSIONS = [
  { key: 'can_view', label: 'View' },
  { key: 'can_create', label: 'Create' },
  { key: 'can_update', label: 'Edit' },
  { key: 'can_delete', label: 'Delete' },
];

export default function AccessControlPage() {
  const { currentTenant: tenant } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    module_key: 'inventory',
    role: 'worker',
    can_view: true,
    can_create: false,
    can_update: false,
    can_delete: false,
    data_scope: 'assigned_outlet_only',
  });

  const { data: policies, isLoading } = useQuery({
    queryKey: ['moduleAccessPolicies', tenant?.id],
    queryFn: async () => {
      if (!tenant) return [];
      const result = await base44.entities.ModuleAccessPolicy.filter(
        { tenant_id: tenant.id, is_active: true },
        '-created_date',
        100
      );
      return result || [];
    },
    enabled: !!tenant,
  });

  const createMutation = useMutation({
    mutationFn: async (policyData) => {
      const user = await base44.auth.me();
      const existing = (policies || []).find(
        p => p.module_key === policyData.module_key && p.role === policyData.role
      );
      if (existing) {
        throw new Error(`A policy already exists for ${MODULES[policyData.module_key]?.name || policyData.module_key} — ${policyData.role.replace(/_/g, ' ')}. Edit the existing one instead.`);
      }
      const record = await base44.entities.ModuleAccessPolicy.create({
        ...policyData,
        tenant_id: tenant.id,
        created_by_id: user.id,
        created_by_name: user.full_name,
      });
      await auditFrontend({
        tenant_id: tenant.id,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: 'settings_updated',
        module: 'compliance',
        target_entity: 'ModuleAccessPolicy',
        target_record_id: record.id,
        details: `Created access policy: ${policyData.module_key} / ${policyData.role} (view=${policyData.can_view}, create=${policyData.can_create}, update=${policyData.can_update}, delete=${policyData.can_delete}, scope=${policyData.data_scope})`,
        new_state: policyData,
      });
      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moduleAccessPolicies'] });
      setShowNewForm(false);
      toast({ title: 'Policy created', description: 'Access policy saved successfully.' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create policy', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ policyId, data, previousState }) => {
      const user = await base44.auth.me();
      const record = await base44.entities.ModuleAccessPolicy.update(policyId, data);
      await auditFrontend({
        tenant_id: tenant.id,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: 'settings_updated',
        module: 'compliance',
        target_entity: 'ModuleAccessPolicy',
        target_record_id: policyId,
        details: `Updated access policy: ${JSON.stringify(data)}`,
        previous_state: previousState,
        new_state: data,
      });
      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moduleAccessPolicies'] });
    },
    onError: (error) => {
      toast({ title: 'Failed to update policy', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (policyId) => {
      const user = await base44.auth.me();
      const policy = (policies || []).find(p => p.id === policyId);
      await base44.entities.ModuleAccessPolicy.delete(policyId);
      await auditFrontend({
        tenant_id: tenant.id,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: 'settings_updated',
        module: 'compliance',
        target_entity: 'ModuleAccessPolicy',
        target_record_id: policyId,
        details: `Deleted access policy: ${policy?.module_key} / ${policy?.role}`,
        previous_state: policy,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moduleAccessPolicies'] });
      toast({ title: 'Policy deleted', description: 'Access policy removed. Default permissions now apply.' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete policy', description: error.message, variant: 'destructive' });
    },
  });

  const filteredPolicies = (policies || []).filter(p =>
    (selectedModule === 'all' || p.module_key === selectedModule) &&
    (selectedRole === 'all' || p.role === selectedRole)
  );

  if (!tenant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <OrbitanLogo size="sm" showOS />
        <div className="text-center max-w-sm">
          <h2 className="font-heading font-semibold text-lg mb-1">Select a tenant</h2>
          <p className="text-sm text-muted-foreground">Access Control policies are scoped to a tenant. Choose a tenant to manage its role and module permissions.</p>
        </div>
        <TenantSwitcher />
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <Link to="/leader-org"><ArrowLeft className="w-4 h-4" /> Back to Console</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/leader-org"><ArrowLeft className="w-4 h-4" /></Link>
            </Button>
            <OrbitanLogo size="sm" showOS />
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              Access Control
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => base44.auth.logout()}
              className="gap-1.5 text-xs"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold mb-3">
            <Shield className="w-3.5 h-3.5" />
            Orbit Shield — Module Access Control
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2">
            Access Control Layer
          </h1>
          <p className="text-muted-foreground">
            Define what managers and employees can view or edit within each module. Policies are scoped by role, module, and data visibility.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 mb-6">
          <div className="flex-1">
            <Label className="text-xs mb-1.5 block">Module</Label>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {Object.values(MODULES).map(m => (
                  <SelectItem key={m.key} value={m.key}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="text-xs mb-1.5 block">Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map(r => (
                  <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => {
            setNewPolicy(p => ({
              ...p,
              module_key: selectedModule !== 'all' ? selectedModule : 'inventory',
              role: selectedRole !== 'all' ? selectedRole : 'worker',
            }));
            setShowNewForm(true);
          }} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add Policy
          </Button>
        </div>

        {/* New Policy Form */}
        {showNewForm && (
          <Card className="mb-6 border-primary/30">
            <CardHeader>
              <CardTitle className="text-base">New Access Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs mb-1.5 block">Module</Label>
                  <Select value={newPolicy.module_key} onValueChange={v => setNewPolicy(p => ({ ...p, module_key: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.values(MODULES).map(m => (
                        <SelectItem key={m.key} value={m.key}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Role</Label>
                  <Select value={newPolicy.role} onValueChange={v => setNewPolicy(p => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => (
                        <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Data Scope</Label>
                <Select value={newPolicy.data_scope} onValueChange={v => setNewPolicy(p => ({ ...p, data_scope: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DATA_SCOPES.map(s => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-6 flex-wrap">
                {PERMISSIONS.map(perm => (
                  <div key={perm.key} className="flex items-center gap-2">
                    <Switch
                      id={perm.key}
                      checked={newPolicy[perm.key]}
                      onCheckedChange={v => setNewPolicy(p => ({ ...p, [perm.key]: v }))}
                    />
                    <Label htmlFor={perm.key} className="text-sm cursor-pointer">{perm.label}</Label>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewForm(false)}>Cancel</Button>
                <Button
                  onClick={() => createMutation.mutate(newPolicy)}
                  disabled={createMutation.isPending}
                  className="gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Save Policy
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Policies Table */}
        {isLoading ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Loading access policies...</CardContent></Card>
        ) : filteredPolicies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-1">No access policies defined yet.</p>
              <p className="text-xs text-muted-foreground mb-4">Without explicit policies, role-based defaults apply (admins and managers can manage, workers can view).</p>
              <Button size="sm" onClick={() => setShowNewForm(true)} className="gap-1.5">
                <Plus className="w-4 h-4" />
                Create First Policy
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredPolicies.map(policy => (
              <Card key={policy.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="default" className="text-xs">
                          {MODULES[policy.module_key]?.name || policy.module_key}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {policy.role.replace(/_/g, ' ')}
                        </Badge>
                        <Select
                          value={policy.data_scope}
                          onValueChange={v => updateMutation.mutate({
                            policyId: policy.id,
                            data: { data_scope: v },
                            previousState: { data_scope: policy.data_scope }
                          })}
                        >
                          <SelectTrigger className="h-6 text-xs px-2 py-0 w-auto"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DATA_SCOPES.map(s => (
                              <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        {PERMISSIONS.map(perm => (
                          <div key={perm.key} className="flex items-center gap-2">
                            <Switch
                              checked={policy[perm.key] || false}
                              onCheckedChange={v => updateMutation.mutate({
                                policyId: policy.id,
                                data: { [perm.key]: v },
                                previousState: { [perm.key]: policy[perm.key] }
                              })}
                            />
                            <span className={`text-xs ${policy[perm.key] ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                              {perm.label}
                            </span>
                          </div>
                        ))}
                      </div>
                      {policy.created_by_name && (
                        <p className="text-[10px] text-muted-foreground">
                          Created by {policy.created_by_name}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(policy.id)}
                      className="text-muted-foreground hover:text-destructive flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Banner */}
        <Card className="mt-6 bg-muted/50">
          <CardContent className="p-4 flex items-start gap-3">
            <Eye className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <strong className="text-foreground">How it works:</strong> When a policy exists for a role+module combination, it overrides the default permissions. Workers can view by default, supervisors can view and create, managers can view/create/edit. Delete a policy to revert to defaults.
            </div>
          </CardContent>
        </Card>

        <TeamRoster tenantId={tenant?.id} />
      </main>

      <PlatformFooter />
    </div>
  );
}