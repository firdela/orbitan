import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { LOGO_ASSETS } from '@/lib/orbitan-identity';
import {
  ArrowLeft, User, UserCog, Shield, Palette, Eye, Bell, Lock, Plug, Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import ProfileSection from '@/components/account-settings/sections/ProfileSection';
import AccountSection from '@/components/account-settings/sections/AccountSection';
import SecuritySection from '@/components/account-settings/sections/SecuritySection';
import PreferencesSection from '@/components/account-settings/sections/PreferencesSection';
import AccessibilitySection from '@/components/account-settings/sections/AccessibilitySection';
import PrivacySection from '@/components/account-settings/sections/PrivacySection';
import NotificationsSection from '@/components/account-settings/sections/NotificationsSection';
import ConnectedAccountsSection from '@/components/account-settings/sections/ConnectedAccountsSection';
import DeveloperSection from '@/components/account-settings/sections/DeveloperSection';

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'account', label: 'Account', icon: UserCog },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'preferences', label: 'Preferences', icon: Palette },
  { id: 'accessibility', label: 'Accessibility', icon: Eye },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Lock },
  { id: 'connected', label: 'Connected Accounts', icon: Plug },
  { id: 'developer', label: 'Developer', icon: Code, adminOnly: true },
];

export default function AccountSettings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const sections = SECTIONS.filter((s) => !s.adminOnly || isAdmin);

  const hashId = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
  const initial = sections.find((s) => s.id === hashId) || sections[0];
  const [active, setActive] = useState(initial?.id || 'profile');

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      if (sections.find((s) => s.id === id)) setActive(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (id) => {
    setActive(id);
    window.history.replaceState(null, '', `/settings#${id}`);
  };
  const activeSection = sections.find((s) => s.id === active) || sections[0];
  const ActiveIcon = activeSection.icon;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link to="/workspace">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <img src={LOGO_ASSETS.mark3D} alt="Orbitan" className="w-6 h-6" />
          <h1 className="font-display font-bold text-lg">Account Settings</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-8">
          {/* Section navigation */}
          <nav className="mb-4 lg:mb-0" aria-label="Account settings sections">
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-1 px-1">
              {sections.map((s) => {
                const Icon = s.icon;
                const isActive = s.id === active;
                return (
                  <button
                    key={s.id}
                    onClick={() => select(s.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring flex-shrink-0',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" /> {s.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Active section */}
          <main className="min-w-0">
            <div className="bg-card rounded-xl border border-border p-5 sm:p-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-5">
                <ActiveIcon className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">{activeSection.label}</h2>
              </div>
              {active === 'profile' && <ProfileSection />}
              {active === 'account' && <AccountSection />}
              {active === 'security' && <SecuritySection />}
              {active === 'preferences' && <PreferencesSection />}
              {active === 'accessibility' && <AccessibilitySection />}
              {active === 'notifications' && <NotificationsSection />}
              {active === 'privacy' && <PrivacySection />}
              {active === 'connected' && <ConnectedAccountsSection />}
              {active === 'developer' && <DeveloperSection />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}