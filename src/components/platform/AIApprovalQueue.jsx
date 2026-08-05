import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, Loader2, Shield, Ban,
  Play, RotateCcw, X, UserX,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import OrbitanLoader from '@/components/brand/OrbitanLoader';
import EmptyState from '@/components/shared/EmptyState';
import { useToast } from '@/components/ui/use-toast';

// ── STATUS CONFIG ──────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:           { label: 'Pending',           variant: 'secondary', icon: Clock,         border: 'border-amber-500/20 bg-amber-500/5' },
  approved:          { label: 'Approved',          variant: 'default',    icon: CheckCircle2,  border: 'border-emerald-500/20 bg-emerald-500/5' },
  executing:         { label: 'Executing',         variant: 'secondary',  icon: Loader2,        border: 'border-blue-500/20 bg-blue-500/5' },
  executed:          { label: 'Executed',          variant: 'default',    icon: CheckCircle2,  border: 'border-emerald-500/10' },
  execution_failed:  { label: 'Execution Failed',  variant: 'destructive', icon: AlertTriangle, border: 'border-destructive/20' },
  rejected:          { label: 'Rejected',          variant: 'destructive', icon: XCircle,       border: 'border-destructive/10' },
  cancelled:         { label: 'Cancelled',          variant: 'secondary',  icon: Ban,            border: 'border-muted' },
  expired:           { label: 'Expired',           variant: 'destructive', icon: Clock,         border: 'border-destructive/10' },
};

const TERMINAL_STATUSES = ['executed', 'execution_failed', 'rejected', 'cancelled', 'expired'];

export default function AIApprovalQueue() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [decisionReason, setDecisionReason] = useState({});
  const [submittingId, setSubmittingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const dialogRef = useRef(null);

  const { data: approvals, isLoading, isError, refetch } = useQuery({
    queryKey: ['ai-approvals-active'],
    queryFn: async () => {
      const result = await base44.entities.AIApproval.filter(
        { status: { $in: ['pending', 'approved', 'executing', 'execution_failed'] } },
        '-created_date', 50,
      );
      return result || [];
    },
    refetchInterval: 30000,
  });

  // ── BACKEND CALL (protected — never writes entity fields directly) ──
  const callApprovalAction = async (action, approvalId, reason) => {
    const response = await base44.functions.invoke('aiApprovalActions', {
      action,
      approval_id: approvalId,
      decision_reason: reason,
    });
    return response.data;
  };

  // ── IMMEDIATE MULTIPLE-CLICK PREVENTION ──────────────────────
  // Set submittingId BEFORE any async work so the button is disabled instantly.
  const handleSubmit = async (action, approval) => {
    if (submittingId) return; // prevent double-submit
    setSubmittingId(approval.id);
    setConfirmDialog(null);
    const reason = decisionReason[approval.id]?.trim() ||
      (action === 'approve' ? 'Approved.' : action === 'reject' ? 'Rejected.' : action === 'cancel' ? 'Cancelled.' : '');
    try {
      const result = await callApprovalAction(action, approval.id, reason);
      queryClient.invalidateQueries({ queryKey: ['ai-approvals-active'] });
      toast({
        title: action === 'approve' ? '✓ Approval Granted'
          : action === 'reject' ? '✓ Approval Rejected'
          : action === 'cancel' ? '✓ Approval Cancelled'
          : '✓ Execution Initiated',
        description: action === 'approve'
          ? 'The requester can now execute this AI action.'
          : action === 'reject' ? 'The AI request has been denied.'
          : action === 'cancel' ? 'The approval has been cancelled.'
          : 'The approved AI request is being processed.',
      });
      return result;
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Please try again.';
      const errorCode = err?.response?.data?.safe_error_code;
      // Permission-denied state
      if (errorCode === 'forbidden') {
        toast({ title: 'Permission Denied', description: msg, variant: 'destructive' });
      } else if (errorCode === 'audit_failure') {
        toast({ title: 'Audit Error', description: msg, variant: 'destructive' });
      } else {
        toast({ title: 'Action Failed', description: msg, variant: 'destructive' });
      }
    } finally {
      setSubmittingId(null);
    }
  };

  const requestConfirm = (action, approval) => {
    if (submittingId) return;
    setConfirmDialog({ action, approval });
  };

  const confirmAction = () => {
    if (!confirmDialog) return;
    handleSubmit(confirmDialog.action, confirmDialog.approval);
  };

  // ── FOCUS MANAGEMENT: focus the confirm button when dialog opens ──
  useEffect(() => {
    if (confirmDialog && dialogRef.current) {
      setTimeout(() => dialogRef.current?.focus(), 50);
    }
  }, [confirmDialog]);

  // ── LOADING STATE ────────────────────────────────────────────
  if (isLoading) return <OrbitanLoader size="md" message="Loading approvals..." />;

  // ── RETRYABLE ERROR STATE ────────────────────────────────────
  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load approvals"
        description="There was an error loading approval records. You can try again."
        actionLabel="Retry"
        onAction={() => refetch()}
      />
    );
  }

  // ── EMPTY STATE ───────────────────────────────────────────────
  if (!approvals || approvals.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No active approvals"
        description="AI actions requiring human approval will appear here."
      />
    );
  }

  const dialogTitle = confirmDialog?.action === 'approve' ? 'Approve AI Request?'
    : confirmDialog?.action === 'reject' ? 'Reject AI Request?'
    : confirmDialog?.action === 'cancel' ? 'Cancel AI Request?'
    : 'Execute Approved AI Request?';

  const dialogDescription = confirmDialog?.action === 'approve'
    ? `This will allow the requester to execute the AI action "${confirmDialog?.approval?.service_key}". The approver identity will be recorded server-side.`
    : confirmDialog?.action === 'reject'
      ? `This will deny the AI request "${confirmDialog?.approval?.service_key}". The requester will be notified with your reason.`
      : confirmDialog?.action === 'cancel'
        ? `This will cancel the pending AI request "${confirmDialog?.approval?.service_key}". This action cannot be undone.`
        : `This will execute the approved AI request "${confirmDialog?.approval?.service_key}" through the canonical Nexus gateway. All governance checks will be re-run server-side.`;

  return (
    <>
      <div className="grid gap-3">
        {approvals.map((approval) => {
          const statusConfig = STATUS_CONFIG[approval.status] || STATUS_CONFIG.pending;
          const StatusIcon = statusConfig.icon;
          const isExpired = approval.expires_at && new Date(approval.expires_at) < new Date() && approval.status === 'pending';
          const expiresIn = approval.expires_at ? Math.round((new Date(approval.expires_at) - new Date()) / (1000 * 60)) : null;
          const isPending = approval.status === 'pending';
          const isApproved = approval.status === 'approved';
          const isExecuting = approval.status === 'executing';
          const isTerminal = TERMINAL_STATUSES.includes(approval.status);
          const isSubmitting = submittingId === approval.id;

          return (
            <Card
              key={approval.id}
              className={`card-elevated ${statusConfig.border} ${isExpired ? 'border-destructive/30' : ''}`}
              role="article"
              aria-label={`AI approval ${approval.approval_key || approval.id}, status ${statusConfig.label}`}
            >
              <CardContent className="p-4">
                {/* ── HEADER ─────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <StatusIcon className={`w-4 h-4 flex-shrink-0 ${
                        isExecuting ? 'animate-spin text-blue-500' :
                        approval.status === 'approved' ? 'text-emerald-500' :
                        approval.status === 'executed' ? 'text-emerald-500' :
                        approval.status === 'rejected' || approval.status === 'execution_failed' ? 'text-destructive' :
                        isExpired ? 'text-destructive' : 'text-amber-500'
                      }`} />
                      <span className="font-medium text-sm truncate">{approval.service_key}</span>
                      <Badge variant="outline" className="text-xs font-mono">
                        {approval.approval_key?.substring(0, 20) || approval.id.substring(0, 12)}...
                      </Badge>
                    </div>
                    {approval.approval_reason && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{approval.approval_reason}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant={statusConfig.variant} className="text-xs">
                        {statusConfig.label}
                      </Badge>
                      {approval.autonomy_level && (
                        <Badge variant="secondary" className="text-xs">{approval.autonomy_level}</Badge>
                      )}
                      {approval.model_key && (
                        <Badge variant="outline" className="text-xs">{approval.model_key}</Badge>
                      )}
                      {approval.data_classification && (
                        <Badge variant="outline" className="text-xs capitalize">{approval.data_classification}</Badge>
                      )}
                      {approval.estimated_credits != null && (
                        <Badge variant="outline" className="text-xs">~{approval.estimated_credits} credits</Badge>
                      )}
                      {approval.approving_role && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Shield className="w-3 h-3" />
                          {approval.approving_role}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">{approval.requester_name || 'Unknown'}</p>
                    <p className="text-[10px] text-muted-foreground">{approval.requester_role || ''}</p>
                  </div>
                </div>

                {/* ── EXPIRY / TIMING ────────────────────────────── */}
                {(isPending || isApproved) && approval.expires_at && (
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    {isExpired ? (
                      <span className="text-xs text-destructive font-medium">Expired</span>
                    ) : expiresIn != null ? (
                      <span className="text-xs text-muted-foreground">
                        Expires in {expiresIn < 60 ? `${expiresIn} min` : `${Math.round(expiresIn / 60)} hr`}
                      </span>
                    ) : null}
                  </div>
                )}

                {/* ── EXECUTION INFO ─────────────────────────────── */}
                {approval.executed_at && (
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span className="text-xs text-muted-foreground">
                      Executed {new Date(approval.executed_at).toLocaleString()}
                    </span>
                  </div>
                )}
                {approval.decided_at && !isPending && (
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Decided by {approval.approver_name || 'admin'} • {new Date(approval.decided_at).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* ── REASON INPUT (pending only, non-expired) ──── */}
                {isPending && !isExpired && (
                  <Textarea
                    placeholder="Decision reason (optional)..."
                    value={decisionReason[approval.id] || ''}
                    onChange={(e) => setDecisionReason({ ...decisionReason, [approval.id]: e.target.value })}
                    className="h-16 mb-3 text-xs"
                    aria-label={`Decision reason for ${approval.service_key} approval`}
                    disabled={isSubmitting}
                  />
                )}

                {/* ── ACTION BUTTONS ────────────────────────────── */}
                {isPending && !isExpired && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => requestConfirm('approve', approval)}
                      disabled={isSubmitting}
                      aria-label={`Approve ${approval.service_key} request`}
                    >
                      {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5"
                      onClick={() => requestConfirm('reject', approval)}
                      disabled={isSubmitting}
                      aria-label={`Reject ${approval.service_key} request`}
                    >
                      {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5"
                      onClick={() => requestConfirm('cancel', approval)}
                      disabled={isSubmitting}
                      aria-label={`Cancel ${approval.service_key} request`}
                      title="Cancel this request"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                {isApproved && !isExpired && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => requestConfirm('execute', approval)}
                      disabled={isSubmitting}
                      aria-label={`Execute ${approval.service_key} approved request`}
                    >
                      {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      Execute
                    </Button>
                  </div>
                )}

                {isExecuting && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-blue-500/5 border border-blue-500/10">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      Executing through Nexus gateway...
                    </span>
                  </div>
                )}

                {approval.status === 'execution_failed' && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/5 border border-destructive/10">
                    <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                    <span className="text-xs text-destructive font-medium">
                      Execution failed. A new approval is required to retry.
                    </span>
                  </div>
                )}

                {isTerminal && approval.status !== 'execution_failed' && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Ban className="w-3 h-3" />
                    <span>This approval is final and cannot be modified.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── CONFIRMATION DIALOG ────────────────────────────────── */}
      <AlertDialog open={!!confirmDialog} onOpenChange={(open) => !open && !submittingId && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogDescription}
              {confirmDialog?.approval?.requester_name && ` Requester: ${confirmDialog.approval.requester_name}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!submittingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              ref={dialogRef}
              onClick={(e) => {
                e.preventDefault();
                confirmAction();
              }}
              disabled={!!submittingId}
              className={
                confirmDialog?.action === 'reject' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' :
                confirmDialog?.action === 'cancel' ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' :
                confirmDialog?.action === 'execute' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''
              }
            >
              {submittingId ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processing...
                </>
              ) : confirmDialog?.action === 'approve' ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  Confirm Approve
                </>
              ) : confirmDialog?.action === 'reject' ? (
                <>
                  <Ban className="w-3 h-3" />
                  Confirm Reject
                </>
              ) : confirmDialog?.action === 'cancel' ? (
                <>
                  <X className="w-3 h-3" />
                  Confirm Cancel
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  Confirm Execute
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}