import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ExternalLink, FileText, Shield, User, Workflow } from 'lucide-react';
import {
  SEVERITY_CONFIG, SHIELD_STYLES, MODULE_LABELS, CATEGORY_LABELS,
  formatAction, formatTimestamp,
} from '@/components/audit-centre/auditConfig';

function Field({ label, children }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">{label}</p>
      <div className="text-sm text-foreground">{children || '—'}</div>
    </div>
  );
}

// Right-hand detail drawer for a single audit event. Renders every stored
// field without duplicating source business data (only snapshots + provenance).
export default function AuditDetailSheet({ log, open, onOpenChange, tenantName }) {
  if (!log) return null;
  const sev = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;
  const SevIcon = sev.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 pr-6">
            <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center', sev.iconWrap)}>
              <SevIcon className="w-4 h-4" />
            </span>
            <span className="capitalize">{formatAction(log.action_type)}</span>
          </SheetTitle>
          <SheetDescription>
            {log.details || `${formatAction(log.action_type)} on ${log.target_entity || 'record'}`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Core metadata */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Timestamp">{formatTimestamp(log.created_date)}</Field>
            <Field label="Severity">
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-medium', sev.badge)}>
                {sev.label}
              </span>
            </Field>
            <Field label="Actor">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                {log.actor_name || 'System'}
                {log.actor_role && log.actor_role !== 'system_event' && (
                  <span className="text-xs text-muted-foreground">({log.actor_role})</span>
                )}
              </span>
            </Field>
            <Field label="Module">{MODULE_LABELS[log.module] || log.module}</Field>
            <Field label="Category">{CATEGORY_LABELS[log.category] || log.category || 'Operational'}</Field>
            <Field label="Source">{log.event_source || 'system'}</Field>
          </div>

          {/* Target + provenance */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4">
            <Field label="Target Entity">{log.target_entity}</Field>
            <Field label="Record ID">
              <span className="font-mono text-xs break-all">{log.target_record_id}</span>
            </Field>
            <Field label="Tenant">{tenantName || log.tenant_id?.slice(-8) || '—'}</Field>
            <Field label="Outlet">{log.outlet_id?.slice(-8) || '—'}</Field>
            <Field label="IP / Device">{log.ip_address || '—'}</Field>
            <Field label="Related User">{log.related_user_id?.slice(-8) || '—'}</Field>
            {log.related_workflow && (
              <Field label="Related Workflow">
                <span className="flex items-center gap-1.5">
                  <Workflow className="w-3.5 h-3.5 text-muted-foreground" />{log.related_workflow}
                </span>
              </Field>
            )}
          </div>

          {/* Shield / governance */}
          {log.shield_outcome && log.shield_outcome !== 'not_evaluated' && (
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Shield className="w-4 h-4 text-primary" /> Governance Evaluation
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Shield Outcome">
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-medium', SHIELD_STYLES[log.shield_outcome])}>
                    {log.shield_outcome.replace(/_/g, ' ')}
                  </span>
                </Field>
                <Field label="Policy">{log.policy_name || '—'}</Field>
                {log.override_id && <Field label="Override ID"><span className="font-mono text-xs">{log.override_id.slice(-8)}</span></Field>}
              </div>
              {log.justification && (
                <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                  <p className="text-[11px] font-medium text-amber-700 mb-1 uppercase tracking-wide">Justification</p>
                  <p className="text-sm text-foreground">{log.justification}</p>
                </div>
              )}
            </div>
          )}

          {/* Evidence */}
          {log.evidence_urls?.length > 0 && (
            <div className="border-t border-border pt-4">
              <p className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">Evidence Attachments</p>
              <div className="flex flex-wrap gap-2">
                {log.evidence_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline bg-primary/5 px-2.5 py-1.5 rounded-md border border-primary/20">
                    <FileText className="w-3.5 h-3.5" /> Attachment {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* State diff */}
          {(log.previous_state || log.new_state) && (
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">State Change</p>
              {log.previous_state && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Previous</p>
                  <pre className="text-[11px] bg-muted/50 rounded-lg p-3 overflow-x-auto max-h-40">{JSON.stringify(log.previous_state, null, 2)}</pre>
                </div>
              )}
              {log.new_state && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">New</p>
                  <pre className="text-[11px] bg-muted/50 rounded-lg p-3 overflow-x-auto max-h-40">{JSON.stringify(log.new_state, null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {/* Deep link */}
          {log.link && (
            <div className="border-t border-border pt-4">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to={log.link}>
                  <ExternalLink className="w-4 h-4 mr-1.5" /> Open source record
                </Link>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}