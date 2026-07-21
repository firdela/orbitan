import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Play, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ALLOWED_ROLES = ['admin', 'tenant_admin', 'outlet_manager', 'supervisor'];

export default function TaskTestSuite() {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const canRun = user && ALLOWED_ROLES.includes(user.role);

  const runSuite = async () => {
    setRunning(true); setError(null); setReport(null);
    try {
      const res = await base44.functions.invoke('taskControllerTestSuite', {});
      setReport(res.data || res);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Suite failed to execute');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-orbitan-blue" /> Task Controller Test Suite
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Automated validation of the governed transition engine, optimistic locking, idempotency, permissions, and tenant isolation.
          </p>
        </div>
        <Button onClick={runSuite} disabled={running || !canRun} className="gap-1.5">
          <Play className="w-4 h-4" /> {running ? 'Running...' : 'Run Suite'}
        </Button>
      </div>

      {!canRun && (
        <Card className="mb-4 border-orbitan-amber/40">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-orbitan-amber">
            <AlertTriangle className="w-4 h-4" /> This suite requires a manager/admin role and a tenant context. Platform admins (no tenant) cannot run lifecycle tests.
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {report && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatCard label="Total" value={report.summary?.total} color="text-foreground" />
            <StatCard label="Passed" value={report.summary?.passed} color="text-orbitan-green" />
            <StatCard label="Failed" value={report.summary?.failed} color={report.summary?.failed > 0 ? 'text-orbitan-red' : 'text-muted-foreground'} />
          </div>

          <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground">
            <span>Pass rate: <strong className="text-foreground">{report.summary?.pass_rate}</strong></span>
            {report.user && <span>· Run as: <strong className="text-foreground">{report.user.name} ({report.user.role})</strong></span>}
            {report.user?.tenant_id && <span>· Tenant: <code className="text-foreground">{report.user.tenant_id}</code></span>}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Test Results</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {report.tests?.map((t, i) => (
                <div key={i} className={cn('flex items-start gap-2.5 text-sm border rounded-lg px-3 py-2', t.pass ? 'bg-orbitan-green-light/30 border-green-100' : 'bg-orbitan-red-light/30 border-red-100')}>
                  {t.pass ? <CheckCircle2 className="w-4 h-4 text-orbitan-green mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-orbitan-red mt-0.5 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-medium', t.pass ? 'text-foreground' : 'text-orbitan-red')}>{t.test}</p>
                    {t.detail && <p className="text-xs text-muted-foreground font-mono mt-0.5 break-all">{t.detail}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground mt-4">
            All temporary Task, TaskAssignment, and WorkReview records created by this suite are hard-deleted on completion. AuditLog entries are immutable by design and tagged "TESTSUITE" for administrative purge.
          </p>
        </>
      )}

      {!report && !running && !error && (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Run the suite to validate the transition engine against the live backend.</CardContent></Card>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <Card>
      <CardContent className="py-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-2xl font-heading font-bold', color)}>{value ?? '—'}</p>
      </CardContent>
    </Card>
  );
}