import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import OrbitanWordmark from '@/components/brand/OrbitanWordmark';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Search, Download, ArrowLeft, FileText, Filter, LogOut } from 'lucide-react';

const MODULE_LABELS = {
  finance: 'Finance',
  inventory: 'Inventory',
  procurement: 'Procurement',
  workforce: 'Workforce',
  compliance: 'Compliance',
  sales: 'Sales',
  scheduling: 'Scheduling',
  retail: 'Retail',
  sustainability: 'Sustainability',
  system: 'System',
};

const SHIELD_OUTCOME_STYLES = {
  pass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  blocked: 'bg-red-500/10 text-red-600 border-red-500/20',
  override_requested: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  override_approved: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  override_denied: 'bg-red-500/10 text-red-600 border-red-500/20',
  not_evaluated: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

export default function AuditLogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, moduleFilter, outcomeFilter, searchTerm],
    queryFn: async () => {
      const filter = {};
      if (moduleFilter !== 'all') filter.module = moduleFilter;
      if (outcomeFilter !== 'all') filter.shield_outcome = outcomeFilter;
      const logs = await base44.entities.AuditLog.filter(filter, '-created_date', pageSize + 1, page * pageSize);
      let filtered = logs;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        filtered = logs.filter(l =>
          l.actor_name?.toLowerCase().includes(term) ||
          l.action_type?.toLowerCase().includes(term) ||
          l.target_entity?.toLowerCase().includes(term) ||
          l.details?.toLowerCase().includes(term) ||
          l.tenant_id?.toLowerCase().includes(term)
        );
      }
      return filtered;
    },
  });

  const { data: tenants } = useQuery({
    queryKey: ['audit-tenants'],
    queryFn: async () => {
      const list = await base44.entities.Tenant.list('-created_date', 100);
      return list || [];
    },
  });

  const tenantMap = useMemo(() => {
    const map = {};
    (tenants || []).forEach(t => { map[t.id] = t.name; });
    return map;
  }, [tenants]);

  const hasMore = auditLogs && auditLogs.length > pageSize;
  const displayLogs = hasMore ? auditLogs.slice(0, pageSize) : auditLogs || [];

  const handleExport = () => {
    const headers = ['Date', 'Tenant', 'Actor', 'Role', 'Action', 'Module', 'Target', 'Record ID', 'Details', 'Shield Outcome', 'IP Address'];
    const rows = (auditLogs || []).map(log => [
      log.created_date ? new Date(log.created_date).toLocaleString() : '',
      tenantMap[log.tenant_id] || log.tenant_id || '',
      log.actor_name || '',
      log.actor_role || '',
      log.action_type || '',
      MODULE_LABELS[log.module] || log.module || '',
      log.target_entity || '',
      log.target_record_id || '',
      (log.details || '').replace(/"/g, '""'),
      log.shield_outcome || 'not_evaluated',
      log.ip_address || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orbitan-audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OrbitanWordmark size="sm" variant="dark" showOS />
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Audit Logs</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!auditLogs || auditLogs.length === 0}>
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
            <Link to="/leader-org">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => base44.auth.logout()}
              className="gap-1.5 text-xs"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Global Audit Trail</h1>
              <p className="text-sm text-muted-foreground">Compliance view across all tenants — who did what, when, and why.</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="card-elevated">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Events</p>
              <p className="text-2xl font-display font-bold text-foreground">{displayLogs.length}</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Shield Blocks</p>
              <p className="text-2xl font-display font-bold text-red-600">
                {displayLogs.filter(l => l.shield_outcome === 'blocked').length}
              </p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Overrides</p>
              <p className="text-2xl font-display font-bold text-amber-600">
                {displayLogs.filter(l => l.shield_outcome?.startsWith('override')).length}
              </p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Active Tenants</p>
              <p className="text-2xl font-display font-bold text-foreground">{tenants?.length || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by actor, action, entity, or tenant ID..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                  className="pl-9"
                />
              </div>
              <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setPage(0); }}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="w-4 h-4 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {Object.entries(MODULE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={outcomeFilter} onValueChange={(v) => { setOutcomeFilter(v); setPage(0); }}>
                <SelectTrigger className="w-full md:w-48">
                  <Shield className="w-4 h-4 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Shield Outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outcomes</SelectItem>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="override_requested">Override Requested</SelectItem>
                  <SelectItem value="override_approved">Override Approved</SelectItem>
                  <SelectItem value="override_denied">Override Denied</SelectItem>
                  <SelectItem value="not_evaluated">Not Evaluated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Audit Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : displayLogs.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No audit logs found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or search terms.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Timestamp</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Actor</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Tenant</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Action</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Module</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Target</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Shield</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayLogs.map((log) => (
                      <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {log.created_date ? new Date(log.created_date).toLocaleString('en-SG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">{log.actor_name || 'System'}</span>
                            <span className="text-[10px] text-muted-foreground">{log.actor_role || ''}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {tenantMap[log.tenant_id] || log.tenant_id?.slice(-8) || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-foreground">
                          {log.action_type?.replace(/_/g, ' ') || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {MODULE_LABELS[log.module] || log.module || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          <div className="flex flex-col">
                            <span>{log.target_entity || '—'}</span>
                            {log.target_record_id && <span className="text-[10px] font-mono text-muted-foreground/60">#{log.target_record_id.slice(-8)}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-medium ${SHIELD_OUTCOME_STYLES[log.shield_outcome] || SHIELD_OUTCOME_STYLES.not_evaluated}`}>
                            {log.shield_outcome?.replace(/_/g, ' ') || 'not evaluated'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {!isLoading && displayLogs.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">
              Showing {page * pageSize + 1}–{page * pageSize + displayLogs.length} events
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}