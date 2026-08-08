import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Play, CheckCircle2, XCircle, AlertTriangle, Clock,
  Loader2, ShieldCheck, FileCheck, Lock, Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

const PROOF_CLASS_CONFIG = {
  POLICY_UNIT: { label: 'Policy', variant: 'default', icon: ShieldCheck },
  BACKEND_INTEGRATION: { label: 'Backend', variant: 'secondary', icon: FileCheck },
  RLS: { label: 'RLS', variant: 'outline', icon: Lock },
  REAL_AUTH: { label: 'Real Auth', variant: 'outline', icon: Eye },
};

const RESULT_CONFIG = {
  pass: { label: 'PASS', variant: 'default', icon: CheckCircle2, color: 'text-emerald-500' },
  fail: { label: 'FAIL', variant: 'destructive', icon: XCircle, color: 'text-red-500' },
  blocked: { label: 'BLOCKED', variant: 'secondary', icon: AlertTriangle, color: 'text-amber-500' },
  unverified: { label: 'UNVERIFIED', variant: 'outline', icon: Clock, color: 'text-muted-foreground' },
  not_applicable: { label: 'N/A', variant: 'outline', icon: Clock, color: 'text-muted-foreground' },
};

export default function AutomatedVerificationSection({ readiness }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);

  const { data: matrixResults, isLoading: matrixLoading } = useQuery({
    queryKey: ['test-lab-matrix-results'],
    queryFn: async () => {
      const response = await base44.functions.invoke('testLabSetup', { action: 'get_matrix_results' });
      return response.data || response;
    },
    enabled: !!readiness?.active_verification_run,
    refetchInterval: 30000,
  });

  const runMatrix = useCallback(async (scenarioId) => {
    if (running) return;
    setRunning(true);
    try {
      const payload = { action: 'run_safe_verification_matrix' };
      if (scenarioId) payload.scenario_id = scenarioId;
      const response = await base44.functions.invoke('testLabSetup', payload);
      queryClient.invalidateQueries({ queryKey: ['test-lab-matrix-results'] });
      queryClient.invalidateQueries({ queryKey: ['test-lab-readiness'] });
      const data = response.data || response;
      if (data.success) {
        toast({
          title: '✓ Verification Matrix Complete',
          description: `${data.pass_count} pass, ${data.fail_count} fail, ${data.blocked_count} blocked (${data.total_scenarios} scenarios)`,
        });
      } else {
        toast({ title: 'Matrix Failed', description: data.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Matrix execution failed.';
      toast({ title: 'Matrix Failed', description: msg, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  }, [running, queryClient, toast]);

  const automatedReadiness = readiness?.automated_governance_readiness || {};
  const activeRun = readiness?.active_verification_run;
  const results = matrixResults?.scenarios || [];
  const summary = matrixResults || {};

  // Group results by matrix_type
  const groupedResults = results.reduce((acc, r) => {
    if (!acc[r.matrix_type]) acc[r.matrix_type] = [];
    acc[r.matrix_type].push(r);
    return acc;
  }, {});

  return (
    <section aria-labelledby="automated-section">
      <h2 id="automated-section" className="text-lg font-heading font-semibold mb-3 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        Automated Verification Matrix
        {automatedReadiness.ready && (
          <Badge className="gap-1 ml-2">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </Badge>
        )}
      </h2>

      {/* Campaign Overview */}
      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-medium">Campaign: {activeRun?.verification_run_id || 'No active run'}</p>
              <p className="text-xs text-muted-foreground">
                Matrix Version: {automatedReadiness.matrix_version || '—'} · Type: {automatedReadiness.campaign_type || '—'}
              </p>
            </div>
            <Button
              onClick={() => runMatrix(null)}
              disabled={running || !activeRun}
              className="gap-1.5"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run Safe Verification Matrix
            </Button>
          </div>

          {/* Summary Stats */}
          {summary.total_scenarios != null && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
              <div className="text-center p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30">
                <p className="text-2xl font-bold text-emerald-600">{summary.pass_count || 0}</p>
                <p className="text-xs text-muted-foreground">Pass</p>
              </div>
              <div className="text-center p-2 rounded-md bg-red-50 dark:bg-red-950/30">
                <p className="text-2xl font-bold text-red-600">{summary.fail_count || 0}</p>
                <p className="text-xs text-muted-foreground">Fail</p>
              </div>
              <div className="text-center p-2 rounded-md bg-amber-50 dark:bg-amber-950/30">
                <p className="text-2xl font-bold text-amber-600">{summary.blocked_count || 0}</p>
                <p className="text-xs text-muted-foreground">Blocked</p>
              </div>
              <div className="text-center p-2 rounded-md bg-muted">
                <p className="text-2xl font-bold text-muted-foreground">{summary.unverified_count || 0}</p>
                <p className="text-xs text-muted-foreground">Unverified</p>
              </div>
              <div className="text-center p-2 rounded-md bg-muted">
                <p className="text-2xl font-bold text-muted-foreground">{summary.total_scenarios || 0}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          )}

          {/* Proof Class Legend */}
          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground pt-2 border-t">
            <span className="font-medium">Proof Classes:</span>
            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Policy Unit</span>
            <span className="flex items-center gap-1"><FileCheck className="w-3 h-3" /> Backend Integration</span>
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> RLS: {automatedReadiness.rls_proof_status || 'DEFERRED'}</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Real Auth: {automatedReadiness.real_auth_proof_status || 'DEFERRED'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Matrix Results by Category */}
      {matrixLoading ? (
        <Card><CardContent className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading matrix results...
        </CardContent></Card>
      ) : results.length === 0 ? (
        <Card><CardContent className="p-4 text-sm text-muted-foreground">
          No verification results yet. Run the safe verification matrix to see results.
        </CardContent></Card>
      ) : (
        Object.entries(groupedResults).map(([matrixType, scenarioResults]) => (
          <Card key={matrixType} className="mb-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm capitalize flex items-center gap-2">
                {matrixType.replace(/_/g, ' ')}
                <Badge variant="outline" className="text-xs">{scenarioResults.length} scenarios</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-2 px-3 font-medium">Persona</th>
                      <th className="text-left py-2 px-3 font-medium">Operation</th>
                      <th className="text-center py-2 px-2 font-medium">Expected</th>
                      <th className="text-center py-2 px-2 font-medium">Actual</th>
                      <th className="text-center py-2 px-2 font-medium">Proof</th>
                      <th className="text-center py-2 px-2 font-medium">Result</th>
                      <th className="text-left py-2 px-3 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarioResults.map((r) => {
                      const resultConfig = RESULT_CONFIG[r.result] || RESULT_CONFIG.unverified;
                      const proofConfig = PROOF_CLASS_CONFIG[r.proof_class] || PROOF_CLASS_CONFIG.POLICY_UNIT;
                      const ResultIcon = resultConfig.icon;
                      return (
                        <tr key={r.scenario_id} className="border-b hover:bg-muted/30">
                          <td className="py-2 px-3 font-mono text-xs">{r.persona_key}</td>
                          <td className="py-2 px-3">{r.operation}</td>
                          <td className="py-2 px-2 text-center capitalize">{r.expected_outcome}</td>
                          <td className="py-2 px-2 text-center capitalize">{r.actual_outcome}</td>
                          <td className="py-2 px-2 text-center">
                            <Badge variant={proofConfig.variant} className="text-xs">{proofConfig.label}</Badge>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={`inline-flex items-center gap-1 ${resultConfig.color}`}>
                              <ResultIcon className="w-3.5 h-3.5" />
                              {resultConfig.label}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-muted-foreground max-w-xs truncate" title={r.reason_detail}>
                            {r.reason_code}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </section>
  );
}