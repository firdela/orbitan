import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { PLATFORM_IDENTITY, MODULES, OPERATING_CYCLE } from '@/lib/orbitan-config';
import { DEMO_TENANTS } from '@/lib/use-tenant.jsx';
import { LAUNCH_MANIFESTS, getManifestList } from '@/lib/tenant-registry';
import { getActivePacks, getFuturePacks } from '@/lib/orbitan-engine';
import OrbitanLogo from '@/components/layout/OrbitanLogo';
import PlatformFooter from '@/components/layout/PlatformFooter';
import { PlanBadge } from '@/components/shared/PackBadge';
import { CapabilityBadge, CapabilityStack } from '@/components/shared/CapabilityBadge';
import { Button } from '@/components/ui/button';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import CurrencyDropdown from '@/components/shared/CurrencyDropdown';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import UnifiedCommandNav from '@/components/leader/UnifiedCommandNav';
import CompactLeaderHeader from '@/components/leader/CompactLeaderHeader';
import NexusDailyBrief from '@/components/leader/NexusDailyBrief';
import QuickAccess from '@/components/leader/QuickLaunchRail';
import LeaderOverviewWidgets from '@/components/leader/LeaderOverviewWidgets';
import TenantCommandCard from '@/components/leader/TenantCommandCard';
import SubscriptionPlansAccordion from '@/components/subscriptions/SubscriptionPlansAccordion';
import OrchestratorTab from '@/components/orchestrator/OrchestratorTab';
import AnnouncementsManager from '@/components/announcements/AnnouncementsManager';
import PilotCommandCenter from '@/components/leader/PilotCommandCenter';
import FeedbackIntelligenceDashboard from '@/components/leader/FeedbackIntelligenceDashboard';
import SystemHealthScoreboard from '@/components/leader/SystemHealthScoreboard';
import BlueprintAdvisor from '@/components/advisor/BlueprintAdvisor';
import BlueprintStudio from '@/components/blueprint/BlueprintStudio';
import SubscriptionPolicyManager from '@/components/platform/SubscriptionPolicyManager';
import ShieldCommandCenter from '@/pages/platform/ShieldCommandCenter';
import IntegrationHubPage from '@/pages/platform/IntegrationHubPage';
import { CONSOLE_SECTIONS } from '@/lib/navigation-registry';
import {
  Building2, Package, Shield,
  Layers, Plus, CheckCircle2, RefreshCw,
  Rocket, Activity, Zap, Target } from 'lucide-react';
import UserMenu from '@/components/shared/UserMenu';

// ── Lazy-loaded embedded console sections ──
// These render inside LeaderOrg as console sections (no standalone page navigation).
const TenantMetrics = lazy(() => import('@/pages/foundation/TenantMetrics'));
const OperationalHealthDashboard = lazy(() => import('@/pages/platform/OperationalHealthDashboard'));
const SecurityDashboard = lazy(() => import('@/pages/foundation/SecurityDashboard'));
const ExceptionCentrePage = lazy(() => import('@/pages/platform/ExceptionCentrePage'));
const SystemLogs = lazy(() => import('@/pages/foundation/SystemLogs'));
const GoLiveReadinessCentre = lazy(() => import('@/pages/platform/GoLiveReadinessCentre'));
const DeploymentPipeline = lazy(() => import('@/pages/foundation/DeploymentPipeline'));
const ChangeLog = lazy(() => import('@/pages/foundation/ChangeLog'));
const RoadmapPage = lazy(() => import('@/pages/foundation/RoadmapPage'));
const SubscriptionPage = lazy(() => import('@/pages/workspace/SubscriptionPage'));

function EmbeddedSection({ children }) {
  return (
    <div className="animate-fade-in">
      <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">Loading section…</div>}>
        {children}
      </Suspense>
    </div>
  );
}

export default function LeaderOrg() {
  // ── URL-synchronised section model ──
  // The active console section is stored in the URL (?section=<key>) so that
  // refresh preserves state, deep links work, and browser Back/Forward navigates
  // between console sections without leaving LeaderOrg.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('section') || 'overview';
  const setActiveTab = (key) => {
    setSearchParams(key === 'overview' ? {} : { section: key }, { replace: true });
  };
  // Manifests loaded directly from tenant-registry.js (no function call)
  const [manifests] = useState(() => getManifestList());
  const [activating, setActivating] = useState(null);
  const [reports, setReports] = useState({});
  const [advisorOpen, setAdvisorOpen] = useState(false);
  // Live tenant data from DB — enables manifest-driven navigation + Shield status
  const [realTenants, setRealTenants] = useState({});
  const [policyCounts, setPolicyCounts] = useState({});
  // Customer Success overview — single fetch reused for Nexus Brief + tenant enrichment
  const [csData, setCsData] = useState(null);
  const [csLoading, setCsLoading] = useState(true);
  const [csError, setCsError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [dbTenants, policies, csRes, me] = await Promise.all([
          base44.entities.Tenant.list('-created_date', 50),
          base44.entities.GovernancePolicy.filter({ is_active: true }),
          base44.functions.invoke('customerSuccess', { action: 'overview' }),
          base44.auth.me().catch(() => null),
        ]);
        // Map tenant name → full record for workspace nav + governance domain
        const byName = {};
        dbTenants.forEach(t => { byName[t.name] = t; });
        // Count active policies per tenant_id
        const counts = {};
        policies.forEach(p => { counts[p.tenant_id] = (counts[p.tenant_id] || 0) + 1; });
        setRealTenants(byName);
        setPolicyCounts(counts);
        // Customer Success overview payload
        setCsData(csRes.data || csRes || null);
        setCurrentUser(me);
      } catch (e) {
        // Fail gracefully — cards fall back to "Pages Coming Soon"
        console.error('[LeaderOrg] Failed to load tenant/policy/CS data:', e.message);
        setCsError(e.message);
      } finally {
        setCsLoading(false);
      }
    })();
  }, []);

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

  // Map customerSuccess customer data by tenant name (single fetch, reused)
  const csByName = useMemo(() => {
    const map = {};
    (csData?.customers || []).forEach(c => { map[c.name] = c; });
    return map;
  }, [csData]);

  const TENANT_MANIFEST_REF = {
    tenant_taqueria: 'taqueria_pte_ltd',
    tenant_renewed:  'renewed_resources_pte_ltd',
    tenant_retail:   'renewed_fashion',
    tenant_izaliqa:  'izaliqa_bakes',
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Nav */}
      <header className="border-b border-border bg-background sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <OrbitanLogo size="sm" showOS />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdvisorOpen(true)}
              className="gap-1.5 text-xs border-orbitan-purple/30 text-orbitan-purple hover:bg-orbitan-purple-light hidden lg:flex"
            >
              <Target className="w-3.5 h-3.5" />
              Blueprint Advisor
            </Button>
            <div className="hidden lg:flex items-center gap-2 bg-orbitan-blue-light text-orbitan-blue px-3 py-1.5 rounded-lg text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              Platform Owner Console
            </div>
            <CurrencyDropdown />
            <TenantSwitcher />
            <div className="w-28">
              <UserMenu variant="light" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-5">
        {/* Compact Leader Header */}
        <CompactLeaderHeader
          userName={currentUser?.full_name || 'Platform Owner'}
          platform={PLATFORM_IDENTITY.platform}
          os={PLATFORM_IDENTITY.os}
          version={PLATFORM_IDENTITY.version}
        />

        {/* 1. Orbit Nexus Daily Brief — highest priority content */}
        <div className="mb-4">
          <NexusDailyBrief data={csData} loading={csLoading} error={csError} />
        </div>

        {/* 2. Quick Access — immediately below the Daily Brief (always visible) */}
        <div className="mb-5">
          <QuickAccess />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <UnifiedCommandNav activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Overview Tab — Configurable KPI Widgets */}
          <TabsContent value="overview">
            <LeaderOverviewWidgets tenants={tenants} onNavigate={setActiveTab} />
          </TabsContent>

          {/* Tenants Command Center Tab */}
          <TabsContent value="tenants">
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
                <Button size="sm" className="gap-1.5" asChild>
                  <Link to="/onboarding">
                    <Plus className="w-4 h-4" /> Onboard Tenant
                  </Link>
                </Button>
              </div>
            </div>

            {/* Unified Tenant Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {tenants.map(tenant => {
                const mRef = TENANT_MANIFEST_REF[tenant.id];
                const realTenant = realTenants[tenant.name];
                const realTenantId = realTenant?.id;
                const shieldPolicyCount = realTenantId ? (policyCounts[realTenantId] || 0) : 0;
                const governanceDomain = realTenant?.governance_domain;
                const healthData = csByName[tenant.name] || null;
                return (
                  <TenantCommandCard
                    key={tenant.id}
                    tenant={{ ...tenant, governance_domain: governanceDomain }}
                    manifest={manifestByRef[mRef]}
                    activating={activating}
                    onActivate={handleActivate}
                    report={reports[mRef]}
                    realTenantId={realTenantId}
                    shieldPolicyCount={shieldPolicyCount}
                    healthData={healthData}
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

          {/* Subscriptions & Policy — Merged commercial tab */}
          <TabsContent value="subscriptions">
            <div className="space-y-8">
              <div>
                <h3 className="font-heading font-semibold text-base mb-1">Active Subscriptions</h3>
                <p className="text-xs text-muted-foreground mb-4">Manage tenant subscription plans and billing.</p>
                <SubscriptionPlansAccordion tenants={tenants} />
              </div>
              <div className="pt-6 border-t border-border">
                <h3 className="font-heading font-semibold text-base mb-1">Subscription Policies</h3>
                <p className="text-xs text-muted-foreground mb-4">Define commercial entitlements and resource limits per plan tier.</p>
                <SubscriptionPolicyManager />
              </div>
              <div className="pt-6 border-t border-border">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-heading font-semibold text-base">Modules &amp; Packs</h3>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setActiveTab('modules')}>
                    View Modules &amp; Packs
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Platform modules and industry packs available for tenant activation.</p>
              </div>
            </div>
          </TabsContent>

          {/* Platform Identity Tab */}
          <TabsContent value="platform-identity">
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
          </TabsContent>

          {/* System Controls Tab — Orchestrator & Broadcast combined */}
          <TabsContent value="system-controls">
            <div className="space-y-6">
              <SystemHealthScoreboard />
              <OrchestratorTab />
              <div className="pt-6 border-t border-border">
                <AnnouncementsManager
                  tenantId="taqueria_pte_ltd"
                  publisherName={currentUser?.full_name || 'Platform Admin'}
                  publisherRole={currentUser?.role || 'admin'}
                />
              </div>
            </div>
          </TabsContent>

          {/* Blueprint Studio Tab */}
          <TabsContent value="blueprint">
            <BlueprintStudio />
          </TabsContent>

          <TabsContent value="pilot-control">
            <PilotCommandCenter />
          </TabsContent>

          {/* Feedback Intelligence — AI-analysed pilot feedback */}
          <TabsContent value="feedback-intelligence">
            <FeedbackIntelligenceDashboard />
          </TabsContent>

          {/* Shield Command — Governance policies and security oversight */}
          <TabsContent value="shield-command">
            <ShieldCommandCenter />
          </TabsContent>

          {/* Integration Hub — Xero, Stripe, and external service connections */}
          <TabsContent value="integration-hub">
            <IntegrationHubPage />
          </TabsContent>

          {/* ── Embedded Console Sections ── */}
          {/* These render existing canonical pages inside the Platform Console,
              avoiding standalone page navigation for dashboard/monitoring views. */}

          <TabsContent value="tenant-insights">
            <EmbeddedSection><TenantMetrics /></EmbeddedSection>
          </TabsContent>

          <TabsContent value="integration-health">
            <EmbeddedSection><IntegrationHubPage /></EmbeddedSection>
          </TabsContent>

          <TabsContent value="system-health">
            <EmbeddedSection><OperationalHealthDashboard /></EmbeddedSection>
          </TabsContent>

          <TabsContent value="operational-health">
            <EmbeddedSection><OperationalHealthDashboard /></EmbeddedSection>
          </TabsContent>

          <TabsContent value="security-centre">
            <EmbeddedSection><SecurityDashboard /></EmbeddedSection>
          </TabsContent>

          <TabsContent value="incident-response">
            <EmbeddedSection><ExceptionCentrePage /></EmbeddedSection>
          </TabsContent>

          <TabsContent value="activity-logs">
            <EmbeddedSection><SystemLogs /></EmbeddedSection>
          </TabsContent>

          <TabsContent value="release-readiness">
            <EmbeddedSection><GoLiveReadinessCentre /></EmbeddedSection>
          </TabsContent>

          <TabsContent value="deployment-pipeline">
            <EmbeddedSection><DeploymentPipeline /></EmbeddedSection>
          </TabsContent>

          <TabsContent value="change-log">
            <EmbeddedSection><ChangeLog /></EmbeddedSection>
          </TabsContent>

          <TabsContent value="roadmap">
            <EmbeddedSection><RoadmapPage /></EmbeddedSection>
          </TabsContent>

          <TabsContent value="subscription-billing">
            <EmbeddedSection><SubscriptionPage /></EmbeddedSection>
          </TabsContent>

          {/* Platform Identity (About) - Merged with Operating Cycle */}
          <TabsContent value="about">
            <div className="max-w-2xl">
              <div className="bg-card border border-border rounded-2xl p-8">
                <div className="flex items-center gap-4 mb-8">
                  <OrbitanLogo size="lg" showOS />
                </div>
                <div className="space-y-4 text-sm">
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

      {/* Blueprint Advisor Slide-in Panel */}
      <BlueprintAdvisor
        open={advisorOpen}
        onClose={() => setAdvisorOpen(false)}
      />
    </div>);

}