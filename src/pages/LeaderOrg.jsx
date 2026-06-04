import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { PLATFORM_IDENTITY, SUBSCRIPTION_PLANS, MODULES, INDUSTRY_PACKS, INDUSTRY_LABELS } from '@/lib/orbitan-config';
import { DEMO_TENANTS } from '@/lib/use-tenant.jsx';
import OrbitanLogo from '@/components/layout/OrbitanLogo';
import PlatformFooter from '@/components/layout/PlatformFooter';
import StatCard from '@/components/shared/StatCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2, Users, Package, BarChart2, Shield, Settings, ChevronRight,
  Globe, Cpu, Layers, Flag, CreditCard, Info, Plus, RefreshCw, CheckCircle2,
  AlertTriangle, TrendingUp, Zap, Star
} from 'lucide-react';

const PLAN_COLORS = {
  orbitan_starter: 'bg-slate-100 text-slate-700',
  orbitan_growth: 'bg-orbitan-blue-light text-orbitan-blue',
  orbitan_business: 'bg-orbitan-purple-light text-orbitan-purple',
  orbitan_enterprise: 'bg-orbitan-amber-light text-orbitan-amber',
};

export default function LeaderOrg() {
  const [activeTab, setActiveTab] = useState('overview');
  const tenants = DEMO_TENANTS;

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.status === 'active').length;
  const totalModuleUsage = tenants.reduce((acc, t) => acc + (t.enabled_modules?.length || 0), 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Nav */}
      <header className="border-b border-border bg-background sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <OrbitanLogo size="md" showOS />
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-orbitan-blue-light text-orbitan-blue px-3 py-1.5 rounded-lg text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              Platform Owner Console
            </div>
            <Link to="/company">
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Tenant View
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-orbitan-blue-light text-orbitan-blue px-3 py-1.5 rounded-full text-xs font-semibold mb-3">
            <Cpu className="w-3.5 h-3.5" />
            OrbitanOS Console — v{PLATFORM_IDENTITY.version}
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2">
            Welcome back, <span className="text-orbitan-blue">Firdaus</span>
          </h1>
          <p className="text-muted-foreground">
            Platform Owner · {PLATFORM_IDENTITY.platform} &amp; {PLATFORM_IDENTITY.os} · {new Date().toLocaleDateString('en-SG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Active Tenants" value={activeTenants} subtitle={`${totalTenants} total`} icon={Building2} color="blue" trend="up" trendValue="+3 this month" />
          <StatCard title="Module Activations" value={totalModuleUsage} subtitle="Across all tenants" icon={Layers} color="purple" />
          <StatCard title="Industry Packs" value={Object.keys(INDUSTRY_PACKS).length} subtitle="Available packs" icon={Package} color="green" />
          <StatCard title="Platform Health" value="100%" subtitle="All systems operational" icon={CheckCircle2} color="green" trend="up" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-muted">
            <TabsTrigger value="overview">Tenants</TabsTrigger>
            <TabsTrigger value="modules">Modules & Packs</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="about">About Platform</TabsTrigger>
          </TabsList>

          {/* Tenants Tab */}
          <TabsContent value="overview">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold text-lg">Tenant Management</h2>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                Onboard Tenant
              </Button>
            </div>
            <div className="space-y-3">
              {tenants.map(tenant => (
                <div key={tenant.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-heading font-semibold text-foreground">{tenant.name}</h3>
                        <StatusBadge status={tenant.status} />
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[tenant.subscription_plan]}`}>
                          {SUBSCRIPTION_PLANS[tenant.subscription_plan]?.name || tenant.subscription_plan}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {INDUSTRY_LABELS[tenant.industry]} · {tenant.enabled_modules?.length || 0} modules active · Up to {tenant.max_employees} employees
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(tenant.enabled_packs || []).map(pack => (
                          <span key={pack} className="text-[10px] bg-orbitan-green-light text-orbitan-green px-2 py-0.5 rounded-full font-medium">
                            {INDUSTRY_PACKS[pack]?.name || pack}
                          </span>
                        ))}
                      </div>
                      <Link to={
                        tenant.id === 'tenant_taqueria' ? '/t1/dashboard' :
                        tenant.id === 'tenant_renewed' ? '/company' :
                        '/company'
                      }>
                        <Button variant="outline" size="sm" className="gap-1 text-xs">
                          View <ChevronRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1">
                    {(tenant.enabled_modules || []).slice(0, 8).map(mod => (
                      <span key={mod} className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                        {MODULES[mod]?.name || mod}
                      </span>
                    ))}
                    {(tenant.enabled_modules || []).length > 8 && (
                      <span className="text-[10px] text-muted-foreground px-2 py-0.5">
                        +{(tenant.enabled_modules?.length || 0) - 8} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Modules & Packs Tab */}
          <TabsContent value="modules">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><Layers className="w-4 h-4 text-orbitan-blue" />Platform Modules</h3>
                <div className="space-y-2">
                  {Object.values(MODULES).map(mod => (
                    <div key={mod.key} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{mod.name}</p>
                        <p className="text-xs text-muted-foreground">{mod.description}</p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-orbitan-green flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-orbitan-green" />Industry Packs</h3>
                <div className="space-y-2">
                  {Object.values(INDUSTRY_PACKS).map(pack => (
                    <div key={pack.key} className="bg-card border border-border rounded-lg px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-foreground">{pack.name}</p>
                        <span className="text-[10px] bg-orbitan-green-light text-orbitan-green px-2 py-0.5 rounded-full font-medium">Available</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{pack.description}</p>
                      {pack.modules && (
                        <div className="flex flex-wrap gap-1">
                          {pack.modules.map(m => (
                            <span key={m} className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">{m}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.values(SUBSCRIPTION_PLANS).map(plan => (
                <div key={plan.key} className="bg-card border border-border rounded-xl p-5 flex flex-col">
                  <div className="mb-4">
                    <h3 className="font-heading font-bold text-foreground mb-1">{plan.name}</h3>
                    <p className="text-2xl font-display font-bold text-orbitan-blue">
                      {plan.price_sgd ? `S$${plan.price_sgd}` : 'Custom'}
                      {plan.price_sgd && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <p className="text-xs font-medium text-foreground">Employees: {plan.max_employees ?? 'Unlimited'}</p>
                    <p className="text-xs font-medium text-foreground">Modules: {plan.allowed_modules.includes('all') ? 'All' : plan.allowed_modules.length}</p>
                    <p className="text-xs font-medium text-foreground">Packs: {
                      plan.allowed_packs.includes('all') ? 'All' :
                      plan.allowed_packs.includes('multiple_packs') ? 'Multiple' :
                      plan.allowed_packs.includes('one_pack') ? 'One Pack' : 'None'
                    }</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      {tenants.filter(t => t.subscription_plan === plan.key).length} active tenant(s)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about">
            <div className="max-w-2xl">
              <div className="bg-card border border-border rounded-2xl p-8">
                <div className="flex items-center gap-4 mb-8">
                  <OrbitanLogo size="lg" showOS />
                </div>
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-orbitan-blue-light rounded-xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">Created &amp; Owned By</p>
                      <p className="font-heading font-bold text-foreground">Muhammad Firdaus<br />Bin Ismail</p>
                      <p className="text-xs text-muted-foreground mt-1">Founder &amp; Product Owner</p>
                    </div>
                    <div className="bg-orbitan-green-light rounded-xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">Strategic Partner</p>
                      <p className="font-heading font-bold text-foreground">Hamka</p>
                      <p className="text-xs text-muted-foreground mt-1">Renewed Resources Pte Ltd<br />Business Dev &amp; Franchise Lead</p>
                    </div>
                  </div>
                  <div className="border border-border rounded-xl p-4 space-y-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">Platform</span><span className="font-medium">Orbitan &amp; OrbitanOS</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span className="font-medium">v{PLATFORM_IDENTITY.version}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Built on</span><span className="font-medium">Base44</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Tagline</span><span className="font-medium text-right max-w-xs">{PLATFORM_IDENTITY.tagline}</span></div>
                  </div>
                  <div className="bg-muted rounded-xl p-4">
                    <p className="text-xs leading-relaxed text-muted-foreground font-medium">
                      {PLATFORM_IDENTITY.copyright}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Orbitan &amp; OrbitanOS is a proprietary platform. All rights reserved. Unauthorised reproduction, distribution, or modification is strictly prohibited.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <PlatformFooter />
    </div>
  );
}