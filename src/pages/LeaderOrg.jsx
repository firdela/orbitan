import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { PLATFORM_IDENTITY, MODULES, INDUSTRY_PACKS, INDUSTRY_LABELS, OPERATING_CYCLE } from '@/lib/orbitan-config';
import { DEMO_TENANTS } from '@/lib/use-tenant.jsx';
import { LAUNCH_MANIFESTS, getManifestList } from '@/lib/tenant-registry';
import { getActivePacks, getFuturePacks } from '@/lib/orbitan-engine';
import OrbitanLogo from '@/components/layout/OrbitanLogo';
import PlatformFooter from '@/components/layout/PlatformFooter';
import StatCard from '@/components/shared/StatCard';
import { PlanBadge } from '@/components/shared/PackBadge';
import { CapabilityBadge, CapabilityStack } from '@/components/shared/CapabilityBadge';
import { Button } from '@/components/ui/button';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import CurrencyDropdown from '@/components/shared/CurrencyDropdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TenantCommandCard from '@/components/leader/TenantCommandCard';
import SubscriptionPlansAccordion from '@/components/subscriptions/SubscriptionPlansAccordion';
import OrchestratorTab from '@/components/orchestrator/OrchestratorTab';
import AnnouncementsManager from '@/components/announcements/AnnouncementsManager';
import PilotCommandCenter from '@/components/leader/PilotCommandCenter';
import { Megaphone, Radar } from 'lucide-react';
import {
  Building2, Package, Shield, ChevronRight,
  Cpu, Layers, Plus, CheckCircle2, RefreshCw,
  Rocket, Activity, Zap, Wallet, ShoppingBag } from 'lucide-react';

export default function LeaderOrg() {
  const [activeTab, setActiveTab] = useState('overview');
  // Manifests loaded directly from tenant-registry.js (no function call)
  const [manifests] = useState(() => getManifestList());
  const [activating, setActivating] = useState(null);
  const [reports, setReports] = useState({});

  const tenants = DEMO_TENANTS;
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === 'active').length;
  const totalModuleUsage = tenants.reduce((acc, t) => acc + (t.enabled_modules?.length || 0), 0);

  const handleActivate = async (tenantRef) => {
    setActivating(tenantRef);
    const manifest = LAUNCH_MANIFESTS[tenantRef];
    if (!manifest) return;
    const res = await base44.functions.invoke('onboardingService', { action: 'activate_tenant', manifest });
    setReports(prev => ({ ...prev, [tenantRef]: res.data?.report }));
    setActivating(null);
  };

  const handleActivateAll = async () => {
    setActivating('all');
    const allManifests = Object.values(LAUNCH_MANIFESTS);
    const res = await base44.functions.invoke('onboardingService', { action: 'activate_all', manifests: allManifests });
    const newReports = {};
    (res.data?.reports || []).forEach(r => { newReports[r.tenant_ref] = r; });
    setReports(newReports);
    setActivating(null);
  };

  // Map manifest array → lookup by tenant_ref
  const manifestByRef = {};
  manifests.forEach(m => { manifestByRef[m.tenant_ref] = m; });

  const TENANT_MANIFEST_REF = {
    tenant_taqueria: 'taqueria_pte_ltd',
    tenant_renewed:  'renewed_resources_pte_ltd',
    tenant_retail:   'renewed_fashion',
    tenant_izaliqa:  'izaliqa_bakes',
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Nav */}
      <header className="border-b border-border bg-background sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <OrbitanLogo size="sm" showOS />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="hidden lg:flex items-center gap-2 bg-orbitan-blue-light text-orbitan-blue px-3 py-1.5 rounded-lg text-xs font-semibold">
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
            <TabsTrigger value="orchestrator" className="gap-1.5">
              <Shield className="w-3.5 h-3.5" />Orchestrator
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="gap-1.5">
              <Megaphone className="w-3.5 h-3.5" />Broadcast
            </TabsTrigger>
            <TabsTrigger value="pilot" className="gap-1.5">
              <Radar className="w-3.5 h-3.5" />Pilot Control
            </TabsTrigger>
            <TabsTrigger value="about">About Platform</TabsTrigger>
          </TabsList>

          {/* Tenants Command Center Tab */}
          <TabsContent value="overview">
            {/* Header row */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-heading font-semibold text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orbitan-blue" /> Tenant Command Center
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Expand any tenant to manage capabilities, modules &amp; activation.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={handleActivateAll}
                  disabled={activating !== null}
                >
                  {activating === 'all'
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Activating All...</>
                    : <><Zap className="w-3.5 h-3.5" /> Activate All</>
                  }
                </Button>
                <Button size="sm" className="gap-1.5">
                  <Plus className="w-4 h-4" /> Onboard Tenant
                </Button>
              </div>
            </div>

            {/* Unified Tenant Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {tenants.map(tenant => {
                const mRef = TENANT_MANIFEST_REF[tenant.id];
                return (
                  <TenantCommandCard
                    key={tenant.id}
                    tenant={tenant}
                    manifest={manifestByRef[mRef]}
                    activating={activating}
                    onActivate={handleActivate}
                    report={reports[mRef]}
                  />
                );
              })}
            </div>
          </TabsContent>

          {/* Modules & Packs Tab */}
          <TabsContent value="modules">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orbitan-blue" /> Platform Modules
                </h3>
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
                <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-orbitan-green" /> Industry Packs
                </h3>
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
                        <CapabilityStack packs={pack.modules.map((m) => ({ type: m.toLowerCase().replace(/\s+/g, '_'), label: m }))} />
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
                  <CapabilityStack packs={Object.values(MODULES).filter((m) => m.principle === principle.key).map((m) => ({ type: m.key, label: m.name }))} />
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

          {/* Orchestrator Tab */}
          <TabsContent value="orchestrator">
            <OrchestratorTab />
          </TabsContent>

          {/* Broadcast Tab */}
          <TabsContent value="broadcast">
            <AnnouncementsManager
              tenantId="taqueria_pte_ltd"
              publisherName="Firdaus"
              publisherRole="admin"
            />
          </TabsContent>
          <TabsContent value="pilot">
            <PilotCommandCenter />
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