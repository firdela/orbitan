import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Loader2, Shield, Ban, Play, RotateCcw } from 'lucide-react';
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

export default function AIApprovalQueue() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [decisionReason, setDecisionReason] = useState({});
  const [processing, setProcessing] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const { data: approvals, isLoading, isError } = useQuery({
    queryKey: ['ai-approvals-active'],
    queryFn: async () => {
      const result = await base44.entities.AIApproval.filter(
        { status: { $in: ['pending', 'approved'] } }, '-created_date', 50
      );
      return result || [];
    },
    refetchInterval: 30000,
  });

  const callApprovalAction = async (action, approvalId, reason) => {
    const response = await base44.functions.invoke('aiApprovalActions', {
      action,
      approval_id: approvalId,
      decision_reason: reason,
    });
    return response.data;
  };

  const handleDecision = async (action, approval) => {
    setProcessing(approval.id);
    const reason = decisionReason[approval.id]?.trim() || (action === 'approve' ? 'Approved.' : 'Rejected.');
    try {
      const result = await callApprovalAction(action, approval.id, reason);
      queryClient.invalidateQueries({ queryKey: ['ai-approvals-active'] });
      toast({
        title: action === 'approve' ? '✓ Approval Granted' : '✓ Approval Rejected',
        description: action === 'approve'
          ? 'The requester can now execute this AI action.'
          : 'The AI request has been denied.',
      });
      return result;
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Please try again.';
      toast({ title: 'Action Failed', description: msg, variant: 'destructive' });
      throw err;
    } finally {
      setProcessing(null);
      setConfirmDialog(null);
    }
  };

  const requestApprove = (approval) => {
    setConfirmDialog({ action: 'approve', approval });
  };

  const requestReject = (approval) => {
    setConfirmDialog({ action: 'reject', approval });
  };

  const requestExecute = (approval) => {
    setConfirmDialog({ action: 'execute', approval });
  };

  const confirmDecision = async () => {
    if (!confirmDialog) return;
    await handleDecision(confirmDialog.action, confirmDialog.approval);
  };

  if (isLoading) return <OrbitanLoader size="md" message="Loading approvals..." />;

  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load approvals"
        description="There was an error loading pending approvals. Please try again."
      />
    );
  }

  if (!approvals || approvals.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No pending approvals"
        description="AI actions requiring human approval will appear here."
      />
    );
  }

  return (
    <>
      <div className="grid gap-3">
        {approvals.map((approval) => {
          const isExpired = approval.expires_at && new Date(approval.expires_at) < new Date();
          const expiresIn = approval.expires_at ? Math.round((new Date(approval.expires_at) - new Date()) / (1000 * 60)) : null;

          return (
            <Card key={approval.id} className={`card-elevated ${isExpired ? 'border-destructive/30' : 'border-amber-500/20 bg-amber-500/5'}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <span className="font-medium text-sm">{approval.service_key}</span>
                      <Badge variant="outline" className="text-xs font-mono">{approval.approval_key?.substring(0, 20)}...</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{approval.approval_reason}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{approval.autonomy_level}</Badge>
                      <Badge variant="outline" className="text-xs">{approval.model_key}</Badge>
                      <Badge variant="outline" className="text-xs capitalize">{approval.data_classification}</Badge>
                      <Badge variant="outline" className="text-xs">~{approval.estimated_credits} credits</Badge>
                      {approval.approving_role && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Shield className="w-3 h-3" />
                          {approval.approving_role}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">{approval.requester_name}</p>
                    <p className="text-[10px] text-muted-foreground">{approval.requester_role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  {isExpired ? (
                    <span className="text-xs text-destructive font-medium">Expired</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Expires in {expiresIn} min</span>
                  )}
                </div>

                {!isExpired && (
                  <>
                    <Textarea
                      placeholder="Decision reason (optional)..."
                      value={decisionReason[approval.id] || ''}
                      onChange={(e) => setDecisionReason({ ...decisionReason, [approval.id]: e.target.value })}
                      className="h-16 mb-3 text-xs"
                      aria-label={`Decision reason for ${approval.service_key} approval`}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => requestApprove(approval)}
                        disabled={processing === approval.id}
                        aria-label={`Approve ${approval.service_key} request`}
                      >
                        {processing === approval.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5"
                        onClick={() => requestReject(approval)}
                        disabled={processing === approval.id}
                        aria-label={`Reject ${approval.service_key} request`}
                      >
                        {processing === approval.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                        Reject
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.action === 'approve' ? 'Approve AI Request?' : 'Reject AI Request?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.action === 'approve'
                ? `This will allow the requester to execute the AI action "${confirmDialog?.approval?.service_key}". The approver identity will be recorded server-side.`
                : `This will deny the AI request "${confirmDialog?.approval?.service_key}". The requester will be notified with your reason.`}
              {confirmDialog?.approval?.requester_name && ` Requester: ${confirmDialog.approval.requester_name}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing === confirmDialog?.approval?.id}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDecision}
              disabled={processing === confirmDialog?.approval?.id}
              className={confirmDialog?.action === 'reject' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {processing === confirmDialog?.approval?.id ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processing...
                </>
              ) : confirmDialog?.action === 'approve' ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  Confirm Approve
                </>
              ) : (
                <>
                  <Ban className="w-3 h-3" />
                  Confirm Reject
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}