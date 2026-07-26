// ============================================================
// ORBITANOS — Integration Health Panel (Build #26A)
// Reusable deterministic health presentation layer for integrations.
// Detects conditions from existing data (no AI, no fabrication) and
// recommends a resolution per condition. Status is never colour-only.
// ============================================================

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle, Info, Activity, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

const SEVERITY = {
  healthy: { icon: CheckCircle2, color: 'text-orbitan-green', bg: 'bg-orbitan-green-light', border: 'border-orbitan-green/30', label: 'Healthy' },
  info: { icon: Info, color: 'text-orbitan-blue-700', bg: 'bg-orbitan-blue-light', border: 'border-orbitan-blue/30', label: 'Info' },
  warning: { icon: AlertTriangle, color: 'text-orbitan-amber-700', bg: 'bg-orbitan-amber-light', border: 'border-orbitan-amber/30', label: 'Warning' },
  critical: { icon: XCircle, color: 'text-orbitan-red-700', bg: 'bg-orbitan-red-light', border: 'border-orbitan-red/30', label: 'Critical' },
};

/**
 * Computes deterministic health conditions from the supplied health object.
 * Returns an ordered list of { severity, title, description, fix }.
 */
export function computeHealthConditions(health = {}) {
  const out = [];
  const { configured, connected, status, last_error, pending_count = 0, failed_count = 0, testResult } = health;

  if (!configured) {
    out.push({
      severity: 'critical',
      title: 'Missing Platform Configuration',
      description: 'Xero OAuth credentials are not configured. The Platform Owner must add XERO_CLIENT_ID and XERO_CLIENT_SECRET.',
      fix: 'Platform Admin → Base44 Settings → Environment Variables → add XERO_CLIENT_ID and XERO_CLIENT_SECRET (values stay secret; the app never exposes them).',
    });
    return out; // nothing else is meaningful without config
  }

  if (status === 'not_connected') {
    out.push({ severity: 'info', title: 'Xero Not Connected', description: 'Xero is ready but no organisation is linked yet.', fix: 'Click "Connect Xero" to authorise your Xero organisation.' });
  } else if (status === 'disconnected') {
    out.push({ severity: 'warning', title: 'Disconnected Account', description: 'The Xero connection was disconnected.', fix: 'Reconnect Xero to resume sync.' });
  } else if (status === 'expired') {
    out.push({ severity: 'warning', title: 'Expired Token', description: 'The Xero access token has expired or was revoked.', fix: 'Reconnect Xero to obtain a fresh token.' });
  } else if (status === 'error') {
    out.push({ severity: 'critical', title: 'Connection Error', description: last_error || 'The Xero connection reported an error.', fix: 'Review the error, run Test Connection, or reconnect.' });
  } else if (connected) {
    out.push({ severity: 'healthy', title: 'Healthy Connection', description: 'Xero is connected and operational.', fix: null });
  }

  if (configured && connected && failed_count >= 3) {
    out.push({ severity: 'critical', title: 'Repeated Sync Failures', description: `${failed_count} sync entries have failed.`, fix: 'Open the Sync Queue, review last_error per entry, fix the underlying record, then re-run Sync Now.' });
  } else if (configured && connected && failed_count > 0) {
    out.push({ severity: 'warning', title: 'Sync Failures', description: `${failed_count} sync entr${failed_count === 1 ? 'y' : 'ies'} failed.`, fix: 'Review the failed entries in the Sync Queue.' });
  }

  if (pending_count > 20) {
    out.push({ severity: 'warning', title: 'Pending Sync Backlog', description: `${pending_count} entries waiting to sync.`, fix: 'Run Sync Now to process the backlog.' });
  }

  if (testResult && !testResult.healthy) {
    out.push({
      severity: 'critical',
      title: 'Connection Test Failed',
      description: testResult.message,
      fix: testResult.reason === 'revoked' ? 'Reconnect Xero — access was revoked.' : 'Reconnect Xero, or contact the Platform Owner if the issue persists.',
    });
  } else if (testResult && testResult.healthy) {
    out.push({ severity: 'healthy', title: 'Connection Test Passed', description: testResult.message, fix: null });
  }

  if (out.length === 0) {
    out.push({ severity: 'info', title: 'No Health Data', description: 'Integration health data is not available yet.', fix: null });
  }
  return out;
}

export default function IntegrationHealthPanel({ health = {}, loading = false }) {
  const conditions = computeHealthConditions(health);
  const overall = conditions.some((c) => c.severity === 'critical')
    ? 'critical'
    : conditions.some((c) => c.severity === 'warning')
    ? 'warning'
    : 'healthy';
  const overallCfg = SEVERITY[overall];
  const OverallIcon = overallCfg.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
              <Activity className="w-4.5 h-4.5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Integration Health</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Deterministic checks — no AI conclusions.</p>
            </div>
          </div>
          <Badge className={cn(overallCfg.bg, overallCfg.color, overallCfg.border, 'border')}>
            <OverallIcon className="w-3 h-3 mr-1" />
            {overallCfg.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-3">Checking integration health…</p>
        ) : (
          <ul className="space-y-3" aria-label="Integration health conditions">
            {conditions.map((c, i) => {
              const cfg = SEVERITY[c.severity];
              const Icon = cfg.icon;
              return (
                <li key={i} className={cn('rounded-lg border p-3', cfg.bg, cfg.border)}>
                  <div className="flex items-start gap-2.5">
                    <Icon className={cn('w-4 h-4 flex-shrink-0 mt-0.5', cfg.color)} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{c.title}</span>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-background/60', cfg.color)}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.description}</p>
                      {c.fix && (
                        <p className="text-xs text-foreground/80 mt-2 flex items-start gap-1.5">
                          <Wrench className="w-3 h-3 flex-shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true" />
                          <span><span className="font-medium">Recommended fix:</span> {c.fix}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}