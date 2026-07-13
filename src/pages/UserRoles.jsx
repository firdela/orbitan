import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/use-tenant.jsx';
import { MODULES } from '@/lib/orbitan-config';
import { auditFrontend } from '@/lib/audit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import OrbitanLogo from '@/components/layout/OrbitanLogo';
import { Lock, ArrowLeft, LogOut, Shield, Eye, Save, Trash2 } from 'lucide-react';

const ROLES = [
  { key: 'tenant_admin', label: 'Tenant Admin' },
  { key: 'client_manager', label: 'Client Manager' },
  { key: 'outlet_manager', label: 'Outlet Manager' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'worker', label: 'Worker' },
];

const PERMISSIONS = [
  { key: 'can_view', label: 'View' },
  { key: 'can_create', label: 'Create' },
  { key: 'can_update', label: 'Edit' },
  { key: 'can_delete', label: 'Delete' },
];

const DATA_SCOPES = [
  { key: 'all_outlets', label: 'All Outlets' },
  { key: 'assigned_outlet_only', label: 'Assigned Outlet Only' },
  { key: 'own_records_only', label: 'Own Records Only' },
];

export default function UserRoles() {
  const { currentTenant: tenant } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editCell, setEditCell] = useState(null);
  const [formData, setFormData] = useState(null);

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['moduleAccessPolicies-matrix', tenant?.id],
    queryFn: () => base44.entities.ModuleAccessPolicy.filter({ tenant_id: tenant.id, is_active: true }, '-created_date', 200),
    enabled: !!tenant,
  });

  const policyMap = useMemo(() => {
    const map = {};
    policies.forEach(p => { map[`${p.module_key}:${p.role}`] = p; });
    return map;
  }, [policies]);

  const findPolicy = (moduleKey, roleKey) => policyMap[`${moduleKey}:${roleKey}`];

  const openEdit = (moduleKey, roleKey) => {
    const existing = findPolicy(moduleKey, roleKey);
    setFormData(existing ? { ...existing } : {
      module_key: moduleKey, role: roleKey,
      can_view: true, can_create: false, can_update: false, can_delete: false,
      data_scope: 'assigned_outlet_only',
    });
    setEditCell({ moduleKey, roleKey });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const existing = findPolicy(editCell.moduleKey, editCell.roleKey);
      let record;
      if (existing) {
        record = await base44.entities.ModuleAccessPolicy.update(existing.id, formData);
      } else {
        record = await base44.entities.ModuleAccessPolicy.create({ ...formData, tenant_id: tenant.id, created_by_id: user.id, created_by_name: user.full_name });
      }
      await auditFrontend({
        tenant_id: tenant.id, actor_id: user.id, actor_name: user.full_name, actor_role: user.role,
        action_type: 'settings_updated', module: 'compliance', target_entity: 'ModuleAccessPolicy',
        target_record_id: record.id,
        details: `${existing ? 'Updated' : 'Created'} access policy: ${editCell.moduleKey} / ${editCell.roleKey}`,
        previous_state: existing, new_state: formData,
      });
      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moduleAccessPolicies-matrix'] });
      setEditCell(null);
      toast({ title: 'Policy saved', description: 'Access permissions updated successfully.' });
    },
    onError: (err) => toast({ title: 'Failed to save', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const existing = findPolicy(editCell.moduleKey, editCell.roleKey);
      if (!existing) return;
      const user = await base44.auth.me();
      await base44.entities.ModuleAccessPolicy.delete(existing.id);
      await auditFrontend({
        tenant_id: tenant.id, actor_id: user.id, actor_name: user.full_name, actor_role: user.role,
        action_type: 'settings_updated', module: 'compliance', target_entity: 'ModuleAccessPolicy',
        target_record_id: existing.id, details: `Deleted access policy: ${editCell.moduleKey} / ${editCell.roleKey}`,
        previous_state: existing,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moduleAccessPolicies-matrix'] });
      setEditCell(null);
      toast({ title: 'Policy deleted', description: 'Default permissions now apply.' });
    },
  });

  if (!tenant) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading workspace...</p></div>;
  }

  const moduleList = Object.values(MODULES);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link to="/company"><ArrowLeft className="w-4 h-4" /></Link></Button>
            <OrbitanLogo size="sm" showOS />
          </div>
          <Button variant="outline" size="sm" onClick={() => base44.auth.logout()} className="gap-1.5 text-xs">
            <LogOut className="w-3.5 h-3.5" /><span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold mb-3">
            <Lock className="w-3.5 h-3.5" /> RBAC · Least-Privilege
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-1">User Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground">Define role-based access policies across modules and departments. Click any cell to edit permissions.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {ROLES.map(role => {
            const count = policies.filter(p => p.role === role.key).length;
            return (
              <div key={role.key} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">{role.label}</p>
                <p className="text-2xl font-display font-bold">{count}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">policies defined</p>
              </div>
            );
          })}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading policies...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 sticky left-0 bg-muted/50 z-10 min-w-[200px]">Module</th>
                    {ROLES.map(r => <th key={r.key} className="text-center text-xs font-semibold text-muted-foreground px-2 py-3 min-w-[100px]">{r.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {moduleList.map(mod => (
                    <tr key={mod.key} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{mod.name}</p>
                        <p className="text-[10px] text-muted-foreground">{mod.description}</p>
                      </td>
                      {ROLES.map(role => {
                        const policy = findPolicy(mod.key, role.key);
                        return (
                          <td key={role.key} className="px-2 py-3 text-center">
                            <button
                              onClick={() => openEdit(mod.key, role.key)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-accent transition-colors min-h-[24px]"
                            >
                              {policy ? (
                                <>
                                  {policy.can_view && <span className="text-[9px] font-bold text-orbitan-green bg-orbitan-green-light px-1 rounded">V</span>}
                                  {policy.can_create && <span className="text-[9px] font-bold text-orbitan-blue bg-orbitan-blue-light px-1 rounded">C</span>}
                                  {policy.can_update && <span className="text-[9px] font-bold text-orbitan-amber bg-orbitan-amber-light px-1 rounded">E</span>}
                                  {policy.can_delete && <span className="text-[9px] font-bold text-orbitan-red bg-orbitan-red-light px-1 rounded">D</span>}
                                  {!policy.can_view && !policy.can_create && !policy.can_update && !policy.can_delete && <span className="text-[9px] text-muted-foreground">none</span>}
                                </>
                              ) : (
                                <span className="text-[9px] text-muted-foreground/50 italic">default</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-muted/50 border border-border rounded-xl p-4 mt-4 flex items-start gap-3">
          <Eye className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <strong className="text-foreground">How it works:</strong> Cells show active permissions (V=View, C=Create, E=Edit, D=Delete). "default" means no explicit policy — role hierarchy defaults apply. Click any cell to customize.
          </div>
        </div>
      </main>

      <Dialog open={!!editCell} onOpenChange={() => setEditCell(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Edit Permissions</DialogTitle>
          </DialogHeader>
          {editCell && formData && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">{MODULES[editCell.moduleKey]?.name || editCell.moduleKey}</Badge>
                <Badge variant="outline" className="text-xs capitalize">{editCell.roleKey.replace(/_/g, ' ')}</Badge>
              </div>
              <div>
                <Label className="text-xs mb-2 block">Data Scope</Label>
                <Select value={formData.data_scope} onValueChange={v => setFormData(p => ({ ...p, data_scope: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DATA_SCOPES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                {PERMISSIONS.map(perm => (
                  <div key={perm.key} className="flex items-center justify-between py-1">
                    <Label htmlFor={perm.key} className="text-sm cursor-pointer">{perm.label}</Label>
                    <Switch id={perm.key} checked={formData[perm.key]} onCheckedChange={v => setFormData(p => ({ ...p, [perm.key]: v }))} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <div>
              {editCell && findPolicy(editCell.moduleKey, editCell.roleKey) && (
                <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditCell(null)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                <Save className="w-3.5 h-3.5 mr-1" /> Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}