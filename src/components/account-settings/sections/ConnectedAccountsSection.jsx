import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Link2, CreditCard, ArrowUpRight } from 'lucide-react';

export default function ConnectedAccountsSection() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Connections are managed at the right level. Platform billing is not a personal connection.
      </p>

      <Link
        to="/platform/integrations"
        className="flex items-center gap-3 p-3 -mx-3 rounded-lg border border-border hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <div className="w-10 h-10 rounded-lg bg-orbitan-blue-light flex items-center justify-center flex-shrink-0">
          <Link2 className="w-5 h-5 text-orbitan-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Xero</p>
          <p className="text-xs text-muted-foreground">Tenant-level finance sync · Configuration required</p>
        </div>
        <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
      </Link>

      <div className="flex items-center gap-3 p-3 -mx-3 rounded-lg border border-dashed border-border opacity-80">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Stripe — Tenant Connect</p>
          <p className="text-xs text-muted-foreground">One connected account per tenant · Coming soon</p>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orbitan-amber-light text-orbitan-amber-700">Coming Soon</span>
      </div>

      <div className="flex items-center gap-3 p-3 -mx-3 rounded-lg border border-border bg-muted/30">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Stripe — Platform Billing</p>
          <p className="text-xs text-muted-foreground">Platform-managed · not a personal connection</p>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orbitan-green-light text-orbitan-green-700">Platform</span>
      </div>

      {!isAdmin && (
        <p className="text-[11px] text-muted-foreground">
          Connecting tenant integrations requires a Tenant Admin or Platform Admin.{' '}
          <Link to="/request-access" className="underline underline-offset-2">Request access</Link>.
        </p>
      )}
    </div>
  );
}