import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft, Mail, Shield, Building2, Wallet, ScrollText,
  Plug, Lock, Save, Loader2, Bell, UserCog, KeyRound, Monitor,
} from 'lucide-react';
import { LOGO_ASSETS } from '@/lib/orbitan-identity';
import { auditFrontend, ACTION_TYPES } from '@/lib/audit';

const NOTIFICATION_DEFAULTS = {
  notif_operational: true,
  notif_ai_insights: true,
  notif_audit: false,
  notif_weekly_summary: true,
};

export default function AccountSettings() {
  const { user, checkUserAuth } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [notifications, setNotifications] = useState(NOTIFICATION_DEFAULTS);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setFullName(user?.full_name || '');
    setPhone(user?.phone || user?.data?.phone || '');
    setNotifications({
      ...NOTIFICATION_DEFAULTS,
      ...(user?.data?.notifications || {}),
    });
    setIsDirty(false);
  }, [user]);

  const handleFieldChange = (setter) => (e) => {
    setter(e.target.value);
    setIsDirty(true);
  };

  const handleNotifToggle = (key) => (checked) => {
    setNotifications((prev) => ({ ...prev, [key]: checked }));
    setIsDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = {
        full_name: fullName,
        data: {
          ...(user?.data || {}),
          phone,
          notifications,
        },
      };
      await base44.auth.updateMe(updates);
      await auditFrontend({
        tenant_id: user?.tenant_id || user?.data?.tenant_id || 'platform',
        actor_id: user?.id,
        actor_name: user?.full_name,
        actor_role: user?.role,
        action_type: ACTION_TYPES.SETTINGS_UPDATED,
        module: 'system',
        target_entity: 'User',
        target_record_id: user?.id,
        details: `Updated profile: name="${fullName}", phone="${phone}", notifications=${JSON.stringify(notifications)}`,
      });
    },
    onSuccess: () => {
      checkUserAuth();
      setIsDirty(false);
      toast({
        title: 'Profile saved',
        description: 'Your changes have been applied.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error.message || 'Could not update your profile.',
      });
    },
  });

  const displayName = fullName || user?.full_name || 'User';
  const displayEmail = user?.email || '';
  const initial = displayName[0]?.toUpperCase() || '?';

  const platformLinks = [
    { to: '/platform/wallet', icon: Wallet, label: 'Orbit Wallet', desc: 'Credits, billing, and transactions' },
    { to: '/platform/audit-logs', icon: ScrollText, label: 'Audit Logs', desc: 'Your activity and system events' },
    { to: '/platform/integrations', icon: Plug, label: 'Integrations', desc: 'Connected services and connectors' },
    { to: '/platform/access-control', icon: Shield, label: 'Access Control', desc: 'Roles, permissions, and policies' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-3">
          <Link to="/workspace">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <img src={LOGO_ASSETS.mark3D} alt="Orbitan" className="w-6 h-6" />
          <h1 className="font-display font-bold text-lg">Account Settings</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* ── Profile Section ── */}
        <section className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserCog className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profile</h2>
          </div>

          {/* Avatar + Identity */}
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-16 h-16 border-2 border-border">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-display font-bold truncate">{displayName}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" /> {displayEmail}
              </p>
              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold capitalize">
                <Shield className="w-3 h-3" /> {user?.role || 'user'}
              </span>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full-name" className="text-xs">Full Name</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={handleFieldChange(setFullName)}
                className="h-10"
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={handleFieldChange(setPhone)}
                className="h-10"
                placeholder="+65 9XXX XXXX"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email Address</Label>
              <Input
                id="email"
                value={displayEmail}
                disabled
                className="h-10 bg-muted/50 text-muted-foreground"
              />
              <p className="text-[11px] text-muted-foreground">Email cannot be changed. Contact your administrator if needed.</p>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!isDirty || saveMutation.isPending}
                className="gap-1.5"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </section>

        {/* ── Notifications Section ── */}
        <section className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notifications</h2>
          </div>
          <div className="space-y-1">
            <NotificationToggle
              label="Operational Alerts"
              desc="Shift changes, task assignments, and urgent workflow events"
              checked={notifications.notif_operational}
              onCheckedChange={handleNotifToggle('notif_operational')}
            />
            <NotificationToggle
              label="Orbit Nexus AI Insights"
              desc="AI-generated recommendations, evolution proposals, and intelligence alerts"
              checked={notifications.notif_ai_insights}
              onCheckedChange={handleNotifToggle('notif_ai_insights')}
            />
            <NotificationToggle
              label="Audit & Governance"
              desc="Governance overrides, policy violations, and compliance reminders"
              checked={notifications.notif_audit}
              onCheckedChange={handleNotifToggle('notif_audit')}
            />
            <NotificationToggle
              label="Weekly Summary"
              desc="A digest of your platform activity every Monday"
              checked={notifications.notif_weekly_summary}
              onCheckedChange={handleNotifToggle('notif_weekly_summary')}
            />
          </div>
          {isDirty && (
            <p className="text-xs text-amber-600 mt-3">Unsaved changes — press "Save Changes" above to apply.</p>
          )}
        </section>

        {/* ── Organization Section ── */}
        <section className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-5">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Organization</h2>
          </div>
          <Link to="/request-access" className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-accent transition-colors">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Switch Organization</p>
              <p className="text-xs text-muted-foreground">Request access to another workspace</p>
            </div>
          </Link>
        </section>

        {/* ── Platform Console (admin only) ── */}
        {isAdmin && (
          <section className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-5">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Platform Console</h2>
            </div>
            <div className="space-y-1">
              {platformLinks.map((link) => (
                <Link key={link.to} to={link.to} className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-accent transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                    <link.icon className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{link.label}</p>
                    <p className="text-xs text-muted-foreground">{link.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Security Section ── */}
        <section className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Security</h2>
          </div>
          <div className="space-y-1">
            <SecurityRow
              icon={KeyRound}
              title="Password & MFA"
              desc="Coming soon — multi-factor authentication and password management"
              badge="Coming Soon"
            />
            <SecurityRow
              icon={Monitor}
              title="Active Sessions"
              desc="Coming soon — view and manage your logged-in devices"
              badge="Coming Soon"
            />
          </div>
        </section>

        {/* ── Early Access Note ── */}
        <section className="bg-primary/5 border border-primary/15 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse mt-1.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">OrbitanOS Early Access</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                You're using an early version of OrbitanOS. New modules and capabilities are being deployed weekly as we validate with our pilot partners. Your feedback directly shapes the roadmap.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function NotificationToggle({ label, desc, checked, onCheckedChange }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 -mx-3 rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SecurityRow({ icon: Icon, title, desc, badge }) {
  return (
    <div className="flex items-center gap-3 p-3 -mx-3 rounded-lg">
      <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {badge && (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
          {badge}
        </span>
      )}
    </div>
  );
}