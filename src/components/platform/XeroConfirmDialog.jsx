import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, AlertTriangle, CheckCircle2, Loader2, Link2, ArrowRight } from 'lucide-react';

// ============================================================
// XeroConfirmDialog — Build #28.2F
// Organisation confirmation dialog shown after the Xero OAuth
// callback and before the connection is finalised.
//
// Compares the selected Xero organisation with the current
// Orbitan workspace, warns on name mismatch, and requires
// explicit confirmation for cross-tenant conflicts.
// ============================================================

// ── Name similarity heuristic ──
// Strips common legal suffixes (Pte Ltd, Ltd, LLC, etc.) and
// compares the normalised strings. Returns a 0–1 similarity score.
function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/\b(pte\.?\s*ltd\.?|ltd\.?|llc|inc\.?|corp\.?|limited|private|sdn\.?\s*bhd\.?|global|demo\s*company)\b/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameSimilarity(xeroName, workspaceName) {
  const nx = normalizeName(xeroName);
  const nw = normalizeName(workspaceName);
  if (!nx || !nw) return 0;
  if (nx === nw) return 1;
  if (nx.includes(nw) || nw.includes(nx)) return 0.75;
  // Check prefix overlap
  const minLen = Math.min(nx.length, nw.length);
  let prefixMatch = 0;
  for (let i = 0; i < minLen; i++) {
    if (nx[i] === nw[i]) prefixMatch++;
    else break;
  }
  if (prefixMatch >= 3) return 0.6;
  return 0;
}

export default function XeroConfirmDialog({
  open,
  xeroOrg,         // { tenantId, tenantName, tenantType }
  workspaceName,   // Orbitan workspace name
  workspaceId,     // Orbitan tenant ID
  hasConflict,     // cross-tenant conflict flag
  conflictMessage,
  loading,
  onConfirm,
  onChooseAnother,
  onCancel,
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (open) setAcknowledged(false);
  }, [open, xeroOrg?.tenantId]);

  if (!xeroOrg) return null;

  const similarity = nameSimilarity(xeroOrg.tenantName, workspaceName);
  const namesMatch = similarity >= 0.6;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-md" aria-describedby="xero-confirm-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {namesMatch ? (
              <CheckCircle2 className="w-5 h-5 text-orbitan-green flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-orbitan-amber-700 flex-shrink-0" />
            )}
            Confirm Xero Organisation
          </DialogTitle>
          <DialogDescription id="xero-confirm-desc">
            {namesMatch
              ? 'Please confirm the Xero organisation to connect to this workspace.'
              : 'The selected organisation name differs from your workspace name. Please review carefully.'}
          </DialogDescription>
        </DialogHeader>

        {/* ── Organisation comparison ── */}
        <div className="space-y-3 py-2">
          {/* Xero org */}
          <div className="rounded-lg border border-border p-3 bg-sky-50/50">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-md bg-sky-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-sky-600">X</span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Xero Organisation</p>
                <p className="text-sm font-semibold text-foreground truncate">{xeroOrg.tenantName || 'Unnamed'}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pl-9 truncate">ID: {xeroOrg.tenantId}</p>
            {xeroOrg.tenantType && (
              <p className="text-xs text-muted-foreground pl-9">Type: {xeroOrg.tenantType}</p>
            )}
          </div>

          {/* Binding arrow */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Link2 className="w-4 h-4" />
            <ArrowRight className="w-4 h-4" />
          </div>

          {/* Orbitan workspace */}
          <div className="rounded-lg border border-border p-3 bg-orbitan-blue-light/30">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-md bg-orbitan-blue-light flex items-center justify-center flex-shrink-0">
                <Building2 className="w-3.5 h-3.5 text-orbitan-blue" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Orbitan Workspace</p>
                <p className="text-sm font-semibold text-foreground truncate">{workspaceName || 'Unknown'}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pl-9 truncate">Tenant ID: {workspaceId}</p>
          </div>
        </div>

        {/* ── Name mismatch warning ── */}
        {!namesMatch && (
          <div className="rounded-lg border border-orbitan-amber/30 bg-orbitan-amber-light/50 p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orbitan-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-foreground">
                  You selected the Xero organisation <strong>{xeroOrg.tenantName}</strong>, but your current
                  Orbitan workspace is <strong>{workspaceName}</strong>.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Organisations may have different legal and trading names. Please verify this is the correct organisation.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Cross-tenant conflict warning ── */}
        {hasConflict && (
          <div className="rounded-lg border border-orbitan-red/30 bg-orbitan-red-light/50 p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orbitan-red-700 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-foreground font-medium">Already connected elsewhere</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {conflictMessage || 'This Xero organisation is already connected to another Orbitan workspace.'}
                </p>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <Checkbox
                    checked={acknowledged}
                    onCheckedChange={(v) => setAcknowledged(!!v)}
                  />
                  <span className="text-xs">I understand and want to connect this organisation anyway.</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={onCancel} disabled={loading} className="sm:mr-auto">
            Cancel
          </Button>
          {onChooseAnother && (
            <Button variant="outline" onClick={onChooseAnother} disabled={loading}>
              Choose Another
            </Button>
          )}
          <Button
            onClick={onConfirm}
            disabled={loading || (hasConflict && !acknowledged)}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : namesMatch ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : null}
            {namesMatch ? 'Confirm Connection' : 'Connect Anyway'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}