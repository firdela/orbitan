import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Megaphone, Download, Trash2, ShieldCheck, Info } from 'lucide-react';
import { auditFrontend, ACTION_TYPES } from '@/lib/audit';

export default function PrivacySection() {
  const { user, checkUserAuth } = useAuth();
  const { toast } = useToast();
  const privacy = user?.data?.privacy || {};
  const [deleting, setDeleting] = useState(false);

  const persist = useMutation({
    mutationFn: async (next) => {
      await base44.auth.updateMe({ data: { ...(user?.data || {}), privacy: next } });
    },
    onSuccess: () => checkUserAuth(),
    onError: (e) => toast({ variant: 'destructive', title: 'Could not save', description: e.message }),
  });
  const setPrivacy = (key, value) => persist.mutate({ ...privacy, [key]: value });

  const requestDeletion = async () => {
    setDeleting(true);
    try {
      await base44.auth.updateMe({
        data: { ...(user?.data || {}), privacy: { ...privacy, deletion_requested_at: new Date().toISOString() } },
      });
      await auditFrontend({
        tenant_id: user?.tenant_id || 'platform',
        actor_id: user?.id,
        actor_name: user?.full_name,
        actor_role: user?.role,
        action_type: ACTION_TYPES.SETTINGS_UPDATED,
        module: 'system',
        target_entity: 'User',
        target_record_id: user?.id,
        details: 'Account deletion requested by user',
      });
      checkUserAuth();
      toast({
        title: 'Deletion request received',
        description: 'An administrator will contact you. Tenant business data is retained.',
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Request failed', description: e.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 p-3 -mx-3 rounded-lg hover:bg-accent/50 transition-colors">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Marketing &amp; Product Communications</p>
            <p className="text-xs text-muted-foreground">Receive updates, tips, and announcements</p>
          </div>
        </div>
        <Switch checked={privacy.marketing_consent ?? false} onCheckedChange={(v) => setPrivacy('marketing_consent', v)} aria-label="Marketing communications consent" />
      </div>

      <div className="flex items-center justify-between gap-4 p-3 -mx-3 rounded-lg hover:bg-accent/50 transition-colors">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Profile Visibility</p>
            <p className="text-xs text-muted-foreground">Visible to colleagues in your workspace</p>
          </div>
        </div>
        <Switch checked={privacy.profile_visible ?? true} onCheckedChange={(v) => setPrivacy('profile_visible', v)} aria-label="Profile visibility" />
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium">Export Your Data</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Download a copy of your personal account data. Tenant-owned business records are managed by
          your organisation administrator.
        </p>
        <Link to="/data-explorer">
          <Button variant="outline" size="sm">Open Data Explorer</Button>
        </Link>
      </div>

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-destructive" />
          <p className="text-sm font-medium text-destructive">Account Deletion Request</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Submit a request to delete your OrbitanOS account. This does not destroy tenant-owned business
          records. An administrator reviews and contacts you before any action.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          disabled={deleting || !!privacy.deletion_requested_at}
          onClick={requestDeletion}
        >
          {privacy.deletion_requested_at ? 'Request Submitted' : deleting ? 'Submitting…' : 'Request Account Deletion'}
        </Button>
        {privacy.deletion_requested_at && (
          <p className="text-[11px] text-muted-foreground">
            Requested {new Date(privacy.deletion_requested_at).toLocaleDateString('en-SG')}
          </p>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
        <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Your preferences are stored on your account and used only to personalise your experience.
          OrbitanOS follows Privacy-by-Design — no sensitive data leaves the platform.
        </p>
      </div>
    </div>
  );
}