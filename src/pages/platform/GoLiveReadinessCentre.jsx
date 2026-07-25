// GoLiveReadinessCentre — unified system/platform readiness for go-live (Build #18, Part 3)
// Principle: Regulate + Reach
// Merges server-verified checks (goLiveReadiness function) with client-side
// PWA / accessibility / performance checks run in the browser.
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Loader2, RefreshCw, CheckCircle2, AlertTriangle, XCircle, ShieldAlert,
  Rocket, Smartphone, Accessibility, Gauge, WifiOff, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_ICON = {
  pass: <CheckCircle2 className="w-4 h-4 text-orbitan-green flex-shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-orbitan-amber flex-shrink-0" />,
  fail: <XCircle className="w-4 h-4 text-orbitan-red flex-shrink-0" />,
  pending_client: <Loader2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
};
const STATUS_LABEL = { pass: 'Pass', warning: 'Warning', fail: 'Fail', pending_client: 'Client' };

export default function GoLiveReadinessCentre() {
  const [server, setServer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clientChecks, setClientChecks] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('goLiveReadiness', { action: 'assess' });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setServer(d);
    } catch (err) { setServer({ error: err?.message }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Client-side PWA / a11y / performance checks (run once on mount)
  useEffect(() => {
    const runClientChecks = async () => {
      const results = { pwa: {}, a11y: {}, performance: {} };
      // ── PWA ──
      try {
        const manifestRes = await fetch('/manifest.json');
        const hasManifest = manifestRes.ok;
        let manifestFields = {};
        if (hasManifest) { try { manifestFields = await manifestRes.json(); } catch (e) {} }
        const hasSW = 'serviceWorker' in navigator;
        let swRegistered = false;
        if (hasSW) { try { const reg = await navigator.serviceWorker.getRegistration(); swRegistered = !!reg; } catch (e) {} }
        const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        results.pwa = {
          manifest: { status: hasManifest ? 'pass' : 'fail', label: 'Manifest present', evidence: hasManifest ? `manifest.json loaded — ${manifestFields.name || 'unnamed'}` : '/manifest.json not found' },
          service_worker: { status: hasSW && swRegistered ? 'pass' : (hasSW ? 'warning' : 'fail'), label: 'Service worker registered', evidence: !hasSW ? 'Service Worker API unavailable' : swRegistered ? 'Active registration found' : 'No active registration' },
          installable: { status: standalone ? 'pass' : 'warning', label: 'Installable / standalone', evidence: standalone ? 'Running in standalone mode' : 'Not in standalone (installable if manifest + SW valid)' },
          offline: { status: hasSW && swRegistered ? 'pass' : 'warning', label: 'Offline capability', evidence: hasSW && swRegistered ? 'SW can serve cached shell' : 'Requires service worker' },
        };
      } catch (e) { results.pwa = { error: e.message }; }

      // ── Accessibility (static heuristics) ──
      try {
        const hasLang = !!document.documentElement.getAttribute('lang');
        const hasViewport = !!document.querySelector('meta[name="viewport"]');
        const hasSkipLink = !!document.querySelector('a[href="#main"], a[href="#content"], [data-skip-link]');
        const hasMainLandmark = !!document.querySelector('main, [role="main"]');
        const images = Array.from(document.images || []);
        const imagesWithoutAlt = images.filter(img => !img.alt && !img.getAttribute('aria-label')).length;
        const totalImages = images.length;
        const a11yScore = [hasLang, hasViewport, hasMainLandmark, imagesWithoutAlt === 0].filter(Boolean).length;
        results.a11y = {
          lang: { status: hasLang ? 'pass' : 'warning', label: 'Document language set', evidence: hasLang ? `lang="${document.documentElement.lang}"` : 'No lang attribute' },
          viewport: { status: hasViewport ? 'pass' : 'fail', label: 'Viewport meta', evidence: hasViewport ? 'Present' : 'Missing — mobile broken' },
          main_landmark: { status: hasMainLandmark ? 'pass' : 'warning', label: 'Main landmark', evidence: hasMainLandmark ? 'Present' : 'No <main> or role=main' },
          image_alt: { status: imagesWithoutAlt === 0 ? 'pass' : 'warning', label: 'Image alt text', evidence: `${totalImages - imagesWithoutAlt}/${totalImages} images have alt` },
          skip_link: { status: hasSkipLink ? 'pass' : 'warning', label: 'Skip link', evidence: hasSkipLink ? 'Present' : 'Not detected on landing' },
        };
      } catch (e) { results.a11y = { error: e.message }; }

      // ── Performance (basic Navigation Timing) ──
      try {
        const nav = performance.getEntriesByType('navigation')[0];
        if (nav) {
          const loadMs = Math.round(nav.loadEventEnd - nav.startTime);
          const domReadyMs = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
          const ttfbMs = Math.round(nav.responseStart - nav.requestStart);
          const perf = (ms) => ms < 2500 ? 'pass' : ms < 4000 ? 'warning' : 'fail';
          results.performance = {
            ttfb: { status: perf(ttfbMs), label: 'Time to first byte', evidence: `${ttfbMs} ms` },
            dom_ready: { status: perf(domReadyMs), label: 'DOM content loaded', evidence: `${domReadyMs} ms` },
            full_load: { status: perf(loadMs), label: 'Full page load', evidence: `${loadMs} ms` },
          };
        } else { results.performance = { note: 'Navigation timing unavailable' }; }
      } catch (e) { results.performance = { error: e.message }; }

      setClientChecks(results);
    };
    runClientChecks();
  }, []);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (server?.error) return <div className="p-8"><div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{server.error}</div></div>;
  if (!server) return null;

  // Merge client checks into the PWA & Client category
  const mergedCategories = { ...server.categories };
  if (clientChecks && !clientChecks.error) {
    const pwaItems = Object.values(clientChecks.pwa || {}).filter(v => v?.status);
    const a11yItems = Object.values(clientChecks.a11y || {}).filter(v => v?.status);
    const perfItems = Object.values(clientChecks.performance || {}).filter(v => v?.status);
    mergedCategories['PWA & Client'] = [
      ...(mergedCategories['PWA & Client'] || []).filter(i => i.source !== 'client'),
      ...pwaItems.map(i => ({ ...i, source: 'client' })),
    ];
    mergedCategories['Accessibility'] = a11yItems.map(i => ({ ...i, source: 'client' }));
    mergedCategories['Performance'] = perfItems.map(i => ({ ...i, source: 'client' }));
  }

  // Recompute overall score including client checks
  const allItems = Object.values(mergedCategories).flat();
  const passCount = allItems.filter(i => i.status === 'pass').length;
  const warnCount = allItems.filter(i => i.status === 'warning').length;
  const failCount = allItems.filter(i => i.status === 'fail').length;
  const totalScored = allItems.filter(i => i.status !== 'pending_client').length;
  const overall = totalScored ? Math.round(((passCount + warnCount * 0.5) / totalScored) * 100) : server.server_score;
  const blockers = allItems.filter(i => i.status === 'fail');
  const warnings = allItems.filter(i => i.status === 'warning');
  const clientPending = allItems.filter(i => i.status === 'pending_client').length;

  const recColor = blockers.length > 0 ? 'text-orbitan-red' : warnings.length > 0 ? 'text-orbitan-amber' : 'text-orbitan-green';
  const recBg = blockers.length > 0 ? 'bg-red-50 border-red-200' : warnings.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <PageHeader title="Go-Live Readiness Centre" subtitle="Unified system readiness — server-verified + client-side PWA, accessibility & performance"
        actions={<Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Refresh</Button>} />

      {/* Overall score + recommendation */}
      <div className={cn('border rounded-xl p-5', recBg)}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={overall >= 90 ? '#16A34A' : overall >= 70 ? '#F59E0B' : '#DC2626'} strokeWidth="10" strokeLinecap="round" strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - overall / 100)} className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-display font-bold tabular-nums">{overall}%</span><span className="text-[10px] text-muted-foreground">ready</span></div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-1"><Rocket className="w-5 h-5" /><span className={cn('text-lg font-heading font-bold', recColor)}>{server.recommendation}</span></div>
            <div className="flex flex-wrap gap-3 mt-2 text-xs justify-center sm:justify-start">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-orbitan-green" />{passCount} pass</span>
              <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-orbitan-amber" />{warnCount} warning</span>
              <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-orbitan-red" />{failCount} blocker</span>
              {clientPending > 0 && <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="w-3.5 h-3.5" />{clientPending} client check pending</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Blockers + warnings */}
      {(blockers.length > 0 || warnings.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {blockers.length > 0 && (
            <Card className="p-4 border-red-200 bg-red-50">
              <div className="flex items-center gap-2 mb-2"><ShieldAlert className="w-4 h-4 text-orbitan-red" /><h3 className="text-xs font-semibold uppercase tracking-wider text-orbitan-red">Blockers</h3></div>
              <div className="space-y-1.5">{blockers.map((b, i) => <div key={i} className="text-xs"><span className="font-medium">{b.label}</span><p className="text-muted-foreground">{b.evidence}</p></div>)}</div>
            </Card>
          )}
          {warnings.length > 0 && (
            <Card className="p-4 border-amber-200 bg-amber-50">
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-orbitan-amber" /><h3 className="text-xs font-semibold uppercase tracking-wider text-orbitan-amber">Warnings</h3></div>
              <div className="space-y-1.5">{warnings.map((w, i) => <div key={i} className="text-xs"><span className="font-medium">{w.label}</span><p className="text-muted-foreground">{w.evidence}</p></div>)}</div>
            </Card>
          )}
        </div>
      )}

      {/* Client check section header */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {clientChecks ? <CheckCircle2 className="w-3.5 h-3.5 text-orbitan-green" /> : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {clientChecks ? 'Client-side checks complete (this browser)' : 'Running client-side PWA, accessibility & performance checks…'}
      </div>

      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(mergedCategories).map(([cat, items]) => (
          <Card key={cat} className="p-4">
            <h3 className="font-heading font-semibold text-sm mb-3">{cat}</h3>
            <div className="space-y-2.5">
              {items.map(it => (
                <div key={it.key} className="flex items-start gap-2.5">
                  {STATUS_ICON[it.status] || STATUS_ICON.pending_client}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium">{it.label}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{STATUS_LABEL[it.status] || it.status}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{it.evidence}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* PWA quick actions */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3"><Smartphone className="w-4 h-4 text-orbitan-blue" /><h3 className="text-xs font-semibold uppercase tracking-wider">PWA Quick Verification</h3></div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => window.open('/manifest.json', '_blank')} className="gap-1.5"><Download className="w-3.5 h-3.5" />View Manifest</Button>
          <Button size="sm" variant="outline" onClick={() => navigator.serviceWorker?.getRegistration?.().then(r => alert(r ? `SW active: ${r.scope}` : 'No SW registered')).catch(() => alert('SW API unavailable'))} className="gap-1.5"><WifiOff className="w-3.5 h-3.5" />Check Service Worker</Button>
          <Button size="sm" variant="outline" onClick={() => alert(`Standalone: ${window.matchMedia('(display-mode: standalone)').matches}\nLang: ${document.documentElement.lang || 'none'}\nImages w/o alt: ${Array.from(document.images).filter(i => !i.alt).length}`)} className="gap-1.5"><Accessibility className="w-3.5 h-3.5" />Quick A11y Audit</Button>
          <Button size="sm" variant="outline" onClick={() => { const n = performance.getEntriesByType('navigation')[0]; alert(n ? `TTFB: ${Math.round(n.responseStart - n.requestStart)}ms\nDOM: ${Math.round(n.domContentLoadedEventEnd - n.startTime)}ms\nLoad: ${Math.round(n.loadEventEnd - n.startTime)}ms` : 'N/A'); }} className="gap-1.5"><Gauge className="w-3.5 h-3.5" />Performance Snapshot</Button>
        </div>
      </Card>

      <p className="text-[10px] text-muted-foreground text-center">Server score {server.server_score}% · {server.counts.pass + server.counts.warning + server.counts.fail} server checks · rule set {server.rule_version} · computed {new Date(server.computed_at).toLocaleString()}</p>
    </div>
  );
}