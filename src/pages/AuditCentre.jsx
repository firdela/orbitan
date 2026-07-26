import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useTenant } from '@/lib/use-tenant.jsx';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import TimelineItem from '@/components/audit-centre/TimelineItem';
import AuditDetailSheet from '@/components/audit-centre/AuditDetailSheet';
import {
  MODULE_LABELS, CATEGORY_LABELS, SEVERITY_CONFIG, SHIELD_STYLES,
  formatAction, formatTimestamp,
} from '@/components/audit-centre/auditConfig';
import {
  ScrollText, Search, Download, FileArchive, Filter, ListTree, Table2,
  ShieldX, AlertTriangle, Users, Activity, Loader2, ArrowLeft,
} from 'lucide-react';

const PAGE_SIZE = 30;
const SEVERITY_KEYS = ['info', 'success', 'warning', 'critical'];
const OUTCOME_KEYS = ['pass', 'notify', 'blocked', 'override_requested', 'override_approved', 'override_denied'];

export default function AuditCentre() {
  const { user } = useAuth();
  const { currentTenant: tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = user?.role === 'admin';
  const [view, setView] = useState('timeline'); // 'timeline' | 'table'
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [detailLog, setDetailLog] = useState(null);
  const [bundling, setBundling] = useState(false);

  // Live refresh on new audit events (not polling — entity subscription).
  useEffect(() => {
    const unsub = base44.entities.AuditLog.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['audit-centre'] });
    });
    return unsub;
  }, [queryClient]);

  // Admin tenant list for cross-tenant filtering.
  const { data: tenants } = useQuery({
    queryKey: ['audit-tenants'],
    queryFn: async () => base44.entities.Tenant.list('-created_date', 100),
    enabled: isAdmin,
  });
  const tenantMap = useMemo(() => {
    const m = {}; (tenants || []).forEach((t) => { m[t.id] = t.name; }); return m;
  }, [tenants]);

  const filter = useMemo(() => {
    const f = {};
    if (!isAdmin && tenant?.id) f.tenant_id = tenant.id;
    if (isAdmin && tenantFilter !== 'all') f.tenant_id = tenantFilter;
    if (moduleFilter !== 'all') f.module = moduleFilter;
    if (severityFilter !== 'all') f.severity = severityFilter;
    if (categoryFilter !== 'all') f.category = categoryFilter;
    if (outcomeFilter !== 'all') f.shield_outcome = outcomeFilter;
    return f;
  }, [isAdmin, tenant, tenantFilter, moduleFilter, severityFilter, categoryFilter, outcomeFilter]);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-centre', filter, page, search, dateFrom, dateTo],
    queryFn: async () => {
      const result = await base44.entities.AuditLog.filter(filter, '-created_date', PAGE_SIZE + 1, page * PAGE_SIZE);
      let rows = result || [];
      if (search.trim()) {
        const t = search.toLowerCase();
        rows = rows.filter((l) =>
          l.actor_name?.toLowerCase().includes(t) ||
          l.action_type?.toLowerCase().includes(t) ||
          l.target_entity?.toLowerCase().includes(t) ||
          l.details?.toLowerCase().includes(t) ||
          l.tenant_id?.toLowerCase().includes(t)
        );
      }
      if (dateFrom) rows = rows.filter((l) => l.created_date && new Date(l.created_date) >= new Date(dateFrom));
      if (dateTo) rows = rows.filter((l) => l.created_date && new Date(l.created_date) <= new Date(dateTo + 'T23:59:59'));
      return rows;
    },
  });

  const hasMore = logs && logs.length > PAGE_SIZE;
  const displayLogs = hasMore ? logs.slice(0, PAGE_SIZE) : logs || [];

  const stats = useMemo(() => ({
    total: displayLogs.length,
    critical: displayLogs.filter((l) => l.severity === 'critical').length,
    warnings: displayLogs.filter((l) => l.severity === 'warning').length,
    blocks: displayLogs.filter((l) => l.shield_outcome === 'blocked').length,
    overrides: displayLogs.filter((l) => l.shield_outcome?.startsWith('override')).length,
    actors: new Set(displayLogs.map((l) => l.actor_id)).size,
  }), [displayLogs]);

  const resetPage = () => setPage(0);

  const handleExport = () => {
    const headers = ['Timestamp', 'Tenant', 'Actor', 'Role', 'Action', 'Module', 'Category', 'Severity', 'Target Entity', 'Record ID', 'Details', 'Shield Outcome', 'Source', 'IP', 'Justification'];
    const rows = displayLogs.map((l) => [
      l.created_date ? new Date(l.created_date).toLocaleString() : '',
      tenantMap[l.tenant_id] || l.tenant_id || '',
      l.actor_name || '', l.actor_role || '', l.action_type || '',
      MODULE_LABELS[l.module] || l.module || '',
      CATEGORY_LABELS[l.category] || l.category || '',
      l.severity || 'info',
      l.target_entity || '', l.target_record_id || '',
      (l.details || '').replace(/"/g, '""'),
      l.shield_outcome || 'not_evaluated',
      l.event_source || '', l.ip_address || '',
      (l.justification || '').replace(/"/g, '""'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-centre-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportBundle = async () => {
    setBundling(true);
    try {
      const res = await base44.functions.invoke('auditBundleGenerator', {
        tenant_id: isAdmin ? (tenantFilter !== 'all' ? tenantFilter : undefined) : tenant?.id,
        module: moduleFilter !== 'all' ? moduleFilter : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      const bundle = res.data || res;
      const m = bundle.manifest;
      if (!m) throw new Error('Bundle generator returned no manifest.');
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFontSize(16); doc.text('OrbitanOS — Audit Bundle', 14, 20);
      doc.setFontSize(9);
      doc.text(`Bundle ID: ${m.bundle_id}`, 14, 28);
      doc.text(`Tenant: ${m.tenant_id}`, 14, 33);
      doc.text(`Generated: ${new Date(m.generated_at).toLocaleString('en-SG')}`, 14, 38);
      doc.text(`Integrity Hash: ${m.integrity_hash}`, 14, 43);
      doc.text(`Events: ${m.event_count}  |  Evidence: ${m.artifact_count}  |  ${m.standard}`, 14, 48);
      doc.setFontSize(11); doc.text('Audit Events', 14, 60);
      doc.setFontSize(8);
      let y = 66;
      (bundle.events || []).forEach((e) => {
        if (y > 272) { doc.addPage(); y = 20; }
        doc.text(`${new Date(e.timestamp).toLocaleString('en-SG')} — ${e.actor_name || 'System'} — ${e.action_type || ''}`, 14, y); y += 5;
        doc.text(`   ${e.target_entity || ''} #${(e.target_record_id || '').slice(-8)} | ${e.shield_outcome || 'n/a'}`, 14, y); y += 7;
      });
      doc.save(`audit-bundle-${m.bundle_id}.pdf`);
      toast({ title: 'Audit Bundle Generated', description: `${m.event_count} events packaged.` });
    } catch (err) {
      toast({ title: 'Bundle generation failed', description: err?.message || 'An error occurred.', variant: 'destructive' });
    } finally {
      setBundling(false);
    }
  };

  const clearFilters = () => {
    setSearch(''); setModuleFilter('all'); setSeverityFilter('all');
    setCategoryFilter('all'); setOutcomeFilter('all'); setTenantFilter('all');
    setDateFrom(''); setDateTo(''); resetPage();
  };

  const hasActiveFilters = search || moduleFilter !== 'all' || severityFilter !== 'all' ||
    categoryFilter !== 'all' || outcomeFilter !== 'all' || (isAdmin && tenantFilter !== 'all') || dateFrom || dateTo;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to={isAdmin ? '/leader-org' : '/company'} aria-label="Back">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {isAdmin ? 'Audit Centre · All Tenants' : 'Activity Timeline & Audit Centre'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!displayLogs.length}>
              <Download className="w-4 h-4 mr-1.5" /> <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <Button variant="default" size="sm" onClick={handleExportBundle} disabled={bundling}>
              {bundling ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileArchive className="w-4 h-4 mr-1.5" />}
              <span className="hidden sm:inline">Audit Bundle</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <PageHeader
          title="Activity Timeline & Audit Centre"
          subtitle="Immutable, chronological record of significant platform activity — who did what, when, and why."
          help={{ content: 'The Audit Centre is the governance layer of OrbitanOS. It complements the Orbit Inbox (actionable work) with a tamper-proof history of operational, governance, and security events. Records are created by the audit engine and are append-only.' }}
        />

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard title="Events" value={stats.total} icon={Activity} color="blue" compact />
          <StatCard title="Critical" value={stats.critical} icon={AlertTriangle} color="red" compact />
          <StatCard title="Warnings" value={stats.warnings} icon={AlertTriangle} color="amber" compact />
          <StatCard title="Shield Blocks" value={stats.blocks} icon={ShieldX} color="red" compact />
          <StatCard title="Overrides" value={stats.overrides} icon={ScrollText} color="amber" compact />
          <StatCard title="Actors" value={stats.actors} icon={Users} color="slate" compact />
        </div>

        {/* Filter bar */}
        <Card className="p-4 mb-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input placeholder="Search actor, action, entity, details..." value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage(); }} className="pl-9" aria-label="Search audit events" />
            </div>
            <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); resetPage(); }}>
              <SelectTrigger className="w-full lg:w-40" aria-label="Filter by module"><Filter className="w-4 h-4 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Module" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {Object.entries(MODULE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); resetPage(); }}>
              <SelectTrigger className="w-full lg:w-36" aria-label="Filter by severity"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {SEVERITY_KEYS.map((k) => <SelectItem key={k} value={k}>{SEVERITY_CONFIG[k].label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); resetPage(); }}>
              <SelectTrigger className="w-full lg:w-40" aria-label="Filter by category"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={outcomeFilter} onValueChange={(v) => { setOutcomeFilter(v); resetPage(); }}>
              <SelectTrigger className="w-full lg:w-40" aria-label="Filter by shield outcome"><SelectValue placeholder="Outcome" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outcomes</SelectItem>
                {OUTCOME_KEYS.map((k) => <SelectItem key={k} value={k}>{k.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            {isAdmin && (
              <Select value={tenantFilter} onValueChange={(v) => { setTenantFilter(v); resetPage(); }}>
                <SelectTrigger className="w-full sm:w-56" aria-label="Filter by tenant"><SelectValue placeholder="Tenant" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  {(tenants || []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-3 flex-1">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-1" htmlFor="date-from">From</label>
                <Input id="date-from" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); resetPage(); }} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-1" htmlFor="date-to">To</label>
                <Input id="date-to" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); resetPage(); }} />
              </div>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-3">
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
                Clear all filters
              </Button>
            </div>
          )}
        </Card>

        {/* View toggle */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground">
            {isLoading ? 'Loading…' : `Showing ${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + displayLogs.length}`}
          </p>
          <div className="inline-flex items-center bg-muted rounded-lg p-0.5" role="group" aria-label="View mode">
            <button type="button" onClick={() => setView('timeline')}
              aria-pressed={view === 'timeline'}
              className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                view === 'timeline' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              <ListTree className="w-3.5 h-3.5" /> Timeline
            </button>
            <button type="button" onClick={() => setView('table')}
              aria-pressed={view === 'table'}
              className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                view === 'table' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              <Table2 className="w-3.5 h-3.5" /> Table
            </button>
          </div>
        </div>

        {/* Content */}
        <Card className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : displayLogs.length === 0 ? (
            <EmptyState icon={ScrollText} title="No audit events found" color="slate"
              description="Try adjusting your filters or date range. Audit events are generated automatically as your team uses OrbitanOS."
            />
          ) : view === 'timeline' ? (
            <div className="p-4 sm:p-6">
              {displayLogs.map((log, i) => (
                <TimelineItem key={log.id} log={log} isLast={i === displayLogs.length - 1}
                  onClick={() => setDetailLog(log)} />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Timestamp</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Actor</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Action</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Module</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Severity</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Shield</th>
                    <th className="px-4 py-3"><span className="sr-only">View</span></th>
                  </tr>
                </thead>
                <tbody>
                  {displayLogs.map((log) => {
                    const sev = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;
                    return (
                      <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setDetailLog(log)}>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatTimestamp(log.created_date, { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col"><span className="text-sm font-medium text-foreground">{log.actor_name || 'System'}</span><span className="text-[10px] text-muted-foreground">{log.actor_role || ''}</span></div>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-foreground capitalize">{formatAction(log.action_type)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{MODULE_LABELS[log.module] || log.module}</td>
                        <td className="px-4 py-3"><span className={cn('inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-medium', sev.badge)}>{sev.label}</span></td>
                        <td className="px-4 py-3"><span className={cn('inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-medium', SHIELD_STYLES[log.shield_outcome] || SHIELD_STYLES.not_evaluated)}>{log.shield_outcome?.replace(/_/g, ' ') || 'n/a'}</span></td>
                        <td className="px-4 py-3 text-muted-foreground"><span className="sr-only">Open details</span>›</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Pagination */}
        {!isLoading && displayLogs.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">Page {page + 1}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </main>

      <AuditDetailSheet log={detailLog} open={!!detailLog} onOpenChange={() => setDetailLog(null)}
        tenantName={detailLog ? (tenantMap[detailLog.tenant_id] || tenant?.name) : undefined} />
    </div>
  );
}