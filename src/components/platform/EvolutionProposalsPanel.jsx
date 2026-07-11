import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, CheckCircle, XCircle, Clock, TrendingUp, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

const STATUS_CONFIG = {
  pending_review: { label: 'Pending Review', color: 'bg-amber-100 text-amber-800', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  implemented: { label: 'Implemented', color: 'bg-purple-100 text-purple-800', icon: Zap },
  measuring: { label: 'Measuring', color: 'bg-cyan-100 text-cyan-800', icon: TrendingUp },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const IMPACT_CONFIG = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export default function EvolutionProposalsPanel() {
  const queryClient = useQueryClient();
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState('');

  const { data: proposals, isLoading } = useQuery({
    queryKey: ['evolutionProposals'],
    queryFn: async () => {
      const result = await base44.entities.EvolutionProposal.list('-created_date', 50);
      return result || [];
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      return await base44.functions.invoke('evolutionEngine', { action: 'analyze' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolutionProposals'] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ proposalId, decision, notes }) => {
      return await base44.functions.invoke('evolutionEngine', {
        action: 'review_proposal',
        proposal_id: proposalId,
        decision,
        reviewer_notes: notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolutionProposals'] });
      setReviewDialogOpen(false);
      setReviewerNotes('');
      setSelectedProposal(null);
    },
  });

  const handleReview = (decision) => {
    if (!selectedProposal) return;
    reviewMutation.mutate({
      proposalId: selectedProposal.id,
      decision,
      notes: reviewerNotes,
    });
  };

  const stats = {
    total: proposals?.length || 0,
    pending: proposals?.filter(p => p.status === 'pending_review').length || 0,
    approved: proposals?.filter(p => p.status === 'approved').length || 0,
    completed: proposals?.filter(p => p.status === 'completed').length || 0,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Orbit Evolution
            </CardTitle>
            <CardDescription className="mt-1">
              AI-generated improvement proposals based on operational usage patterns.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            className="gap-1.5 flex-shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${analyzeMutation.isPending ? 'animate-spin' : ''}`} />
            Run Analysis
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-foreground">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-amber-600">{stats.pending}</p>
            <p className="text-[10px] text-muted-foreground">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-blue-600">{stats.approved}</p>
            <p className="text-[10px] text-muted-foreground">Approved</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-green-600">{stats.completed}</p>
            <p className="text-[10px] text-muted-foreground">Completed</p>
          </div>
        </div>

        {analyzeMutation.data?.data?.analysis_summary && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4 text-xs text-muted-foreground">
            Last analysis: {analyzeMutation.data.data.analysis_summary.proposals_generated} proposals generated from {analyzeMutation.data.data.analysis_summary.usage_records_analyzed} usage records.
          </div>
        )}

        {/* Proposals List */}
        {isLoading ? (
          <p className="text-center py-6 text-muted-foreground text-sm">Loading proposals...</p>
        ) : !proposals || proposals.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">No evolution proposals yet.</p>
            <p className="text-xs text-muted-foreground">Click "Run Analysis" to scan usage patterns and generate improvement recommendations.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {proposals.map(proposal => {
              const StatusIcon = STATUS_CONFIG[proposal.status]?.icon || Clock;
              const impactClass = IMPACT_CONFIG[proposal.expected_impact] || IMPACT_CONFIG.medium;
              return (
                <div
                  key={proposal.id}
                  className="border border-border rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => {
                    if (proposal.status === 'pending_review') {
                      setSelectedProposal(proposal);
                      setReviewDialogOpen(true);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={`text-[10px] ${STATUS_CONFIG[proposal.status]?.color}`}>
                          <StatusIcon className="w-2.5 h-2.5 mr-1" />
                          {STATUS_CONFIG[proposal.status]?.label}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] ${impactClass}`}>
                          {proposal.expected_impact} impact
                        </Badge>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {proposal.proposal_type?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{proposal.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{proposal.description}</p>
                      {proposal.outcome_improvement_pct != null && (
                        <p className="text-[10px] text-green-600 font-medium mt-1">
                          ↑ {proposal.outcome_improvement_pct}% improvement measured
                        </p>
                      )}
                    </div>
                    {proposal.status === 'pending_review' && (
                      <Button size="sm" variant="outline" className="text-xs flex-shrink-0">
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={(open) => {
        setReviewDialogOpen(open);
        if (!open) { setSelectedProposal(null); setReviewerNotes(''); }
      }}>
        <DialogContent className="sm:max-w-[550px]">
          {selectedProposal && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Review Evolution Proposal
                </DialogTitle>
                <DialogDescription>
                  Approve or reject this AI-generated improvement recommendation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                  <p className="font-medium text-foreground">{selectedProposal.title}</p>
                  <p className="text-muted-foreground">{selectedProposal.description}</p>
                  {selectedProposal.observed_pattern && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Observed Pattern</p>
                      <p className="text-xs">{selectedProposal.observed_pattern}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <Badge variant="outline" className="text-[10px]">
                      AI Confidence: {selectedProposal.ai_confidence_score || '—'}%
                    </Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {selectedProposal.governance_mode?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Your Review Notes</Label>
                  <Textarea
                    value={reviewerNotes}
                    onChange={e => setReviewerNotes(e.target.value)}
                    placeholder="Add context to your decision (recorded in audit trail)..."
                    className="text-sm min-h-[80px]"
                    disabled={reviewMutation.isPending}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleReview('rejected')}
                  disabled={reviewMutation.isPending}
                  className="border-red-300 text-red-700 hover:bg-red-50 gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleReview('approved')}
                  disabled={reviewMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}