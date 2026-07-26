import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/lib/workspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Save, Loader2, Mail, Shield, Clock, Building2 } from 'lucide-react';
import ProfilePhotoUploader from '@/components/profile/ProfilePhotoUploader';
import { auditFrontend, ACTION_TYPES } from '@/lib/audit';

export default function ProfileSection() {
  const { user, checkUserAuth } = useAuth();
  const { tenant } = useWorkspace();
  const { toast } = useToast();
  const [preferredName, setPreferredName] = useState('');
  const [phone, setPhone] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setPreferredName(user?.data?.preferred_name || '');
    setPhone(user?.data?.phone || '');
    setIsDirty(false);
  }, [user]);

  const save = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe({
        data: { ...(user?.data || {}), preferred_name: preferredName, phone },
      });
      await auditFrontend({
        tenant_id: user?.tenant_id || user?.data?.tenant_id || 'platform',
        actor_id: user?.id,
        actor_name: user?.full_name,
        actor_role: user?.role,
        action_type: ACTION_TYPES.SETTINGS_UPDATED,
        module: 'system',
        target_entity: 'User',
        target_record_id: user?.id,
        details: `Updated profile: preferred_name="${preferredName}", phone="${phone}"`,
      });
    },
    onSuccess: () => {
      checkUserAuth();
      setIsDirty(false);
      toast({ title: 'Profile saved', description: 'Your changes have been applied.' });
    },
    onError: (e) =>
      toast({ variant: 'destructive', title: 'Save failed', description: e.message }),
  });

  const cancel = () => {
    setPreferredName(user?.data?.preferred_name || '');
    setPhone(user?.data?.phone || '');
    setIsDirty(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <ProfilePhotoUploader size="lg" />
        <div className="flex-1 min-w-0">
          <p className="text-xl font-display font-bold truncate">
            {preferredName || user?.full_name || 'User'}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" /> {user?.email}
          </p>
          <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold capitalize">
            <Shield className="w-3 h-3" /> {user?.role || 'user'}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="preferred-name" className="text-xs">Display Name</Label>
          <Input
            id="preferred-name"
            value={preferredName}
            onChange={(e) => { setPreferredName(e.target.value); setIsDirty(true); }}
            className="h-10"
            placeholder="How others see you"
          />
          <p className="text-[11px] text-muted-foreground">Shown across OrbitanOS in place of your legal name when set.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs">Phone Number</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setIsDirty(true); }}
            className="h-10"
            placeholder="+65 9XXX XXXX"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Full Legal Name</Label>
          <Input value={user?.full_name || ''} disabled className="h-10 bg-muted/50 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">Managed by your administrator. Use Display Name for a custom name.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email Address</Label>
          <Input value={user?.email || ''} disabled className="h-10 bg-muted/50 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">Email cannot be changed. Contact your administrator if needed.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Active Workspace</Label>
            <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-muted/30 text-sm">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{tenant?.name || 'No workspace'}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Timezone</Label>
            <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-muted/30 text-sm">
              <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={cancel} disabled={!isDirty || save.isPending}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!isDirty || save.isPending} className="gap-1.5">
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}