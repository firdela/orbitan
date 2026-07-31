import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ToggleLeft, ToggleRight, Package, Users, Settings, RefreshCw } from 'lucide-react';
import BackBar from '@/components/shared/BackBar';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { MODULES, SUBSCRIPTION_PLANS } from '@/lib/orbitan-config';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

export default function FeatureFlagManager() {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    const loadTenants = async () => {
      try {
        const list = await base44.entities.Tenant.list('-created_date', 50);
        setTenants(list || []);
        if (list && list.length > 0) setSelectedTenant(list[0]);
      } catch {
        setTenants([]);
      } finally {
        setLoading(false);
      }
    };
    loadTenants();
  }, []);

  const handleToggleModule = async (moduleKey) => {
    if (!selectedTenant) return;
    setToggling(moduleKey);
    try {
      const currentModules = selectedTenant.enabled_modules || [];
      const newModules = currentModules.includes(moduleKey)
        ? currentModules.filter(m => m !== moduleKey)
        : [...currentModules, moduleKey];
      await base44.entities.Tenant.update(selectedTenant.id, { enabled_modules: newModules });
      setSelectedTenant({ ...selectedTenant, enabled_modules: newModules });
      setTenants(prev => prev.map(t => t.id === selectedTenant.id ? { ...t, enabled_modules: newModules } : t));
    } catch {
      // error bubbles up
    } finally {
      setToggling(null);
    }
  };

  const isEnterprise = selectedTenant?.subscription_plan === 'orbitan_enterprise';
  const planConfig = selectedTenant ? SUBSCRIPTION_PLANS[selectedTenant.subscription_plan] : null;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <BackBar to="/leader-org" label="Back to Platform Console" />
      <PageHeader
        title="Feature Flag Manager"
        subtitle="Manage module activation per tenant. Integrates with Capability Manager, Module Activation, and RBAC."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        }
      />

      {/* Tenant Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Select Tenant
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading tenants...</p>
          ) : tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tenants found.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tenants.map(tenant => (
                <button
                  key={tenant.id}
                  onClick={() => setSelectedTenant(tenant)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${selectedTenant?.id === tenant.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-accent'}`}
                >
                  {tenant.name}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTenant && (
        <motion.div {...fadeUp}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" /> Module Activation — {selectedTenant.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{planConfig?.name || 'Unknown Plan'}</Badge>
                  {isEnterprise && <Badge className="text-[10px] bg-primary">All Modules Unlocked</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.values(MODULES).map((module) => {
                  const isEnabled = isEnterprise || (selectedTenant.enabled_modules || []).includes(module.key);
                  const planAllows = isEnterprise || (planConfig?.allowed_modules || []).includes(module.key) || (planConfig?.allowed_modules || []).includes('all');
                  const isToggling = toggling === module.key;
                  return (
                    <div
                      key={module.key}
                      className={`p-4 rounded-xl border transition-colors ${isEnabled ? 'border-primary/30 bg-primary/5' : 'border-border'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold truncate">{module.name}</h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{module.description}</p>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => handleToggleModule(module.key)}
                          disabled={isEnterprise || isToggling || !planAllows}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        {isEnabled ? (
                          <Badge className="text-[9px] h-4 bg-emerald-500"><ToggleRight className="w-2.5 h-2.5 mr-0.5" />Enabled</Badge>
                        ) : planAllows ? (
                          <Badge variant="outline" className="text-[9px] h-4"><ToggleLeft className="w-2.5 h-2.5 mr-0.5" />Disabled</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] h-4 text-muted-foreground"><Settings className="w-2.5 h-2.5 mr-0.5" />Plan Locked</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {isEnterprise && (
                <p className="text-xs text-muted-foreground mt-4">
                  Enterprise tenants have all modules unlocked. Individual toggles are disabled.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}