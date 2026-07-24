import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle2, XCircle, Play, ShieldCheck, AlertTriangle, Loader2, Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { runAccessEngineValidation } from '@/lib/access/__tests__/accessEngineValidationHarness';

function Stat({ label, value, color }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn('text-2xl font-display font-bold mt-1', color)}>{value}</div>
      </CardContent>
    </Card>
  );
}

function TestRow({ t }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0">
      {t.passed ? (
        <CheckCircle2 className="w-4 h-4 text-orbitan-green mt-0.5 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-orbitan-red mt-0.5 shrink-0" />
      )}
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{t.name}</div>
        {!t.passed && t.error && (
          <div className="text-xs text-destructive mt-0.5 break-words">{t.error}</div>
        )}
      </div>
    </div>
  );
}

export default function AccessEngineValidation() {
  const { user } = useAuth();
  const [feReport, setFeReport] = useState(null);
  const [feRunning, setFeRunning] = useState(false);
  const [beReport, setBeReport] = useState(null);
  const [beRunning, setBeRunning] = useState(false);
  const [beError, setBeError] = useState(null);

  const runFrontend = useCallback(async () => {
    setFeRunning(true);
    try {
      const r = await runAccessEngineValidation();
      setFeReport(r);
    } finally {
      setFeRunning(false);
    }
  }, []);

  const runBackend = useCallback(async () => {
    setBeRunning(true); setBeError(null);
    try {
      const res = await base44.functions.invoke('accessValidationHarness', {});
      setBeReport(res.data || res);
    } catch (e) {
      setBeError(e.response?.data?.error || e.message || 'Backend harness failed');
    } finally {
      setBeRunning(false);
    }
  }, []);

  useEffect(() => { runFrontend(); }, [runFrontend]);

  const canRunBackend = !!user && (user.role === 'admin');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-orbitan-blue" /> Access Engine Validation
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Phase 1 Increment #2 — MembershipResolver + Access Engine + Identity Linkage.
          </p>
        </div>
        <Button onClick={runFrontend} disabled={feRunning} variant="outline" className="gap-1.5">
          {feRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {feRunning ? 'Running...' : 'Re-run Frontend'}
        </Button>
      </div>

      {/* Frontend suite — Access Engine + Membership */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-orbitan-blue" /> Frontend Suite
            <span className="text-xs font-normal text-muted-foreground">MembershipResolver · AccessEngine · Precedence</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {feReport ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Stat label="Total" value={feReport.summary.total} color="text-foreground" />
                <Stat label="Passed" value={feReport.summary.passed} color="text-orbitan-green" />
                <Stat label="Failed" value={feReport.summary.failed} color={feReport.summary.failed > 0 ? 'text-orbitan-red' : 'text-muted-foreground'} />
              </div>
              <div className="text-xs text-muted-foreground mb-3">Pass rate: <strong className="text-foreground">{feReport.summary.pass_rate}</strong></div>
              <div>
                {feReport.tests.map((t, i) => <TestRow key={i} t={t} />)}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Running pure suite…</div>
          )}
        </CardContent>
      </Card>

      {/* Backend suite — Identity Linkage classifier (shared canonical) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4 text-orbitan-blue" /> Backend Suite
            <span className="text-xs font-normal text-muted-foreground">Identity Linkage Classifier · shared/identityLinkage.ts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <Button onClick={runBackend} disabled={beRunning || !canRunBackend} className="gap-1.5">
              {beRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {beRunning ? 'Running...' : 'Run Backend Suite'}
            </Button>
            {!canRunBackend && (
              <span className="text-xs text-orbitan-amber flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Requires platform admin.
              </span>
            )}
          </div>
          {beError && (
            <div className="text-sm text-destructive mb-3">{beError}</div>
          )}
          {beReport && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Stat label="Total" value={beReport.summary.total} color="text-foreground" />
                <Stat label="Passed" value={beReport.summary.passed} color="text-orbitan-green" />
                <Stat label="Failed" value={beReport.summary.failed} color={beReport.summary.failed > 0 ? 'text-orbitan-red' : 'text-muted-foreground'} />
              </div>
              <div className="text-xs text-muted-foreground mb-3">Pass rate: <strong className="text-foreground">{beReport.summary.pass_rate}</strong></div>
              <div>
                {beReport.tests.map((t, i) => <TestRow key={i} t={t} />)}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}