import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Mail, Shield, CalendarDays, LogOut, KeyRound, Building2 } from 'lucide-react';
import OrgRoleCard from '@/components/profile/OrgRoleCard';

export default function AccountSection() {
  const { user, logout } = useAuth();
  const memberSince = user?.created_date
    ? new Date(user.created_date).toLocaleDateString('en-SG', { year: 'numeric', month: 'long' })
    : '—';

  return (
    <div className="space-y-6">
      <OrgRoleCard />

      <div className="rounded-lg border border-border divide-y divide-border">
        <Row icon={Mail} label="Email" value={user?.email || '—'} />
        <Row icon={Shield} label="Role" value={(user?.role || 'user').replace(/_/g, ' ')} className="capitalize" />
        <Row icon={CalendarDays} label="Member Since" value={memberSince} />
        <Row icon={Building2} label="Account Status" value="Active" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/forgot-password">
          <Button variant="outline" className="gap-1.5">
            <KeyRound className="w-4 h-4" /> Reset Password
          </Button>
        </Link>
        <Button
          variant="outline"
          className="gap-1.5 text-destructive hover:text-destructive"
          onClick={() => logout('/login')}
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Password reset sends a secure link to your email. Multi-factor authentication is coming soon.
      </p>
    </div>
  );
}

function Row({ icon: Icon, label, value, className }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <span className="text-sm text-muted-foreground flex-1">{label}</span>
      <span className={`text-sm font-medium ${className || ''}`}>{value}</span>
    </div>
  );
}