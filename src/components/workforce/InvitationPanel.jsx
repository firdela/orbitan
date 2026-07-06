import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { auditFrontend, ACTION_TYPES } from '@/lib/audit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { UserPlus, Plus, CheckCircle2, Copy, Loader2, X } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'worker', label: 'Team Member' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'outlet_manager', label: 'Outlet Manager' },
];

const ROLE_LABELS = {
  worker: 'Team Member',
  supervisor: 'Supervisor',
  outlet_manager: 'Outlet Manager',
};

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ORB-${code}`;
}

export default function InvitationPanel({ tenantId }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [lastIssued, setLastIssued] = useState(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'worker' });

  const queryKey = ['invitations', tenantId];

  const { data: invitations = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => base44.entities.Invitation.filter({ tenant_id: tenantId }),
    enabled: !!tenantId,
  });

  const activeInvites = invitations.filter(i => i.status === 'active');
  const redeemedInvites = invitations.filter(i => i.status === 'redeemed');

  const issueMutation = useMutation({
    mutationFn: async (data) => {
      const code = generateInviteCode();
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);

      const invitation = await base44.entities.Invitation.create({
        tenant_id: tenantId,
        invite_code: code,
        invited_role: data.role,
        invited_email: data.email || null,
        status: 'active',
        issued_by_id: user.id,
        issued_by_name: user.full_name,
        issued_by_role: user.role,
        issued_date: new Date().toISOString(),
        expiry_date: expiry.toISOString(),
        max_uses: 1,
        use_count: 0,
      });

      await auditFrontend({
        tenant_id: tenantId,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: ACTION_TYPES.USER_INVITED,
        module: 'workforce',
        target_entity: 'Invitation',
        target_record_id: invitation.id,
        details: `Issued invitation code ${code} for ${data.email || 'open invite'} as ${data.role}.`,
      });

      return { code, email: data.email, joinUrl: `${window.location.origin}/join?code=${code}` };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      setShowInvite(false);
      setLastIssued(data);
      setForm({ email: '', role: 'worker' });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (inv) => {
      await base44.entities.Invitation.update(inv.id, {
        status: 'revoked',
        revoked_by_id: user.id,
        revoked_date: new Date().toISOString(),
      });

      await auditFrontend({
        tenant_id: tenantId,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: 'invitation_revoked',
        module: 'workforce',
        target_entity: 'Invitation',
        target_record_id: inv.id,
        details: `Revoked invitation code ${inv.invite_code}.`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Last issued success banner */}
      {lastIssued && (
        <div className="bg-orbitan-green-light border border-green-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-orbitan-green flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Invitation issued successfully</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Share this link with {lastIssued.email || 'your new team member'}:
            </p>
            <div className="flex items-center gap-2 mt-2">
              <code className="text-xs bg-card border border-border rounded px-2 py-1 flex-1 truncate">
                {lastIssued.joinUrl}
              </code>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleCopy(lastIssued.joinUrl)}>
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-orbitan-green" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
          <button onClick={() => setLastIssued(null)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active invitations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-heading font-semibold text-foreground">Active Invitations ({activeInvites.length})</h3>
          <Button size="sm" className="gap-1.5" onClick={() => setShowInvite(true)}>
            <Plus className="w-4 h-4" /> Invite Member
          </Button>
        </div>

        {activeInvites.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="No active invitations"
            description="Invite a team member by generating an invitation code. They'll use it to join your organisation."
            color="blue"
            actionLabel="Invite Member"
            onAction={() => setShowInvite(true)}
          />
        ) : (
          <div className="space-y-2">
            {activeInvites.map((inv) => {
              const isExpired = inv.expiry_date && new Date(inv.expiry_date) < new Date();
              return (
                <div key={inv.id} className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orbitan-blue-light flex items-center justify-center flex-shrink-0">
                    <UserPlus className="w-4 h-4 text-orbitan-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm font-mono font-semibold text-foreground">{inv.invite_code}</code>
                      {isExpired ? (
                        <StatusBadge status="cancelled" label="Expired" size="sm" />
                      ) : (
                        <StatusBadge status="active" size="sm" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {inv.invited_email || 'Open invite'} · {ROLE_LABELS[inv.invited_role]} ·
                      Expires {inv.expiry_date ? new Date(inv.expiry_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={revokeMutation.isPending}
                    onClick={() => revokeMutation.mutate(inv)}
                  >
                    Revoke
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Redeemed invitations */}
      {redeemedInvites.length > 0 && (
        <div>
          <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Redeemed ({redeemedInvites.length})</h3>
          <div className="space-y-2">
            {redeemedInvites.map((inv) => (
              <div key={inv.id} className="bg-muted/40 border border-border rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orbitan-green-light flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-orbitan-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{inv.redeemed_by_email || inv.invited_email}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[inv.invited_role]} · Redeemed {inv.redeemed_date ? new Date(inv.redeemed_date).toLocaleDateString() : ''}
                  </p>
                </div>
                <StatusBadge status="completed" label="Redeemed" size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={(open) => { setShowInvite(open); if (!open) setForm({ email: '', role: 'worker' }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            An invitation code will be generated. Share the join link with your team member.
          </p>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs mb-1 block">Email (optional)</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="name@example.com"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Leave blank for an open invite code.</p>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {issueMutation.isError && (
            <p className="text-sm text-destructive">
              Failed to issue invitation. Please try again.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button
              disabled={issueMutation.isPending}
              onClick={() => issueMutation.mutate(form)}
            >
              {issueMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : null}
              {issueMutation.isPending ? 'Issuing...' : 'Generate Invitation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}