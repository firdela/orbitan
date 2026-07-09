import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import OrbitanLogo from '@/components/layout/OrbitanLogo';
import PlatformFooter from '@/components/layout/PlatformFooter';

const STATUS_CONFIG = {
  pending: { label: 'Pending Review', color: 'bg-amber-100 text-amber-800', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  denied: { label: 'Denied', color: 'bg-red-100 text-red-800', icon: XCircle },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-800', icon: Clock },
};

const SEVERITY_CONFIG = {
  low: { label: 'Low', color: 'bg-blue-100 text-blue-800' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-800' },
};

export default function ShieldCommandCenter() {
  const [selectedOverride, setSelectedOverride] = useState(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [managerNotes, setManagerNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const queryClient = useQueryClient();

  // Fetch all override requests
  const { data: overrides, isLoading } = useQuery({
    queryKey: ['governanceOverrides'],
    queryFn: async () => {
      const response = await base44.entities.GovernanceOverride.filter({ status: { $in: ['pending', 'approved', 'denied'] } }, '-requested_date', 100);
      return response;
    },
  });

  // Approve/Deny mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ overrideId, decision, notes, evidenceUrl }) => {
      const user = await base44.auth.me();
      const override = overrides.find(o => o.id === overrideId);
      
      // Update the override record
      await base44.entities.GovernanceOverride.update(overrideId, {
        status: decision,
        reviewed_by_id: user.id,
        reviewed_by_name: user.full_name,
        reviewed_by_role: user.role,
        reviewed_date: new Date().toISOString(),
        manager_notes: notes,
        evidence_document_url: evidenceUrl || null,
      });

      // Create audit log entry
      await base44.entities.AuditLog.create({
        tenant_id: override.tenant_id,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: decision === 'approved' ? 'override_approved' : 'override_denied',
        module: 'compliance',
        target_entity: 'GovernanceOverride',
        target_record_id: overrideId,
        details: `Governance override ${decision} by ${user.full_name}`,
        new_state: { status: decision, manager_notes: notes },
      });

      // If approved, allow the original action to proceed (fire-and-forget notification)
      if (decision === 'approved') {
        console.log(`[ShieldCommand] Override approved. Original action can now proceed for ${override.target_entity}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governanceOverrides'] });
      setReviewDialogOpen(false);
      setManagerNotes('');
      setSelectedOverride(null);
    },
  });

  const handleReview = (decision) => {
    if (!selectedOverride) return;
    reviewMutation.mutate({
      overrideId: selectedOverride.id,
      decision,
      notes: managerNotes,
    });
  };

  const filteredOverrides = (overrides || []).filter(override => {
    const matchesStatus = filterStatus === 'all' || override.status === filterStatus;
    const matchesSearch = !searchQuery || 
      override.requester_notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      override.policy_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      override.requested_by_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: overrides?.length || 0,
    pending: overrides?.filter(o => o.status === 'pending').length || 0,
    approved: overrides?.filter(o => o.status === 'approved').length || 0,
    denied: overrides?.filter(o => o.status === 'denied').length || 0,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <OrbitanLogo size="sm" showOS />
          <div className="flex items-center gap-2 bg-orbitan-blue-light text-orbitan-blue px-3 py-1.5 rounded-lg text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            Shield Command Center
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-orbitan-blue-light text-orbitan-blue px-3 py-1.5 rounded-full text-xs font-semibold mb-3">
            <Shield className="w-3.5 h-3.5" />
            Orbit Shield™ — Governance Override Registry
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2">
            Override Management
          </h1>
          <p className="text-muted-foreground">
            Review and approve governance override requests from your team. Every decision is audited.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Requests</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-amber-900">Pending Review</CardDescription>
              <CardTitle className="text-2xl text-amber-900">{stats.pending}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-green-900">Approved</CardDescription>
              <CardTitle className="text-2xl text-green-900">{stats.approved}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-red-900">Denied</CardDescription>
              <CardTitle className="text-2xl text-red-900">{stats.denied}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by requester, policy, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Override Requests List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading override requests...</div>
        ) : filteredOverrides.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No override requests found.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredOverrides.map((override) => {
              const StatusIcon = STATUS_CONFIG[override.status]?.icon || Clock;
              const severity = SEVERITY_CONFIG[override.severity] || SEVERITY_CONFIG.medium;
              
              return (
                <Card key={override.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedOverride(override); setReviewDialogOpen(true); }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={STATUS_CONFIG[override.status]?.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {STATUS_CONFIG[override.status]?.label}
                          </Badge>
                          <Badge variant="outline" className={severity.color}>
                            {severity.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {override.request_type?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                          <div>
                            <span className="text-muted-foreground">Policy:</span>{' '}
                            <span className="font-medium">{override.policy_name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Target:</span>{' '}
                            <span className="font-medium">{override.target_entity}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Requested by:</span>{' '}
                            <span className="font-medium">{override.requested_by_name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Date:</span>{' '}
                            <span className="font-medium">
                              {new Date(override.requested_date).toLocaleDateString('en-SG')}
                            </span>
                          </div>
                        </div>

                        {override.requester_notes && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            "{override.requester_notes}"
                          </p>
                        )}
                      </div>

                      {override.status === 'pending' && (
                        <Button size="sm" className="flex-shrink-0">
                          Review
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <PlatformFooter />

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={(open) => {
        setReviewDialogOpen(open);
        if (!open) {
          setSelectedOverride(null);
          setManagerNotes('');
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedOverride && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orbitan-blue" />
                  Review Override Request
                </DialogTitle>
                <DialogDescription>
                  Carefully review this governance override request. Your decision will be audited.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Request Details */}
                <div className="bg-muted rounded-lg p-4 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-muted-foreground">Policy Name</p>
                      <p className="font-medium">{selectedOverride.policy_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Block Reason</p>
                      <p className="font-medium">{selectedOverride.block_reason}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Requester</p>
                      <p className="font-medium">{selectedOverride.requested_by_name} ({selectedOverride.requested_by_role})</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Requested</p>
                      <p className="font-medium">{new Date(selectedOverride.requested_date).toLocaleString('en-SG')}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground mb-1">Requester's Justification</p>
                    <p className="font-medium italic">"{selectedOverride.requester_notes}"</p>
                  </div>
                </div>

                {/* Manager Decision Form */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Your Decision & Justification <span className="text-orbitan-red">*</span>
                  </label>
                  <Textarea
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    placeholder="Explain your decision. This will be recorded in the audit trail."
                    className="min-h-[100px] text-sm"
                    disabled={reviewMutation.isPending || selectedOverride.status !== 'pending'}
                  />
                  <p className="text-xs text-muted-foreground">
                    This justification is mandatory and will be linked to the AuditLog.
                  </p>
                </div>

                {selectedOverride.status !== 'pending' && (
                  <Alert className="text-xs">
                    <AlertDescription>
                      This request has already been {selectedOverride.status} by {selectedOverride.reviewed_by_name} on {new Date(selectedOverride.reviewed_date).toLocaleDateString('en-SG')}.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter className="gap-2">
                {selectedOverride.status === 'pending' ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleReview('denied')}
                      disabled={reviewMutation.isPending || !managerNotes.trim()}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Deny
                    </Button>
                    <Button
                      onClick={() => handleReview('approved')}
                      disabled={reviewMutation.isPending || !managerNotes.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                    Close
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}