import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import OrbitanLoader from '@/components/brand/OrbitanLoader';
import EmptyState from '@/components/shared/EmptyState';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

export default function AIApprovalQueue() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [decisionReason, setDecisionReason] = useState({});
  const [processing, setProcessing] = useState(null);

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['ai-approvals-pending'],
    queryFn: async () => {
      const result = await base44.entities.AIApproval.filter({ status: 'pending' }, '-created_date', 50);
      return result || [];
    },
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ approvalId, reason }) => {
      return await base44.entities.AIApproval.update(approvalId, {
        status: 'approved',
        approver_user_id: null, // Set by backend
        decision_reason: reason,
        decided_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-approvals-pending'] });
      toast({ title: '✓ Approval Granted', description: 'The requester can now execute this AI action.' });
      setProcessing(null);
    },
    onError: (err) => {
      toast({ title: 'Approval Failed', description: err.message || 'Please try again.', variant: 'destructive' });
      setProcessing(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ approvalId, reason }) => {
      return await base44.entities.AIApproval.update(approvalId, {
        status: 'rejected',
        decision_reason: reason,
        decided_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-approvals-pending'] });
      toast({ title: '✓ Approval Rejected', description: 'The AI request has been denied.' });
      setProcessing(null);
    },
    onError: (err) => {
      toast({ title: 'Rejection Failed', description: err.message || 'Please try again.', variant: 'destructive' });
      setProcessing(null);
    },
  });

  const handleApprove = (approval) => {
    setProcessing(approval.id);
    const reason = decisionReason[approval.id] || 'Approved — action is authorised.';
    approveMutation.mutate({ approvalId: approval.id, reason });
  };

  const handleReject = (approval) => {
    setProcessing(approval.id);
    const reason = decisionReason[approval.id] || 'Rejected — action is not authorised.';
    rejectMutation.mutate({ approvalId: approval.id, reason });
  };

  if (isLoading) return <OrbitanLoader size="md" message="Loading approvals..." />;

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
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => handleApprove(approval)}
                      disabled={processing === approval.id}
                    >
                      {processing === approval.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5"
                      onClick={() => handleReject(approval)}
                      disabled={processing === approval.id}
                    >
                      <XCircle className="w-3 h-3" />
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
  );
}