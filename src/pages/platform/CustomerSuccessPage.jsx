// CustomerSuccessPage — Build #20 Customer Success Workspace (11 sections)
// Principle: Reach + Relate · Admin-only · Deterministic, evidence-based
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import { ShieldAlert, Loader2, RefreshCw, LayoutDashboard, Users, ClipboardCheck, Heart, TrendingUp, History, StickyNote, LifeBuoy, Sparkles, Flag, MessageSquare } from 'lucide-react';
import CSExecutiveDashboard from '@/components/customer-success/CSExecutiveDashboard';
import CSCustomerOverview from '@/components/customer-success/CSCustomerOverview';
import CSOnboardingProgress from '@/components/customer-success/CSOnboardingProgress';
import CSHealthScore from '@/components/customer-success/CSHealthScore';
import CSProductAdoption from '@/components/customer-success/CSProductAdoption';
import CSCustomerTimeline from '@/components/customer-success/CSCustomerTimeline';
import CSCustomerNotes from '@/components/customer-success/CSCustomerNotes';
import CSSupportOverview from '@/components/customer-success/CSSupportOverview';
import CSRecommendations from '@/components/customer-success/CSRecommendations';
import CSMilestones from '@/components/customer-success/CSMilestones';
import CSFeedback from '@/components/customer-success/CSFeedback';
import CSDetailDrawer from '@/components/customer-success/CSDetailDrawer';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'onboarding', label: 'Onboarding', icon: ClipboardCheck },
  { key: 'health', label: 'Health', icon: Heart },
  { key: 'adoption', label: 'Adoption', icon: TrendingUp },
  { key: 'timeline', label: 'Timeline', icon: History },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'support', label: 'Support', icon: LifeBuoy },
  { key: 'ai', label: 'AI Insights', icon: Sparkles },
  { key: 'milestones', label: 'Milestones', icon: Flag },
  { key: 'feedback', label: 'Feedback', icon: MessageSquare },
];

export default function CustomerSuccessPage() {
  const { user, isLoadingAuth } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('customerSuccess', { action: 'overview' });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch (err) { setData({ error: err?.message || 'Failed to load customer success data' }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDetail = useCallback(async (tenantId) => {
    setDetailLoading(true); setDetail(null);
    try {
      const res = await base44.functions.invoke('customerSuccess', { action: 'tenant_detail', tenant_id: tenantId });
      setDetail(res.data || res);
    } catch (e) { setDetail({ error: e?.message }); }
    finally { setDetailLoading(false); }
  }, []);

  const selectCustomer = useCallback((c) => {
    setSelected(c);
    setDrawerOpen(true);
    if (c?.tenant_id) loadDetail(c.tenant_id);
  }, [loadDetail]);

  const handleAddNote = useCallback(async (tenantId, note, priority, tags) => {
    if (!note?.trim()) return;
    setSavingNote(true);
    try {
      await base44.functions.invoke('customerSuccess', { action: 'add_note', tenant_id: tenantId, note: note.trim(), priority, tags });
      if (selected?.tenant_id) await loadDetail(selected.tenant_id);
      await load();
    } catch (e) { /* ignore */ } finally { setSavingNote(false); }
  }, [selected, loadDetail, load]);

  // ── RBAC guard (mirrors backend admin-only check) ──
  if (isLoadingAuth) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user || user.role !== 'admin') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto animate-fade-in">
        <PageHeader title="Customer Success Workspace" subtitle="Cross-tenant customer success" />
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-6 text-center">
          <ShieldAlert className="w-10 h-10 text-orbitan-amber mx-auto mb-3" />
          <h3 className="text-lg font-heading font-bold text-foreground mb-1">Platform admin access required</h3>
          <p className="text-sm text-muted-foreground">The Customer Success Workspace is restricted to platform administrators. Your current role does not have permission to view cross-tenant customer data.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-8"><LoadingState message="Loading customer success workspace…" size="lg" /></div>;
  if (data?.error) return <div className="p-8"><div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{data.error}</div></div>;
  if (!data) return null;

  const customers = data.customers || [];
  const rollup = data.rollup || {};
  const recommendations = data.recommendations || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <PageHeader title="Customer Success Workspace" subtitle="Cross-tenant health, adoption, onboarding, health scores, timeline, notes, support, AI recommendations, milestones & feedback — deterministic & evidence-based"
        help="Health is a weighted composite of adoption, activity, support, compliance, workforce, inventory, and AI usage. Recommendations are deterministic rules — no LLM automation."
        actions={<Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Refresh</Button>} />

      {customers.length === 0 ? (
        <EmptyState icon={Users} title="No pilot customers" description="No pilot tenants found. Provision pilot tenants from the Pilot Administration page to populate the Customer Success Workspace." color="blue" size="large" />
      ) : (
        <>
          {/* Tab navigation */}
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-auto flex-wrap justify-start gap-0.5">
                {TABS.map(t => {
                  const Icon = t.icon;
                  return (
                    <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                      <Icon className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          {/* Active section */}
          <div className="min-h-[300px]">
            {activeTab === 'dashboard' && <CSExecutiveDashboard rollup={rollup} customers={customers} onSelectCustomer={selectCustomer} />}
            {activeTab === 'customers' && <CSCustomerOverview customers={customers} onSelectCustomer={selectCustomer} selectedId={selected?.tenant_id} />}
            {activeTab === 'onboarding' && <CSOnboardingProgress customers={customers} onSelectCustomer={selectCustomer} />}
            {activeTab === 'health' && <CSHealthScore customers={customers} onSelectCustomer={selectCustomer} selectedId={selected?.tenant_id} />}
            {activeTab === 'adoption' && <CSProductAdoption customers={customers} />}
            {activeTab === 'timeline' && <CSCustomerTimeline selected={selected} detail={detail} detailLoading={detailLoading} milestones={selected?.milestones} />}
            {activeTab === 'notes' && <CSCustomerNotes selected={selected} detail={detail} detailLoading={detailLoading} onAddNote={handleAddNote} saving={savingNote} />}
            {activeTab === 'support' && <CSSupportOverview customers={customers} onSelectCustomer={selectCustomer} />}
            {activeTab === 'ai' && <CSRecommendations recommendations={recommendations} onSelectCustomer={selectCustomer} />}
            {activeTab === 'milestones' && <CSMilestones customers={customers} onSelectCustomer={selectCustomer} />}
            {activeTab === 'feedback' && <CSFeedback customers={customers} onSelectCustomer={selectCustomer} />}
          </div>
        </>
      )}

      {/* Detail drawer */}
      {drawerOpen && selected && (
        <CSDetailDrawer selected={selected} detail={detail} detailLoading={detailLoading} onClose={() => setDrawerOpen(false)}
          onAddNote={handleAddNote} savingNote={savingNote} />
      )}

      <p className="text-[10px] text-muted-foreground text-center">Rule set {data.rule_version} · app {data.app_version} · computed {new Date(data.generated_at).toLocaleString()}</p>
    </div>
  );
}