import React from 'react';
import { Shield, KeyRound, Monitor, Smartphone, Clock, Info } from 'lucide-react';
import RecentActivityFeed from '@/components/profile/RecentActivityFeed';

export default function SecuritySection() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        OrbitanOS manages authentication securely via your sign-in provider. The controls below
        become available as the platform expands.
      </p>

      <div className="space-y-2">
        <PlannedRow
          icon={KeyRound}
          title="Password & Multi-Factor Authentication"
          desc="Self-service password change and MFA setup are coming soon. Use Reset Password (Account) to request a secure reset link today."
        />
        <PlannedRow
          icon={Monitor}
          title="Active Sessions"
          desc="View and revoke your logged-in devices — coming soon."
        />
        <PlannedRow
          icon={Smartphone}
          title="Trusted Devices"
          desc="Device trust management — coming soon."
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5" /> Recent Security Activity
        </div>
        <RecentActivityFeed limit={6} />
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
        <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          No sensitive session tokens are exposed in the UI. To sign out everywhere, use Sign Out —
          your session is cleared across this browser.
        </p>
      </div>
    </div>
  );
}

function PlannedRow({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border">
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orbitan-amber-light text-orbitan-amber-700">
        Coming Soon
      </span>
    </div>
  );
}