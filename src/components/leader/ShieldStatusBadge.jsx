/**
 * ShieldStatusBadge — Orbitan Shield™ governance enforcement indicator.
 * Wraps the compact badge in a Radix HoverCard that explains the tenant's
 * governance posture on hover/tap. When no policies are registered, the
 * card surfaces a one-click remediation link to the Shield Command Center.
 *
 * ADR-0030 (Contextual Help & Discoverability) — badges must self-explain.
 * ADR-0041 (Shield Forensic Artifact Linkage) — enforcement visibility.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { Shield, ShieldAlert, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ShieldStatusBadge({ policyCount = 0, governanceDomain }) {
  const shieldActive = policyCount > 0;
  const domainLabel = governanceDomain
    ? governanceDomain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : null;

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border transition-colors cursor-pointer",
            shieldActive
              ? "bg-orbitan-green-light text-orbitan-green border-green-200 hover:bg-green-100"
              : "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
          )}
        >
          {shieldActive
            ? <Shield className="w-3 h-3" />
            : <ShieldAlert className="w-3 h-3" />}
          {shieldActive ? `${policyCount}` : 'No Gates'}
        </button>
      </HoverCardTrigger>
      <HoverCardContent side="bottom" align="start" className="w-72 p-4">
        {shieldActive ? (
          /* ── Protected ── */
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orbitan-green-light flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-orbitan-green" />
              </div>
              <div>
                <p className="text-sm font-heading font-bold text-foreground">Shield Governance Active</p>
                <p className="text-[10px] text-muted-foreground">Orbitan Shield™ enforcement is live</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">{policyCount}</span> governance{' '}
              {policyCount === 1 ? 'policy is' : 'policies are'} protecting this tenant. Sensitive
              actions — purchases, stock adjustments, compliance sign-offs — are evaluated against
              your domain rules before they execute.
            </p>
            {domainLabel && (
              <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
                Domain: <span className="font-mono text-foreground">{domainLabel}</span>
              </p>
            )}
          </div>
        ) : (
          /* ── Unprotected — remediation CTA ── */
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-heading font-bold text-foreground">No Governance Gates</p>
                <p className="text-[10px] text-muted-foreground">This tenant is unprotected</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No <span className="font-semibold text-foreground">GovernancePolicy</span> records are
              registered for this tenant. Automated and high-value actions proceed without policy
              evaluation — a compliance risk for pilot operations.
            </p>
            <Link
              to="/platform/shield"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orbitan-blue hover:text-orbitan-blue/80 transition-colors pt-1"
            >
              Provision policies in Shield Command Center
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}