import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Building2, Shield, Wallet, ChevronRight, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLAN_LABELS = {
  orbitan_free: 'Free',
  orbitan_starter: 'Starter',
  orbitan_growth: 'Growth',
  orbitan_business: 'Business',
  orbitan_enterprise: 'Enterprise',
};

const PLAN_COLORS = {
  orbitan_free: 'text-muted-foreground bg-muted',
  orbitan_starter: 'text-orbitan-blue bg-orbitan-blue-light',
  orbitan_growth: 'text-orbitan-green bg-orbitan-green-light',
  orbitan_business: 'text-orbitan-purple bg-orbitan-purple-light',
  orbitan_enterprise: 'text-foreground bg-accent',
};

// ── Org & Role Card ─────────────────────────────────────────
// Displays the user's assigned organisation, role, subscription
// plan, and Orbit Wallet credit balance in a single summary card.
// ─────────────────────────────────────────────────────────────
export default function OrgRoleCard() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id || user?.data?.tenant_id;
  const role = user?.role || 'user';

  const { data: tenant } = useQuery({
    queryKey: ['profile-tenant', tenantId],
    queryFn: () => base44.entities.Tenant.get(tenantId),
    enabled: !!tenantId,
  });

  const { data: wallet } = useQuery({
    queryKey: ['profile-wallet', tenantId],
    queryFn: () => base44.entities.OrbitanWallet.filter({ tenant_id: tenantId }),
    enabled: !!tenantId,
  });

  const walletRecord = wallet?.[0];
  const planKey = tenant?.subscription_plan || user?.data?.subscription_plan || 'orbitan_free';

  return (
    <div className="space-y-3">
      {/* Organisation & Role */}
      <Link
        to="/request-access"
        className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-accent transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{tenant?.name || 'No organisation assigned'}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            <span className="capitalize">{role.replace(/_/g, ' ')}</span>
            {tenant?.industry && <span>· {tenant.industry.replace(/_/g, ' ')}</span>}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </Link>

      {/* Subscription Plan */}
      {tenant && (
        <div className="flex items-center gap-3 p-3 -mx-3 rounded-lg">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-5 h-5 text-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Subscription</p>
            <p className="text-xs text-muted-foreground">Current plan</p>
          </div>
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', PLAN_COLORS[planKey] || PLAN_COLORS.orbitan_free)}>
            {PLAN_LABELS[planKey] || 'Free'}
          </span>
        </div>
      )}

      {/* Orbit Wallet Balance */}
      <Link
        to="/platform/wallet"
        className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-accent transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
          <Wallet className="w-5 h-5 text-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Orbit Wallet</p>
          <p className="text-xs text-muted-foreground">Credits & rewards</p>
        </div>
        {walletRecord ? (
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">{walletRecord.balance_credits || 0}</p>
            <p className="text-[10px] text-muted-foreground">credits</p>
          </div>
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </Link>
    </div>
  );
}