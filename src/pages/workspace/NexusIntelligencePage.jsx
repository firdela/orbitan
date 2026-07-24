// NexusIntelligencePage — Orbit Nexus Intelligence Dashboard (Part K)
import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import OperationalHealthScore from '@/components/nexus/OperationalHealthScore';
import DailyBriefing from '@/components/nexus/DailyBriefing';
import AnomalyList from '@/components/nexus/AnomalyList';
import NexusCopilot from '@/components/nexus/NexusCopilot';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, RefreshCw, TrendingUp, AlertTriangle, ListChecks, Percent } from 'lucide-react';

export default function NexusIntelligencePage() {
  const { tenantId } = useOutletContext() || {};
  const [health, setHealth] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [recs, setRecs] = useState(null);
  const [margin, setMargin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    const results = await Promise.allSettled([
      base44.functions.invoke('nexusIntelligence', { action: 'health_score', tenant_id: tenantId }),
      base44.functions.invoke('nexusIntelligence', { action: 'daily_briefing', tenant_id: tenantId }),
      base44.functions.invoke('nexusIntelligence', { action: 'anomalies', tenant_id: tenantId }),
      base44.functions.invoke('nexusIntelligence', { action: 'recommendations', tenant_id: tenantId }),
      base44.functions.invoke('nexusIntelligence', { action: 'margin_analysis', tenant_id: tenantId }),
    ]);
    setHealth(results[0].value?.data || results[0].value || null);
    setBriefing(results[1].value?.data || results[1].value || null);
    setAnomalies(results[2].value?.data || results[2].value || null);
    setRecs(results[3].value?.data || results[3].value || null);
    setMargin(results[4].value?.data || results[4].value || null);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in space-y-6">
      <PageHeader
        title="Orbit Nexus Intelligence"
        subtitle="Grounded operational decision engine · evidence-based · never fabricates"
        help={{
          title: 'Orbit Nexus Intelligence',
          content: 'Orbit Nexus observes, analyses and recommends across your operational data. All scores and anomalies are deterministic (rule-based) — predictive forecasting is scaffolded but not active until sufficient pilot history exists.',
          tips: [
            'The Operational Health Score is a deterministic weighted composite — see rule set v1.',
            'Anomalies are rule-based thresholds, not ML predictions.',
            'The Business Copilot never executes actions — confirm via existing governed flows.',
          ],
        }}
        actions={<Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5">{loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}Refresh</Button>}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview" className="text-xs gap-1.5"><TrendingUp className="w-3.5 h-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="briefing" className="text-xs gap-1.5">Briefing</TabsTrigger>
          <TabsTrigger value="anomalies" className="text-xs gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />Anomalies</TabsTrigger>
          <TabsTrigger value="margin" className="text-xs gap-1.5"><Percent className="w-3.5 h-3.5" />Margin</TabsTrigger>
          <TabsTrigger value="copilot" className="text-xs gap-1.5">Copilot</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <OperationalHealthScore data={health} loading={loading} />
            <DailyBriefing data={briefing} loading={loading} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnomalyList data={anomalies} loading={loading} />
            <RecommendationsCard data={recs} loading={loading} />
          </div>
          <NexusCopilot tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="briefing" className="mt-4 max-w-2xl"><DailyBriefing data={briefing} loading={loading} /></TabsContent>
        <TabsContent value="anomalies" className="mt-4 max-w-2xl"><AnomalyList data={anomalies} loading={loading} /></TabsContent>
        <TabsContent value="margin" className="mt-4"><MarginCard data={margin} loading={loading} /></TabsContent>
        <TabsContent value="copilot" className="mt-4 max-w-2xl"><NexusCopilot tenantId={tenantId} /></TabsContent>
      </Tabs>
    </div>
  );
}

function RecommendationsCard({ data, loading }) {
  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!data) return null;
  const recs = data.recommended_actions || [];
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-2"><ListChecks className="w-4 h-4 text-orbitan-blue" /> Recommendations</h3>
        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">Rule-Based</span>
      </div>
      {data.data_sufficiency === false ? <p className="text-xs text-muted-foreground">{data.insufficient_data_reason}</p> : recs.length === 0 ? (
        <p className="text-xs text-muted-foreground flex items-center gap-2"><span className="text-orbitan-green">✓</span>All operational thresholds within normal range.</p>
      ) : (
        <ul className="space-y-1.5">{recs.map((r, i) => <li key={i} className="text-xs text-foreground flex items-start gap-2 border-b border-border/50 pb-1.5"><span className="text-orbitan-amber">→</span><span>{r.label}</span></li>)}</ul>
      )}
    </div>
  );
}

function MarginCard({ data, loading }) {
  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!data) return null;
  const m = data.metric_snapshot || {};
  if (data.data_sufficiency === false) {
    return <div className="bg-card border border-border rounded-xl p-5"><h3 className="font-heading font-semibold text-sm mb-2">Margin Intelligence</h3><p className="text-xs text-muted-foreground">{data.insufficient_data_reason}</p></div>;
  }
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-heading font-semibold text-sm mb-3">Margin Intelligence</h3>
        {data.summary && <p className="text-xs text-muted-foreground mb-3">{data.summary}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-orbitan-green mb-1.5">Most Profitable</p>
            {(m.mostProfitable || []).map((r, i) => <div key={i} className="flex justify-between text-xs py-1 border-b border-border/50"><span>{r.name}</span><span className="tabular-nums font-medium text-orbitan-green">{r.actual_margin}%</span></div>)}
          </div>
          <div>
            <p className="text-xs font-semibold text-orbitan-red mb-1.5">Lowest Margin</p>
            {(m.lowestMargin || []).map((r, i) => <div key={i} className="flex justify-between text-xs py-1 border-b border-border/50"><span>{r.name}</span><span className="tabular-nums font-medium text-orbitan-red">{r.actual_margin}%</span></div>)}
          </div>
        </div>
        {(m.belowTarget || []).length > 0 && (
          <div className="mt-3 bg-orbitan-amber-light border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800">{m.belowTarget.length} recipe(s) below 50% target margin — review pricing or ingredient costs. (No automatic price changes.)</div>
        )}
      </div>
    </div>
  );
}