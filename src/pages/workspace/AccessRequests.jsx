import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ShieldGuard } from '@/lib/ShieldGuard';
import { auditFrontend, ACTION_TYPES } from '@/lib/audit';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft, Check, X, Mail, Clock, UserCog, Loader2,
  UserCheck, UserX, Users, ShieldCheck,
} from 'lucide-react';

const ROLE_LABELS = {
  worker: 'Team Member',
  supervisor: 'Supervisor',
  outlet_manager: 'Outlet Manager',
};

const STATUS_FILTERS = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'approved', label: 'Approved', icon: UserCheck },
  { key: 'denied', label: 'Denied', icon: UserX },
];

export default function AccessRequests() {
  const { tenantId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState('pending');
  const [denyTarget, setDenyTarget] = useState(null);
  const [denyNotes, setDenyNotes] = useState('');

  const queryKey = ['access-requests-all', tenantId];

  const { data: allRequests = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => base44.entities.AccessRequest.filter({ tenant_id: tenantId }, '-created_date', 200),
    enabled: !!tenantId,
  });

  const stats = {
    pending: allRequests.filter(r => r.status === 'pending').length,
    approved: allRequests.filter(r => r.status === 'approved').length,
    denied: allRequests.filter(r => r.status === 'denied').length,
  };

  const filteredRequests = allRequests.filter(r => r.status === activeFilter);

  const approveMutation = useMutation({
    mutationFn: async (req) => {
      const shieldResult = await ShieldGuard.check(base44, {
        entity_name: 'Employee',
        action: 'create',
        data: { tenant_id: tenantId, role: req.role_requested || 'worker' },
        tenant_id: tenantId,
      });

      if (!shieldResult.allowed) {
        throw new Error(
          shieldResult.reason ||
          'Subscription employee limit reached. Upgrade your plan or request an override.'
        );
      }

      await base44.entities.AccessRequest.update(req.id, {
        status: 'approved',
        reviewed_by_id: user.id,
        reviewed_by_name: user.full_name,
        reviewed_date: new Date().toISOString(),
      });

      let code = null;
      let redeemed = false;
      if (req.invite_code) {
        const existing = await base44.entities.Invitation.filter({
          invite_code: req.invite_code,
          status: 'active',
        });
        if (existing.length > 0) {
          const inv = existing[0];
          await base44.entities.Invitation.update(inv.id, {
            status: 'redeemed',
            redeemed_by_email: req.email,
            redeemed_date: new Date().toISOString(),
            use_count: (inv.use_count || 0) + 1,
          });
          code = inv.invite_code;
          redeemed = true;
        }
      }

      if (!code) {
        code = generateInviteCode();
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
      }

      await auditFrontend({
        tenant_id: tenantId,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: ACTION_TYPES.USER_INVITED,
        module: 'workforce',
        target_entity: 'AccessRequest',
        target_record_id: req.id,
        details: `Approved access request for ${req.email} as ${ROLE_LABELS[req.role_requested] || req.role_requested}. Invitation ${code} ${redeemed ? 'redeemed' : 'issued'}.`,
      });

      return { code, email: req.email, redeemed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['invitations', tenantId] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Approval blocked',
        description: error.message,
      });
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-3">
          <Link to={`/workspace/${tenantId}/dashboard`}>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h1 className="font-display font-bold text-lg">Access Requests</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={Clock} label="Pending" value={stats.pending} color="amber" />
          <StatCard icon={UserCheck} label="Approved" value={stats.approved} color="green" />
          <StatCard icon={UserX} label="Denied" value={stats.denied} color="red" />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit">
          {STATUS_FILTERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setActiveFilter(key); setDenyTarget(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeFilter === key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeFilter === key ? 'bg-primary-foreground/20' : 'bg-accent'
              }`}>
                {stats[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <EmptyState
                icon={UserCog}
                title={`No ${activeFilter} requests`}
                description={
                  activeFilter === 'pending'
                    ? 'When someone requests to join your organisation, they will appear here for review.'
                    : `No ${activeFilter} access requests to display.`
                }
                color="slate"
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((req) => (
              <RequestRow
                key={req.id}
                req={req}
                activeFilter={activeFilter}
                denyTarget={denyTarget}
                setDenyTarget={setDenyTarget}
                denyNotes={denyNotes}
                setDenyNotes={setDenyNotes}
                approveMutation={approveMutation}
                denyMutation={denyMutation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Request Row ─────────────────────────────────────────────

function RequestRow({ req, activeFilter, denyTarget, setDenyTarget, denyNotes, setDenyNotes, approveMutation, denyMutation }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Identity */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-orbitan-amber-light flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-orbitan-amber" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{req.email}</p>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <span className="text-xs text-muted-foreground capitalize">
                  {ROLE_LABELS[req.role_requested] || req.role_requested}
                </span>
                {req.outlet_name && (
                  <>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{req.outlet_name}</span>
                  </>
                )}
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{formatDate(req.created_date || req.reviewed_date)}</span>
              </div>
              {req.manager_notes && activeFilter !== 'pending' && (
                <p className="text-xs text-muted-foreground italic mt-1">"{req.manager_notes}"</p>
              )}
              {req.reviewed_by_name && activeFilter !== 'pending' && (
                <p className="text-[10px] text-muted-foreground mt-0.5">Reviewed by {req.reviewed_by_name}</p>
              )}
            </div>
          </div>

          {/* Status badge (for non-pending) */}
          {activeFilter !== 'pending' && (
            <StatusBadge status={req.status} size="sm" />
          )}

          {/* Actions (for pending) */}
          {activeFilter === 'pending' && (
            <div className="flex items-center gap-2 flex-shrink-0">
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
                <>
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
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Stat Card ───────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    amber: 'bg-orbitan-amber-light text-orbitan-amber',
    green: 'bg-orbitan-green-light text-orbitan-green',
    red: 'bg-orbitan-red-light text-orbitan-red',
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-display font-bold text-foreground leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Invite Code Generator ───────────────────────────────────

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ORB-${code}`;
}