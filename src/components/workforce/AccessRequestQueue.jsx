import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { auditFrontend, ACTION_TYPES } from '@/lib/audit';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import EmptyState from '@/components/shared/EmptyState';
import { Check, X, Mail, Clock, UserCog, Loader2 } from 'lucide-react';

const ROLE_LABELS = {
  worker: 'Team Member',
  supervisor: 'Supervisor',
  outlet_manager: 'Outlet Manager',
};

export default function AccessRequestQueue({ tenantId, outletId }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [denyTarget, setDenyTarget] = useState(null);
  const [denyNotes, setDenyNotes] = useState('');

  const queryKey = ['access-requests', tenantId];

  const { data: requests = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => base44.entities.AccessRequest.filter({ tenant_id: tenantId, status: 'pending' }),
    enabled: !!tenantId,
  });

  const approveMutation = useMutation({
    mutationFn: async (req) => {
      // 1. Update the access request status
      await base44.entities.AccessRequest.update(req.id, {
        status: 'approved',
        reviewed_by_id: user.id,
        reviewed_by_name: user.full_name,
        reviewed_date: new Date().toISOString(),
      });

      // 2. Generate an invitation code
      const code = generateInviteCode();

      // 3. Create an Invitation record linked to this request
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);

      await base44.entities.Invitation.create({
        tenant_id: tenantId,
        outlet_id: req.outlet_id || null,
        invite_code: code,
        invited_role: req.role_requested || 'worker',
        invited_email: req.email,
        status: 'active',
        issued_by_id: user.id,
        issued_by_name: user.full_name,
        issued_by_role: user.role,
        issued_date: new Date().toISOString(),
        expiry_date: expiry.toISOString(),
        max_uses: 1,
        use_count: 0,
      });

      // 4. Audit log
      await auditFrontend({
        tenant_id: tenantId,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: ACTION_TYPES.USER_INVITED,
        module: 'workforce',
        target_entity: 'AccessRequest',
        target_record_id: req.id,
        details: `Approved access request for ${req.email} as ${ROLE_LABELS[req.role_requested] || req.role_requested}. Invitation code ${code} issued.`,
      });

      return { code, email: req.email };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['invitations', tenantId] });
    },
  });

  const denyMutation = useMutation({
    mutationFn: async (req) => {
      await base44.entities.AccessRequest.update(req.id, {
        status: 'denied',
        reviewed_by_id: user.id,
        reviewed_by_name: user.full_name,
        reviewed_date: new Date().toISOString(),
        manager_notes: denyNotes,
      });

      await auditFrontend({
        tenant_id: tenantId,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: 'access_request_denied',
        module: 'workforce',
        target_entity: 'AccessRequest',
        target_record_id: req.id,
        details: `Denied access request for ${req.email}. Reason: ${denyNotes}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDenyTarget(null);
      setDenyNotes('');
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={UserCog}
        title="No pending access requests"
        description="When someone requests to join your organisation, they'll appear here for your review."
        color="slate"
      />
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div
          key={req.id}
          className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-orbitan-amber-light flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-orbitan-amber" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{req.email}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="capitalize">{ROLE_LABELS[req.role_requested] || req.role_requested}</span>
                {req.outlet_name && <span>· {req.outlet_name}</span>}
              </div>
            </div>
          </div>

          {denyTarget?.id === req.id ? (
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <Textarea
                value={denyNotes}
                onChange={(e) => setDenyNotes(e.target.value)}
                placeholder="Reason for denial (required)..."
                className="text-sm min-h-[60px]"
                rows={2}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDenyTarget(null); setDenyNotes(''); }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!denyNotes.trim() || denyMutation.isPending}
                  onClick={() => denyMutation.mutate(req)}
                >
                  {denyMutation.isPending ? 'Denying...' : 'Confirm Deny'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive"
                onClick={() => setDenyTarget(req)}
              >
                <X className="w-3.5 h-3.5" /> Deny
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate(req)}
              >
                {approveMutation.isPending && approveMutation.variables?.id === req.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Approve & Invite
              </Button>
            </div>
          )}

          {/* Success feedback for approved request */}
          {approveMutation.isSuccess && approveMutation.variables?.id === req.id && (
            <div className="text-xs text-orbitan-green font-medium flex items-center gap-1.5 sm:absolute">
              <Check className="w-3 h-3" /> Invitation sent to {approveMutation.data.email}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ORB-${code}`;
}