import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/lib/workspace';
import BackBar from '@/components/shared/BackBar';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Loader2, RefreshCw, Search, Filter, Download, Activity, ShieldAlert,
  CheckCircle2, AlertTriangle, Info, ChevronRight, Building2,
} from 'lucide-react';
import { classifyIntegrationError } from '@/lib/integration-errors';

const SEV_ICON = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  critical: ShieldAlert,
};

const SEV_COLOR = {
  info: 'text-muted-foreground bg-muted',
  success: 'text-orbitan-green-700 bg-orbitan-green-light',
  warning: 'text-orbitan-amber-700 bg-orbitan-amber-light',
  critical: 'text-orbitan-red-700 bg-orbitan-red-light',
};

const MODULE_LABELS = {
  finance: 'Finance', inventory: 'Inventory', procurement: 'Procurement',
  workforce: 'Workforce', compliance: 'Compliance', sales: 'Sales',
  scheduling: 'Scheduling', retail: 'Retail', sustainability: 'Sustainability',
  system: 'System',
};

const PAGE_SIZE = 25;

export default function SystemActivityPage() {
  const { user } = useAuth();
  const { tenant } = useWorkspace();
  const isAdmin = user?.role === 'admin';
  const tenantId = tenant?.id || user?.data?.tenant_id;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('all');
  const [modFilter, setModFilter] = useState('all');
  const [page, setPage] = useState(0);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const filter = {};
      if (!isAdmin && tenantId) filter.tenant_id = tenantId;
      const data = await base44.entities.AuditLog.filter(filter, '-created_date', 200);
      setLogs(data || []);
    } catch (err) {
      const classified = classifyIntegrationError(err, 'System Activity');
      setError(classified.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (sevFilter !== 'all' && l.severity !== sevFilter) return false;
      if (modFilter !== 'all' && l.module !== modFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${l.action_type || ''} ${l.actor_name || ''} ${l.details || ''} ${l.target_entity || ''} ${l.category || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, sevFilter, modFilter]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const hasMore = filtered.length > (page + 1) * PAGE_SIZE;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <BackBar to={isAdmin ? '/leader-org' : '/workspace'} label={isAdmin ? 'Back to Platform Console' : 'Back to Workspace'} breadcrumb={[{ label: 'System Activity' }]} />

      <PageHeader
        title="System Activity"
        subtitle="Chronological platform activity across your authorised scope"
        actions={<Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Refresh</Button>}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search actor, action, details…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 h-9"
          />
        </div>
        <Select value={sevFilter} onValueChange={v => { setSevFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-40 h-9"><Filter className="w-3.5 h-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={modFilter} onValueChange={v => { setModFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {Object.entries(MODULE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0" asChild>
          <Link to="/data-export"><Download className="w-3.5 h-3.5" /> Export</Link>
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading activity feed…" />
      ) : error ? (
        <Card><CardContent className="p-6 text-center text-sm text-destructive">{error}</CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Activity} title="No activity found" description="Try adjusting your filters or check back later." />
      ) : (
        <>
          <div className="space-y-2">
            {paged.map((log) => {
              const SevIcon = SEV_ICON[log.severity] || Info;
              return (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${SEV_COLOR[log.severity] || SEV_COLOR.info}`}>
                    <SevIcon className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-medium text-foreground">{log.action_type?.replace(/_/g, ' ')}</span>
                      {log.module && <Badge variant="secondary" className="text-[10px] h-4">{MODULE_LABELS[log.module] || log.module}</Badge>}
                      {log.category && <Badge variant="outline" className="text-[10px] h-4">{log.category}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">{log.details || '—'}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/70 flex-wrap">
                      {log.actor_name && <span>by {log.actor_name}</span>}
                      {log.target_entity && <span>→ {log.target_entity}</span>}
                      {log.created_date && <span>{new Date(log.created_date).toLocaleString()}</span>}
                    </div>
                  </div>
                  {log.link && (
                    <Link to={log.link} className="text-muted-foreground hover:text-foreground shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={!hasMore} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}