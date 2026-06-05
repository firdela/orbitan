import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { PLATFORM_IDENTITY, SUBSCRIPTION_PLANS, MODULES, INDUSTRY_PACKS, INDUSTRY_LABELS, OPERATING_CYCLE, LAUNCH_TENANTS } from '@/lib/orbitan-config';
import { DEMO_TENANTS } from '@/lib/use-tenant.jsx';
import { getAllPacks, getActivePacks, getFuturePacks } from '@/lib/orbitan-engine';
import OrbitanLogo from '@/components/layout/OrbitanLogo';
import PlatformFooter from '@/components/layout/PlatformFooter';
import StatCard from '@/components/shared/StatCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { PackBadgeGroup, PlanBadge } from '@/components/shared/PackBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2, Users, Package, BarChart2, Shield, Settings, ChevronRight,
  Globe, Cpu, Layers, Flag, CreditCard, Info, Plus, RefreshCw, CheckCircle2,
  AlertTriangle, TrendingUp, Zap, Star, Lock, Rocket, Leaf, Activity
} from 'lucide-react';

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
            <TenantSwitcher />
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
          <TabsList className="mb-6 bg-muted flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Tenants</TabsTrigger>
            <TabsTrigger value="modules">Modules & Packs</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="cycle">Operating Cycle</TabsTrigger>
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
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-heading font-semibold text-foreground">{tenant.name}</h3>
                        <StatusBadge status={tenant.status} />
                        <PlanBadge plan={tenant.subscription_plan} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {INDUSTRY_LABELS[tenant.industry]} · {tenant.enabled_modules?.length || 0} modules active · Up to {tenant.max_employees} employees
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <PackBadgeGroup
                        packs={tenant.enabled_packs || (
                          tenant.id === 'tenant_taqueria' ? ['core', 'fnb', 'finance', 'compliance'] :
                          tenant.id === 'tenant_renewed'  ? ['core', 'recycling', 'compliance'] :
                          ['core', 'retail']
                        )}
                        size="xs"
                      />
                      <Link to={
                        tenant.id === 'tenant_taqueria' ? '/t1/dashboard' :
                        tenant.id === 'tenant_renewed'  ? '/t2/dashboard' :
                        tenant.id === 'tenant_retail'   ? '/t3/dashboard' :
                        '/leader-org'
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
                <h3 className="font-heading font-semibold mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-orbitan-green" />Industry Packs</h3>

                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Activity className="w-3 h-3" /> Active Launch Packs
                </p>
                <div className="space-y-2 mb-4">
                  {getActivePacks().map(pack => (
                    <div key={pack.key} className="bg-card border border-border rounded-lg px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: pack.color_hex }} />
                          <p className="text-sm font-medium text-foreground">{pack.name}</p>
                        </div>
                        <span className="text-[10px] bg-orbitan-green-light text-orbitan-green px-2 py-0.5 rounded-full font-medium">Live</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{pack.description}</p>
                      <p className="text-[10px] text-muted-foreground mb-2">Tenants: {pack.launch_tenants.join(', ')}</p>
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

                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Rocket className="w-3 h-3" /> Future-Proofed Packs (Seeded)
                </p>
                <div className="space-y-2">
                  {getFuturePacks().map(pack => (
                    <div key={pack.key} className="bg-card border border-dashed border-border rounded-lg px-4 py-3 opacity-70">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: pack.color_hex }} />
                          <p className="text-sm font-medium text-foreground">{pack.name}</p>
                        </div>
                        <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-medium">Ready to Activate</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{pack.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <div className="mb-4">
              <h2 className="font-heading font-semibold text-lg mb-1">Subscription Tiers</h2>
              <p className="text-sm text-muted-foreground">OrbitanOS plan hierarchy — each tier is a superset of the tier below it.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { key: 'orbitan_starter', price: 'S$49', period: '/mo', employees: '10', modules: 'Core only', packs: 'Core only', description: 'Single outlet, small teams.' },
                { key: 'orbitan_growth', price: 'S$149', period: '/mo', employees: '50', modules: '8 modules', packs: '1 Industry Pack', description: 'Growing businesses, one pack.' },
                { key: 'orbitan_business', price: 'S$399', period: '/mo', employees: '250', modules: 'All standard', packs: 'Multiple Packs + AI', description: 'Multi-site, AI suite, integrations.' },
                { key: 'orbitan_enterprise', price: 'Custom', period: '', employees: 'Unlimited', modules: 'All + future', packs: 'All Packs', description: 'Enterprise governance, SSO, dedicated CSM.' },
              ].map((plan, idx) => {
                const tierCount = tenants.filter(t => t.subscription_plan === plan.key).length;
                const isEnterprise = plan.key === 'orbitan_enterprise';
                return (
                  <div key={plan.key} className={`bg-card border rounded-xl p-5 flex flex-col ${isEnterprise ? 'border-[#D4AF37]/40 shadow-md' : 'border-border'}`}>
                    {isEnterprise && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-[#D4AF37] mb-2">
                        <Star className="w-3 h-3" /> FLAGSHIP
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                       <PlanBadge plan={plan.key} />
                       <span className="text-[10px] text-muted-foreground">Tier {SUBSCRIPTION_PLANS[plan.key]?.tier_level}</span>
                     </div>
                    <p className="text-2xl font-display font-bold text-foreground mb-0.5">
                      {plan.price}<span className="text-sm font-normal text-muted-foreground">{plan.period}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
                    <div className="space-y-2 flex-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Employees</span>
                        <span className="font-medium">{plan.employees}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Modules</span>
                        <span className="font-medium">{plan.modules}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Packs</span>
                        <span className="font-medium">{plan.packs}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{tierCount} tenant{tierCount !== 1 ? 's' : ''}</p>
                      {tierCount > 0 && <CheckCircle2 className="w-3.5 h-3.5 text-orbitan-green" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Feature Gate Legend */}
            <div className="mt-6 bg-muted rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-heading font-semibold text-sm">Feature Gating — Exit-Ready Architecture</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All module and pack access is enforced by <code className="bg-card px-1.5 py-0.5 rounded text-foreground font-mono">lib/orbitan-plans.js</code> — a pure JavaScript library with zero platform dependencies.
                This means subscription enforcement logic is fully portable to any backend stack (Node.js, Deno, AWS Lambda, etc.) without modification.
                The <code className="bg-card px-1.5 py-0.5 rounded text-foreground font-mono">subscriptionGate</code> backend function validates access server-side,
                and the <code className="bg-card px-1.5 py-0.5 rounded text-foreground font-mono">SubscriptionGate</code> UI component enforces it client-side.
              </p>
            </div>
          </TabsContent>

          {/* Operating Cycle Tab */}
          <TabsContent value="cycle">
            <div className="mb-6">
              <h2 className="font-heading font-semibold text-lg mb-1">The OrbitanOS Operating Cycle</h2>
              <p className="text-sm text-muted-foreground">The 6 principles that power every module, workflow, and audit trail in OrbitanOS.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {Object.values(OPERATING_CYCLE).map((principle, idx) => (
                <div key={principle.key} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm flex-shrink-0"
                      style={{ background: principle.color }}>
                      {idx + 1}
                    </div>
                    <h3 className="font-display font-bold text-foreground text-lg">{principle.label}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{principle.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.values(MODULES)
                      .filter(m => m.principle === principle.key)
                      .map(m => (
                        <span key={m.key} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ color: principle.color, background: principle.color + '15', border: `1px solid ${principle.color}30` }}>
                          {m.name}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-muted rounded-xl p-5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Exit-Ready Architecture Note:</span>{' '}
                The Operating Cycle is embedded as metadata in <code className="bg-card px-1.5 py-0.5 rounded font-mono">lib/orbitan-config.js</code> via the <code className="bg-card px-1.5 py-0.5 rounded font-mono">OPERATING_CYCLE</code> object.
                Every module is tagged with its principle key (<code className="bg-card px-1.5 py-0.5 rounded font-mono">principle: "regulate"</code>, etc.), ensuring that when you migrate stacks, the OrbitanOS DNA — including its brand philosophy — travels with the codebase.
              </p>
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