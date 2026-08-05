import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, Loader2, Shield, Ban,
  Play,
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

const STATUS_CONFIG = {
  pending:           { label: 'Pending',           variant: 'secondary', icon: Clock,         border: 'border-amber-500/20 bg-amber-500/5' },
  approved:          { label: 'Approved',           variant: 'default',   icon: CheckCircle2,  border: 'border-emerald-500/20 bg-emerald-500/5' },
  executing:         { label: 'Executing',          variant: 'secondary', icon: Loader2,       border: 'border-blue-500/20 bg-blue-500/5' },
  executed:          { label: 'Executed',          variant: 'default',   icon: CheckCircle2,  border: 'border-emerald-500/10' },
  execution_failed:  { label: 'Execution Failed',  variant: 'destructive', icon: AlertTriangle, border: 'border-destructive/20' },
  rejected:          { label: 'Rejected',          variant: 'destructive', icon: XCircle,      border: 'border-destructive/10' },
  cancelled:         { label: 'Cancelled',          variant: 'secondary', icon: Ban,           border: 'border-muted' },
  expired:           { label: 'Expired',           variant: 'destructive', icon: Clock,        border: 'border-destructive/10' },
};

const TERMINAL_STATUSES = ['executed', 'execution_failed', 'rejected', 'cancelled', 'expired'];

export default function AIRequestStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [payloadInputs, setPayloadInputs] = useState({});
  const [submittingId, setSubmittingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const { data: myApprovals, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-ai-approvals'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (!user) return [];
      const result = await base44.entities.AIApproval.filter(
        { requester_user_id: user.id },
        '-created_date', 50,
      );
      return result || [];
    },
    refetchInterval: 30000,
  });

  const callApprovalAction = async (action, approvalId, payload) => {
    const response = await base44.functions.invoke('aiApprovalActions', {
      action,
      approval_id: approvalId,
      decision_reason: action === 'cancel' ? 'Cancelled by requester.' : '',
      payload,
    });
    return response.data;
  };

  const handleExecute = async (approval) => {
    if (submittingId) return;
    setSubmittingId(approval.id);
    setConfirmDialog(null);

    const payloadText = payloadInputs[approval.id]?.trim() || '';
    let payload = {};
    if (payloadText) {
      try {
        payload = JSON.parse(payloadText);
      } catch {
        toast({ title: 'Invalid JSON', description: 'Please enter valid JSON for the payload.', variant: 'destructive' });
        setSubmittingId(null);
        return;
      }
    }

    try {
      const result = await callApprovalAction('execute', approval.id, payload);
      queryClient.invalidateQueries({ queryKey: ['my-ai-approvals'] });
      if (result?.success) {
        toast({
          title: '✓ Execution Complete',
          description: 'Your approved AI request has been executed.',
        });
      } else {
        toast({
          title: 'Execution Failed',
          description: result?.error || 'The execution could not be completed.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Please try again.';
      const errorCode = err?.response?.data?.safe_error_code;
      if (errorCode === 'forbidden') {
        toast({ title: 'Permission Denied', description: msg, variant: 'destructive' });
      } else if (errorCode === 'audit_failure') {
        toast({ title: 'Audit Error', description: msg, variant: 'destructive' });
      } else {
        toast({ title: 'Execution Failed', description: msg, variant: 'destructive' });
      }
    } finally {
      setSubmittingId(null);
    }
  };

  const handleCancel = async (approval) => {
    if (submittingId) return;
    setSubmittingId(approval.id);
    setConfirmDialog(null);
    try {
      await callApprovalAction('cancel', approval.id);
      queryClient.invalidateQueries({ queryKey: ['my-ai-approvals'] });
      toast({ title: '✓ Request Cancelled', description: 'Your AI request has been cancelled.' });
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Please try again.';
      toast({ title: 'Cancel Failed', description: msg, variant: 'destructive' });
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
    if (confirmDialog.action === 'execute') {
      handleExecute(confirmDialog.approval);
    } else {
      handleCancel(confirmDialog.approval);
    }
  };

  if (isLoading) return <OrbitanLoader size="md" message="Loading your AI requests..." />;

  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load your requests"
        description="There was an error loading your AI request records. You can try again."
        actionLabel="Retry"
        onAction={() => refetch()}
      />
    );
  }

  if (!myApprovals || myApprovals.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No AI requests"
        description="Your AI action requests and their approval status will appear here."
      />
    );
  }

  return (
    <>
      <div className="grid gap-3">
        {myApprovals.map((approval) => {
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
              aria-label={`AI request ${approval.approval_key || approval.id}, status ${statusConfig.label}`}
            >
              <CardContent className="p-4">
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
                      <Badge variant={statusConfig.variant} className="text-xs">{statusConfig.label}</Badge>
                      {approval.autonomy_level && (
                        <Badge variant="secondary" className="text-xs">{approval.autonomy_level}</Badge>
                      )}
                      {approval.model_key && (
                        <Badge variant="outline" className="text-xs">{approval.model_key}</Badge>
                      )}
                      {approval.data_classification && (
                        <Badge variant="outline" className="text-xs capitalize">{approval.data_classification}</Badge>
                      )}
                    </div>
                  </div>
                </div>

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

                {/* Cancel button for pending requests */}
                {isPending && !isExpired && (
                  <div className="flex gap-2 mb-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => requestConfirm('cancel', approval)}
                      disabled={isSubmitting}
                      aria-label={`Cancel ${approval.service_key} request`}
                    >
                      {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                      Cancel Request
                    </Button>
                  </div>
                )}

                {/* Execute section for approved requests — requester resubmits payload */}
                {isApproved && !isExpired && (
                  <div className="space-y-2 mb-3">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      This request has been approved. Resubmit your original payload to execute.
                    </p>
                    <Textarea
                      placeholder='Enter your original request payload as JSON (e.g. {"prompt": "Generate SOP for..."})'
                      value={payloadInputs[approval.id] || ''}
                      onChange={(e) => setPayloadInputs({ ...payloadInputs, [approval.id]: e.target.value })}
                      className="h-20 text-xs font-mono"
                      aria-label={`Payload for ${approval.service_key} execution`}
                      disabled={isSubmitting}
                    />
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => requestConfirm('execute', approval)}
                      disabled={isSubmitting}
                      aria-label={`Execute ${approval.service_key} approved request`}
                    >
                      {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      Execute Approved Request
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
                    <span>This request is final and cannot be modified.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!confirmDialog} onOpenChange={(open) => !open && !submittingId && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.action === 'execute' ? 'Execute Approved AI Request?' : 'Cancel AI Request?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.action === 'execute'
                ? `This will execute the approved AI request "${confirmDialog?.approval?.service_key}" through the canonical Nexus gateway. All governance checks will be re-run server-side. The payload hash must match the approved scope.`
                : `This will cancel your pending AI request "${confirmDialog?.approval?.service_key}". This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!submittingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmAction(); }}
              disabled={!!submittingId}
              className={confirmDialog?.action === 'cancel' ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : ''}
            >
              {submittingId ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Processing...</>
              ) : confirmDialog?.action === 'execute' ? (
                <><Play className="w-3 h-3" /> Confirm Execute</>
              ) : (
                <><Ban className="w-3 h-3" /> Confirm Cancel</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}