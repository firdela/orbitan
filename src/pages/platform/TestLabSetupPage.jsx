import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FlaskConical, ShieldCheck, Users, Building2, Mail, Clock,
  CheckCircle2, XCircle, AlertTriangle, Loader2,
  KeyRound, Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import OrbitanLoader from '@/components/brand/OrbitanLoader';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import BackBar from '@/components/shared/BackBar';
import { useToast } from '@/components/ui/use-toast';
import AutomatedVerificationSection from '@/components/platform/AutomatedVerificationSection';

const READINESS_CONFIG = {
  ALIAS_CONFIGURED: { label: 'Alias Configured', variant: 'secondary', icon: Mail },
  DELIVERY_VERIFICATION_PENDING: { label: 'Delivery Pending', variant: 'secondary', icon: Mail },
  DELIVERY_VERIFIED: { label: 'Delivery Verified', variant: 'secondary', icon: CheckCircle2 },
  MEMBERSHIP_PREPARED: { label: 'Membership Prepared', variant: 'secondary', icon: Users },
  INVITATION_PENDING: { label: 'Invitation Pending', variant: 'secondary', icon: Mail },
  INVITED: { label: 'Invited', variant: 'secondary', icon: Mail },
  REGISTERED: { label: 'Registered', variant: 'secondary', icon: Users },
  EMAIL_VERIFICATION_REQUIRED: { label: 'Email Verification Required', variant: 'destructive', icon: AlertTriangle },
  EMAIL_VERIFIED: { label: 'Email Verified', variant: 'default', icon: CheckCircle2 },
  IDENTITY_LINKED: { label: 'Identity Linked', variant: 'default', icon: CheckCircle2 },
  SESSION_VERIFICATION_REQUIRED: { label: 'Session Verification Required', variant: 'secondary', icon: ShieldCheck },
  READY: { label: 'Ready', variant: 'default', icon: CheckCircle2 },
  BLOCKED: { label: 'Blocked', variant: 'destructive', icon: XCircle },
  DISABLED: { label: 'Disabled', variant: 'destructive', icon: XCircle },
  PLATFORM_IDENTITY: { label: 'Platform Identity', variant: 'secondary', icon: Users },
};

const EMAIL_CHECKS = [
  { key: 'ordinary_test_email_received', label: 'Ordinary test email received' },
  { key: 'recipient_alias_preserved', label: 'Recipient alias preserved' },
  { key: 'invitation_email_received', label: 'Invitation email received' },
  { key: 'verification_email_received', label: 'Verification email received' },
  { key: 'password_reset_email_received', label: 'Password reset email received' },
  { key: 'catch_all_did_not_drop', label: 'Catch-all did not drop' },
  { key: 'private_destination_hidden', label: 'Private destination hidden' },
];

export default function TestLabSetupPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [resetDialog, setResetDialog] = useState(null);

  const { data: readiness, isLoading, isError, refetch } = useQuery({
    queryKey: ['test-lab-readiness'],
    queryFn: async () => {
      const response = await base44.functions.invoke('testLabSetup', { action: 'readiness_status' });
      return response.data || response;
    },
    refetchInterval: 30000,
  });

  const callTestLab = useCallback(async (action, payload, successMsg) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await base44.functions.invoke('testLabSetup', { action, ...payload });
      queryClient.invalidateQueries({ queryKey: ['test-lab-readiness'] });
      toast({ title: '✓ Success', description: successMsg });
      return response.data || response;
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Operation failed.';
      toast({ title: 'Operation Failed', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }, [submitting, queryClient, toast]);

  if (isLoading) return <OrbitanLoader size="fullscreen" message="Loading Test Lab readiness..." />;

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <BackBar to="/leader-org" label="Back to Platform" />
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load Test Lab"
          description="You may not have the platform.test_lab.manage permission, or an error occurred."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </div>
    );
  }

  const tenants = readiness?.tenants || {};
  const identities = readiness?.identities || [];
  const testCapability = readiness?.test_capability || {};
  const tenantAReady = tenants.A?.is_sandbox && tenants.A?.exists;
  const tenantBReady = tenants.B?.is_sandbox && tenants.B?.exists;

  return (
    <div className="min-h-screen bg-background">
      <BackBar to="/leader-org" label="Back to Platform" />
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <PageHeader
          icon={FlaskConical}
          title="Orbitan Test Lab Setup"
          subtitle="Internal governance test infrastructure for AI Operating Layer verification"
        />

        {/* TENANT INFRASTRUCTURE */}
        <section aria-labelledby="tenant-section">
          <h2 id="tenant-section" className="text-lg font-heading font-semibold mb-3 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Tenant Infrastructure
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Test Tenant A</span>
                  {tenantAReady ? (
                    <Badge className="gap-1"><CheckCircle2 className="w-3 h-3" /> Ready</Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Blocked</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Name:</span> {tenants.A?.name || 'Not found'}</p>
                <p><span className="text-muted-foreground">ID:</span> <code className="text-xs">{tenants.A?.id || '—'}</code></p>
                <p><span className="text-muted-foreground">Sandbox:</span> {tenants.A?.is_sandbox ? 'Yes' : 'No'}</p>
                <p><span className="text-muted-foreground">Status:</span> {tenants.A?.status || '—'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Test Tenant B</span>
                  {tenantBReady ? (
                    <Badge className="gap-1"><CheckCircle2 className="w-3 h-3" /> Ready</Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Not Provisioned</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Name:</span> {tenants.B?.name || 'Not created'}</p>
                <p><span className="text-muted-foreground">ID:</span> <code className="text-xs">{tenants.B?.id || '—'}</code></p>
                <p><span className="text-muted-foreground">Sandbox:</span> {tenants.B?.is_sandbox ? 'Yes' : '—'}</p>
                <p><span className="text-muted-foreground">Status:</span> {tenants.B?.status || '—'}</p>
                {!tenantBReady && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" className="w-full mt-3 gap-1.5" disabled={submitting}>
                        {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Building2 className="w-3 h-3" />}
                        Provision Test Tenant B
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Provision Test Tenant B?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will create "Orbitan Test Lab B" as a sandbox tenant with no production billing, integrations, or wallet debits. A mandatory audit event will be recorded.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <Textarea
                        placeholder="Reason for provisioning (minimum 5 characters)..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="h-16"
                      />
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setReason('')}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.preventDefault();
                            if (reason.length < 5) {
                              toast({ title: 'Reason required', description: 'Please provide a meaningful reason (min 5 characters).', variant: 'destructive' });
                              return;
                            }
                            callTestLab('provision_tenant_b', { reason }, 'Test Tenant B provisioned successfully.');
                            setReason('');
                          }}
                          disabled={submitting || reason.length < 5}
                        >
                          {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                          Confirm Provision
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* IDENTITY READINESS */}
        <section aria-labelledby="identity-section">
          <h2 id="identity-section" className="text-lg font-heading font-semibold mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Test Identity Readiness
          </h2>
          <div className="grid gap-3">
            {identities.map((identity) => {
              const stateConfig = READINESS_CONFIG[identity.readiness_state] || READINESS_CONFIG.ALIAS_CONFIGURED;
              const StateIcon = stateConfig.icon;
              const canPrepareMembership = identity.readiness_state === 'ALIAS_CONFIGURED' && identity.tenant !== 'platform';
              const canGrantPermission = identity.tenant === 'platform' && identity.expected_cross_tenant && !identity.cross_tenant_permission && identity.user_registered;
              const canRevokePermission = identity.tenant === 'platform' && identity.cross_tenant_permission;

              return (
                <Card key={identity.email}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StateIcon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                          <span className="font-medium text-sm">{identity.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{identity.email}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant={stateConfig.variant} className="text-xs gap-1">
                            <StateIcon className="w-3 h-3" />
                            {stateConfig.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">Tenant {identity.tenant}</Badge>
                          <Badge variant="outline" className="text-xs capitalize">{identity.employee_role}</Badge>
                          {identity.email_verified && <Badge variant="outline" className="text-xs gap-1"><CheckCircle2 className="w-3 h-3" /> Verified</Badge>}
                          {identity.membership_linked && <Badge variant="outline" className="text-xs gap-1"><CheckCircle2 className="w-3 h-3" /> Linked</Badge>}
                          {identity.cross_tenant_permission !== null && (
                            <Badge variant={identity.cross_tenant_permission ? 'default' : 'secondary'} className="text-xs gap-1">
                              <KeyRound className="w-3 h-3" />
                              Cross-tenant: {identity.cross_tenant_permission ? 'Allowed' : 'Denied'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {canPrepareMembership && (
                          <Button
                            size="sm" variant="outline" className="gap-1.5"
                            disabled={submitting}
                            onClick={() => callTestLab('prepare_membership', { email: identity.email, reason: `Prepare membership for ${identity.label}` }, `Membership prepared for ${identity.email}.`)}
                          >
                            <Users className="w-3 h-3" /> Prepare
                          </Button>
                        )}
                        {canGrantPermission && (
                          <Button
                            size="sm" variant="outline" className="gap-1.5"
                            disabled={submitting}
                            onClick={() => callTestLab('grant_permission', { email: identity.email, reason: `Grant cross-tenant AI permission to ${identity.label}` }, `Cross-tenant permission granted to ${identity.email}.`)}
                          >
                            <KeyRound className="w-3 h-3" /> Grant
                          </Button>
                        )}
                        {canRevokePermission && (
                          <Button
                            size="sm" variant="ghost" className="gap-1.5"
                            disabled={submitting}
                            onClick={() => callTestLab('revoke_permission', { email: identity.email, reason: `Revoke cross-tenant AI permission from ${identity.label}` }, `Cross-tenant permission revoked from ${identity.email}.`)}
                          >
                            <XCircle className="w-3 h-3" /> Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* EMAIL DELIVERY ATTESTATION */}
        <section aria-labelledby="email-section">
          <h2 id="email-section" className="text-lg font-heading font-semibold mb-3 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Email Delivery Attestation
          </h2>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
                Manually attest that each test alias receives email correctly. No private destination addresses are stored.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium">Alias</th>
                      {EMAIL_CHECKS.map(c => (
                        <th key={c.key} className="text-center py-2 px-1 font-medium" title={c.label}>
                          {c.label.split(' ').slice(0, 2).join(' ')}…
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {identities.map((identity) => (
                      <tr key={identity.email} className="border-b">
                        <td className="py-2 pr-4 font-mono">{identity.email}</td>
                        {EMAIL_CHECKS.map(c => (
                          <td key={c.key} className="text-center py-2 px-1">
                            <Button
                              variant="ghost" size="sm"
                              className="h-8 w-8 p-0"
                              disabled={submitting}
                              onClick={() => callTestLab('attest_delivery', { email: identity.email, check: c.key, verified: true }, `Attested: ${c.label} for ${identity.email}`)}
                              title={`Attest: ${c.label}`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground hover:text-emerald-500" />
                            </Button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* AUTOMATED VERIFICATION MATRIX */}
        <AutomatedVerificationSection readiness={readiness} />

        {/* TEST CAPABILITY READINESS */}
        <section aria-labelledby="capability-section">
          <h2 id="capability-section" className="text-lg font-heading font-semibold mb-3 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Test Capability Readiness
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(testCapability).map(([key, ready]) => (
              <Card key={key}>
                <CardContent className="p-3 flex items-center gap-2">
                  {ready ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-xs font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* TEST DATA RESET */}
        <section aria-labelledby="reset-section">
          <h2 id="reset-section" className="text-lg font-heading font-semibold mb-3 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-primary" />
            Mutable Test Data Reset
          </h2>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
                Reset mutable tagged test records (pending AIApprovals, Orbit Inbox items) for a specific test run. Immutable AIAuditEvent records are retained per retention policy.
              </p>
              <AlertDialog open={resetDialog?.open || false} onOpenChange={(open) => !open && setResetDialog(null)}>
                <Button
                  variant="outline" className="gap-1.5"
                  disabled={submitting}
                  onClick={() => setResetDialog({ open: true, testRunId: '', tenantId: '' })}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Reset Test Data
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Mutable Test Data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete pending tagged AIApproval records and tagged Orbit Inbox items for the specified test run. Immutable audit records will be retained.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2">
                    <input
                      type="text" placeholder="Test Run ID"
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                      value={resetDialog?.testRunId || ''}
                      onChange={(e) => setResetDialog({ open: true, testRunId: e.target.value, tenantId: resetDialog?.tenantId || '' })}
                    />
                    <input
                      type="text" placeholder="Tenant ID (sandbox)"
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                      value={resetDialog?.tenantId || ''}
                      onChange={(e) => setResetDialog({ open: true, testRunId: resetDialog?.testRunId || '', tenantId: e.target.value })}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault();
                        if (!resetDialog?.testRunId || !resetDialog?.tenantId) {
                          toast({ title: 'Missing fields', description: 'Test Run ID and Tenant ID are required.', variant: 'destructive' });
                          return;
                        }
                        callTestLab('reset_test_data', {
                          test_run_id: resetDialog.testRunId,
                          tenant_id: resetDialog.tenantId,
                          reason: `Reset test data for run ${resetDialog.testRunId}`,
                        }, 'Mutable test data reset successfully.');
                        setResetDialog(null);
                      }}
                      disabled={submitting || !resetDialog?.testRunId || !resetDialog?.tenantId}
                    >
                      {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                      Confirm Reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}