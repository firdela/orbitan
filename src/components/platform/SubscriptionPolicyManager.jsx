import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Shield, DollarSign, Users, Store, Layers, Cpu, Check, X,
  Edit2, Save, Plus, AlertCircle, TrendingUp
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SubscriptionPolicyManager() {
  const queryClient = useQueryClient();
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const { data: policies, isLoading } = useQuery({
    queryKey: ['subscriptionPolicies'],
    queryFn: async () => {
      const result = await base44.entities.SubscriptionPolicy.list('-tier');
      return result;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (policy) => {
      return await base44.entities.SubscriptionPolicy.update(policy.id, policy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['subscriptionPolicies']);
      setEditingPolicy(null);
      setEditForm(null);
    },
  });

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    setEditForm({
      plan_name: policy.plan_name,
      tier: policy.tier,
      allowed_modules: [...policy.allowed_modules],
      allowed_packs: [...policy.allowed_packs],
      limits: { ...policy.limits },
      features: { ...policy.features },
      pricing: { ...policy.pricing },
      is_active: policy.is_active,
      notes: policy.notes || '',
    });
  };

  const handleSave = () => {
    updateMutation.mutate({ ...editingPolicy, ...editForm });
  };

  const toggleModule = (moduleKey) => {
    setEditForm(prev => ({
      ...prev,
      allowed_modules: prev.allowed_modules.includes(moduleKey)
        ? prev.allowed_modules.filter(m => m !== moduleKey)
        : [...prev.allowed_modules, moduleKey]
    }));
  };

  const togglePack = (packKey) => {
    setEditForm(prev => ({
      ...prev,
      allowed_packs: prev.allowed_packs.includes(packKey)
        ? prev.allowed_packs.filter(p => p !== packKey)
        : [...prev.allowed_packs, packKey]
    }));
  };

  const ALL_MODULES = ['workforce', 'scheduling', 'tasks', 'clock', 'inventory', 'procurement', 'compliance', 'reporting', 'sales_invoice', 'finance_xero', 'ai_suite', 'customer_management'];
  const ALL_PACKS = ['core', 'fnb', 'retail', 'recycling', 'healthcare', 'education', 'logistics', 'technology', 'construction'];

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-orbitan-blue border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-orbitan-blue" /> Subscription Policy Registry
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Define commercial entitlements, resource limits, and feature flags per subscription tier.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Add Policy
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Changes to subscription policies take effect immediately. All tenant access checks will use the updated policy via the subscriptionGate function.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-4">
        {policies?.map((policy) => (
          <Card key={policy.id} className={`border-l-4 ${policy.tier === 4 ? 'border-l-[#D4AF37]' : policy.tier === 3 ? 'border-l-[#7C3AED]' : policy.tier === 2 ? 'border-l-[#10B981]' : 'border-l-[#2563EB]'}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{policy.plan_name}</CardTitle>
                    <Badge variant={policy.is_active ? 'default' : 'secondary'}>
                      {policy.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {policy.is_legacy && <Badge variant="outline">Legacy</Badge>}
                  </div>
                  <CardDescription className="mt-1">{policy.plan_key}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleEdit(policy)} className="gap-2">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Limits */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5" /> Resource Limits
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Employees:</span>
                      <span className="font-medium">{policy.limits?.max_employees ?? '∞'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Outlets:</span>
                      <span className="font-medium">{policy.limits?.max_outlets ?? '∞'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Brands:</span>
                      <span className="font-medium">{policy.limits?.max_brands ?? '∞'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">AI Credits/mo:</span>
                      <span className="font-medium">{policy.limits?.monthly_credit_quota ?? '∞'}</span>
                    </div>
                  </div>
                </div>

                {/* Modules */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Layers className="w-3.5 h-3.5" /> Modules ({policy.allowed_modules?.length || 0})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {policy.allowed_modules?.slice(0, 6).map(mod => (
                      <Badge key={mod} variant="outline" className="text-[10px]">{mod.replace(/_/g, ' ')}</Badge>
                    ))}
                    {policy.allowed_modules?.length > 6 && (
                      <Badge variant="secondary" className="text-[10px]">+{policy.allowed_modules.length - 6}</Badge>
                    )}
                    {policy.allowed_modules?.includes('*') && (
                      <Badge className="bg-orbitan-blue text-white text-[10px]">All Modules</Badge>
                    )}
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <DollarSign className="w-3.5 h-3.5" /> Pricing (SGD)
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monthly:</span>
                      <span className="font-medium">${policy.pricing?.monthly_price_sgd ?? 'Custom'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Annual:</span>
                      <span className="font-medium">${policy.pricing?.annual_price_sgd ?? 'Custom'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trial:</span>
                      <span className="font-medium">{policy.pricing?.trial_days ?? 14} days</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  <Cpu className="w-3.5 h-3.5" /> Enabled Features
                </div>
                <div className="flex flex-wrap gap-2">
                  {policy.features && Object.entries(policy.features).filter(([_, v]) => v).map(([key]) => (
                    <Badge key={key} className="bg-orbitan-green-light text-orbitan-green text-[10px] gap-1">
                      <Check className="w-2.5 h-2.5" /> {key.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingPolicy} onOpenChange={() => { setEditingPolicy(null); setEditForm(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {editForm?.plan_name || 'Policy'}</DialogTitle>
            <DialogDescription>
              Configure entitlements, limits, and features for this subscription tier.
            </DialogDescription>
          </DialogHeader>

          {editForm && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Plan Name</Label>
                  <Input
                    value={editForm.plan_name}
                    onChange={(e) => setEditForm({ ...editForm, plan_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tier Level (1-4)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="4"
                    value={editForm.tier}
                    onChange={(e) => setEditForm({ ...editForm, tier: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              {/* Resource Limits */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4" /> Resource Limits
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Max Employees</Label>
                    <Input
                      type="number"
                      placeholder="Unlimited"
                      value={editForm.limits?.max_employees || ''}
                      onChange={(e) => setEditForm({ ...editForm, limits: { ...editForm.limits, max_employees: e.target.value ? parseInt(e.target.value) : null } })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max Outlets</Label>
                    <Input
                      type="number"
                      placeholder="Unlimited"
                      value={editForm.limits?.max_outlets || ''}
                      onChange={(e) => setEditForm({ ...editForm, limits: { ...editForm.limits, max_outlets: e.target.value ? parseInt(e.target.value) : null } })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max Brands</Label>
                    <Input
                      type="number"
                      placeholder="Unlimited"
                      value={editForm.limits?.max_brands || ''}
                      onChange={(e) => setEditForm({ ...editForm, limits: { ...editForm.limits, max_brands: e.target.value ? parseInt(e.target.value) : null } })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Monthly AI Credits</Label>
                    <Input
                      type="number"
                      placeholder="Unlimited"
                      value={editForm.limits?.monthly_credit_quota || ''}
                      onChange={(e) => setEditForm({ ...editForm, limits: { ...editForm.limits, monthly_credit_quota: e.target.value ? parseInt(e.target.value) : null } })}
                    />
                  </div>
                </div>
              </div>

              {/* Modules */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4" /> Module Entitlements
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_MODULES.map(mod => (
                    <div key={mod} className="flex items-center gap-2">
                      <Checkbox
                        checked={editForm.allowed_modules?.includes(mod)}
                        onCheckedChange={() => toggleModule(mod)}
                      />
                      <Label className="text-sm font-normal">{mod.replace(/_/g, ' ')}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Industry Packs */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Store className="w-4 h-4" /> Industry Pack Access
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_PACKS.map(pack => (
                    <div key={pack} className="flex items-center gap-2">
                      <Checkbox
                        checked={editForm.allowed_packs?.includes(pack)}
                        onCheckedChange={() => togglePack(pack)}
                      />
                      <Label className="text-sm font-normal">{pack.replace(/_/g, ' ')}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Cpu className="w-4 h-4" /> Feature Flags
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(editForm.features || {}).map(feature => (
                    <div key={feature} className="flex items-center gap-2">
                      <Checkbox
                        checked={editForm.features?.[feature]}
                        onCheckedChange={(checked) => setEditForm({ ...editForm, features: { ...editForm.features, [feature]: checked } })}
                      />
                      <Label className="text-sm font-normal">{feature.replace(/_/g, ' ')}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4" /> Pricing (SGD)
                </Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">Monthly Price</Label>
                    <Input
                      type="number"
                      placeholder="0 for free"
                      value={editForm.pricing?.monthly_price_sgd || ''}
                      onChange={(e) => setEditForm({ ...editForm, pricing: { ...editForm.pricing, monthly_price_sgd: e.target.value ? parseFloat(e.target.value) : null } })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Annual Price</Label>
                    <Input
                      type="number"
                      placeholder="Custom"
                      value={editForm.pricing?.annual_price_sgd || ''}
                      onChange={(e) => setEditForm({ ...editForm, pricing: { ...editForm.pricing, annual_price_sgd: e.target.value ? parseFloat(e.target.value) : null } })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Trial Days</Label>
                    <Input
                      type="number"
                      value={editForm.pricing?.trial_days || 14}
                      onChange={(e) => setEditForm({ ...editForm, pricing: { ...editForm.pricing, trial_days: parseInt(e.target.value) } })}
                    />
                  </div>
                </div>
              </div>

              {/* Active/Legacy */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={editForm.is_active}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                  />
                  <Label>Active (available for new subscriptions)</Label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingPolicy(null); setEditForm(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
              {updateMutation.isPending ? <><div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}