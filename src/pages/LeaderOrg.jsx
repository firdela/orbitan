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
import CurrencyDropdown from '@/components/shared/CurrencyDropdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RampUpPanel from '@/components/leader/RampUpPanel';
import CapabilityStack from '@/components/leader/CapabilityStack';
import OrbitanLoader from '@/components/brand/OrbitanLoader';
import SubscriptionPlansAccordion from '@/components/subscriptions/SubscriptionPlansAccordion';
import WalletCreditBar from '@/components/wallet/WalletCreditBar';
import ShieldStatusWidget from '@/components/shield/ShieldStatusWidget';
import {
  Building2, Users, Package, BarChart2, Shield, Settings, ChevronRight,
  Globe, Cpu, Layers, Flag, CreditCard, Info, Plus, RefreshCw, CheckCircle2,
  AlertTriangle, TrendingUp, Zap, Star, Lock, Rocket, Leaf, Activity,
  Wallet, ShoppingBag } from 'lucide-react';

export default function LeaderOrg() {
  const [activeTab, setActiveTab] = useState('overview');
  const [tenantView, setTenantView] = useState('management'); // 'management' | 'capability' | 'rampup'
  const tenants = DEMO_TENANTS;

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === 'active').length;
  const totalModuleUsage = tenants.reduce((acc, t) => acc + (t.enabled_modules?.length || 0), 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Nav */}
      <header className="border-b border-border bg-background sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <OrbitanLogo size="md" showOS />
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 bg-orbitan-blue-light text-orbitan-blue px-3 py-1.5 rounded-lg text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              Platform Owner Console
            </div>
            <CurrencyDropdown />
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

        {/* Revenue Engine Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <Link to="/platform/wallet" className="group bg-gradient-to-br from-[#1D4ED8] to-[#111827] rounded-xl p-4 flex items-center gap-3 hover:shadow-lg transition-shadow">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Orbitan Wallet</p>
              <p className="text-[11px] text-blue-300">Credits · Rewards · Cashback</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
          </Link>
          <Link to="/platform/marketplace" className="group bg-gradient-to-br from-[#6D28D9] to-[#111827] rounded-xl p-4 flex items-center gap-3 hover:shadow-lg transition-shadow">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Orbitan Marketplace</p>
              <p className="text-[11px] text-purple-300">Modules · Packs · Integrations</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
          </Link>
          <Link to="/platform/shield" className="group bg-gradient-to-br from-[#111827] to-[#1F2937] rounded-xl p-4 flex items-center gap-3 hover:shadow-lg transition-shadow border border-[#D4AF37]/20">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Orbitan Shield™</p>
              <p className="text-[11px] text-[#D4AF37]/70">Regulate · Govern · Protect</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
          </Link>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-muted flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="gap-1.5">
              <Building2 className="w-3.5 h-3.5" />Tenants
            </TabsTrigger>
            <TabsTrigger value="modules">Modules &amp; Packs</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="cycle">Operating Cycle</TabsTrigger>
            <TabsTrigger value="about">About Platform</TabsTrigger>
          </TabsList>

          {/* Tenants Command Center Tab */}
          <TabsContent value="overview">
            {/* Sub-navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex bg-muted rounded-lg p-1 gap-1">
                <button
                  onClick={() => setTenantView('management')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${tenantView === 'management' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Building2 className="w-3.5 h-3.5" /> Management
                </button>
                <button
                  onClick={() => setTenantView('capability')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${tenantView === 'capability' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Layers className="w-3.5 h-3.5" /> Capability Stack
                </button>
                <button
                  onClick={() => setTenantView('rampup')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${tenantView === 'rampup' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Rocket className="w-3.5 h-3.5" /> Ramp Up
                </button>
              </div>
              {tenantView === 'management' && (
                <Button size="sm" className="gap-1.5 flex-shrink-0">
                  <Plus className="w-4 h-4" /> Onboard Tenant
                </Button>
              )}
            </div>

            {/* Management View */}
            {tenantView === 'management' && (
              <div className="space-y-3 animate-fade-in">
                {tenants.map((tenant) =>
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
                            tenant.id === 'tenant_renewed' ? ['core', 'recycling', 'compliance'] :
                            ['core', 'retail']
                          )}
                          size="xs" />
                        <Link to={
                          tenant.id === 'tenant_taqueria' ? '/t1/dashboard' :
                          tenant.id === 'tenant_renewed' ? '/t2/dashboard' :
                          tenant.id === 'tenant_retail' ? '/t3/dashboard' :
                          '/leader-org'
                        }>
                          <Button variant="outline" size="sm" className="gap-1 text-xs">
                            View <ChevronRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1">
                      {(tenant.enabled_modules || []).slice(0, 8).map((mod) =>
                        <span key={mod} className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                          {MODULES[mod]?.name || mod}
                        </span>
                      )}
                      {(tenant.enabled_modules || []).length > 8 &&
                        <span className="text-[10px] text-muted-foreground px-2 py-0.5">
                          +{(tenant.enabled_modules?.length || 0) - 8} more
                        </span>
                      }
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Capability Stack View */}
            {tenantView === 'capability' && (
              <div className="animate-fade-in">
                <CapabilityStack />
              </div>
            )}

            {/* Ramp Up View */}
            {tenantView === 'rampup' && (
              <div className="animate-fade-in">
                <RampUpPanel />
              </div>
            )}
          </TabsContent>

          {/* Modules & Packs Tab */}
          <TabsContent value="modules">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><Layers className="w-4 h-4 text-orbitan-blue" />Platform Modules</h3>
                <div className="space-y-2">
                  {Object.values(MODULES).map((mod) =>
                  <div key={mod.key} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{mod.name}</p>
                        <p className="text-xs text-muted-foreground">{mod.description}</p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-orbitan-green flex-shrink-0" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-heading font-semibold mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-orbitan-green" />Industry Packs</h3>

                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Activity className="w-3 h-3" /> Active Launch Packs
                </p>
                <div className="space-y-2 mb-4">
                  {getActivePacks().map((pack) =>
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
                      {pack.modules &&
                    <div className="flex flex-wrap gap-1">
                          {pack.modules.map((m) =>
                      <span key={m} className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">{m}</span>
                      )}
                        </div>
                    }
                    </div>
                  )}
                </div>

                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Rocket className="w-3 h-3" /> Future-Proofed Packs (Seeded)
                </p>
                <div className="space-y-2">
                  {getFuturePacks().map((pack) =>
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
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <SubscriptionPlansAccordion tenants={tenants} />
          </TabsContent>

          {/* Operating Cycle Tab */}
          <TabsContent value="cycle">
            <div className="mb-6">
              <h2 className="font-heading font-semibold text-lg mb-1">The OrbitanOS Operating Cycle</h2>
              <p className="text-sm text-muted-foreground">The 6 principles that power every module, workflow, and audit trail in OrbitanOS.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {Object.values(OPERATING_CYCLE).map((principle, idx) =>
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
                    {Object.values(MODULES).
                  filter((m) => m.principle === principle.key).
                  map((m) =>
                  <span key={m.key} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ color: principle.color, background: principle.color + '15', border: `1px solid ${principle.color}30` }}>
                          {m.name}
                        </span>
                  )}
                  </div>
                </div>
              )}
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
                      <p className="font-heading font-bold text-foreground">Hamka Ariffin</p>
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
    </div>);

}