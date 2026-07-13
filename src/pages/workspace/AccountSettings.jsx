import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, Shield, Building2, Wallet, ScrollText, Plug, Lock } from 'lucide-react';
import { LOGO_ASSETS } from '@/lib/orbitan-identity';

export default function AccountSettings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const displayName = user?.full_name || 'User';
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
        {/* Profile Card */}
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Profile</h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold flex-shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-display font-bold truncate">{displayName}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" /> {displayEmail}
              </p>
              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Shield className="w-3 h-3" /> {user?.role || 'user'}
              </span>
            </div>
          </div>
        </section>

        {/* Organization */}
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Organization</h2>
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

        {/* Platform Console (admin only) */}
        {isAdmin && (
          <section className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Platform Console</h2>
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

        {/* Security */}
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Security</h2>
          <div className="flex items-center gap-3 p-3 -mx-3 rounded-lg">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Password & MFA</p>
              <p className="text-xs text-muted-foreground">Coming soon — multi-factor authentication and session management</p>
            </div>
          </div>
        </section>

        {/* Early Access Note */}
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