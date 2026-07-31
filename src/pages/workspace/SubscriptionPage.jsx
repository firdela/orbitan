import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/lib/workspace';
import BackBar from '@/components/shared/BackBar';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import {
  CheckCircle2, Loader2, CreditCard, Calendar, Zap, X, ArrowUpRight,
  Package, Building2,
} from 'lucide-react';
import { classifyIntegrationError } from '@/lib/integration-errors';

const PLAN_CONFIG = {
  orbitan_free: { label: 'Free', price: 0, interval: 'forever', color: 'bg-slate-100 text-slate-700', features: ['Up to 10 employees', '1 outlet', 'Core modules', 'Community support'] },
  orbitan_starter: { label: 'Starter', price: 49, interval: 'month', color: 'bg-orbitan-blue-light text-orbitan-blue-700', features: ['Up to 25 employees', '3 outlets', 'Core + Inventory + Sales', 'Email support'] },
  orbitan_growth: { label: 'Growth', price: 149, interval: 'month', color: 'bg-orbitan-green-light text-orbitan-green-700', features: ['Up to 50 employees', '10 outlets', 'All modules + Reporting', 'Priority support'] },
  orbitan_business: { label: 'Business', price: 399, interval: 'month', color: 'bg-orbitan-purple-light text-orbitan-purple-700', features: ['Up to 200 employees', 'Unlimited outlets', 'Nexus Intelligence', 'Dedicated CSM'] },
  orbitan_enterprise: { label: 'Enterprise', price: 1999, interval: 'month', color: 'bg-slate-800 text-white', features: ['Unlimited employees', 'Unlimited outlets', 'Custom governance domain', 'SLA + dedicated support'] },
};

const PLAN_ORDER = ['orbitan_free', 'orbitan_starter', 'orbitan_growth', 'orbitan_business', 'orbitan_enterprise'];

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { tenant, refreshTenant } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [tenantData, setTenantData] = useState(null);

  const isAdmin = user?.role === 'admin';
  const isTenantAdmin = user?.role === 'tenant_admin';
  const canManage = isAdmin || isTenantAdmin;
  const tenantId = tenant?.id || user?.data?.tenant_id;

  useEffect(() => {
    const load = async () => {
      if (!tenantId) { setLoading(false); return; }
      try {
        const data = await base44.entities.Tenant.get(tenantId);
        setTenantData(data);
      } catch (err) {
        const classified = classifyIntegrationError(err, 'Subscription');
        setError(classified.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tenantId]);

  const handleCheckout = async (planKey) => {
    setCheckoutLoading(true);
    try {
      const priceMap = {
        orbitan_free: 'free',
        orbitan_starter: 'price_starter',
        orbitan_growth: 'price_growth',
        orbitan_business: 'price_business',
        orbitan_enterprise: 'price_enterprise',
      };
      // Use the stripeCheckout backend function
      const res = await base44.functions.invoke('stripeCheckout', {
        plan: planKey,
        tenant_id: tenantId,
        success_url: `${window.location.origin}/checkout/success`,
        cancel_url: `${window.location.origin}/checkout/cancelled`,
      });
      const url = res?.url || res?.data?.url;
      if (url) {
        // Check if running in iframe
        if (window.self !== window.top) {
          alert('Checkout works only from the published app. Please open in a new tab.');
        } else {
          window.location.href = url;
        }
      } else {
        // Fallback to direct checkout page
        window.location.href = `/checkout?plan=${planKey}`;
      }
    } catch (err) {
      const classified = classifyIntegrationError(err, 'Checkout');
      setError(classified.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) return <LoadingState message="Loading subscription…" />;
  if (error) return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <BackBar to="/workspace" label="Back to Workspace" />
      <Card><CardContent className="p-6 text-center text-sm text-destructive">{error}</CardContent></Card>
    </div>
  );

  const currentPlan = tenantData?.subscription_plan || 'orbitan_free';
  const planConfig = PLAN_CONFIG[currentPlan] || PLAN_CONFIG.orbitan_free;
  const currentPlanIdx = PLAN_ORDER.indexOf(currentPlan);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <BackBar to="/workspace" label="Back to Workspace" breadcrumb={[{ label: 'Subscription' }]} />

      <PageHeader
        title="Subscription & Billing"
        subtitle={canManage ? 'Manage your plan, billing, and usage' : 'View your current plan and usage'}
      />

      {/* Current Plan */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${planConfig.color}`}>
                  <Zap className="w-3 h-3" /> {planConfig.label}
                </span>
                <Badge variant="outline" className="text-[10px]">{tenantData?.status || 'active'}</Badge>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">
                ${planConfig.price}<span className="text-sm font-normal text-muted-foreground">/{planConfig.interval}</span>
              </p>
              {tenantData?.trial_ends_date && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Trial ends {new Date(tenantData.trial_ends_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Max Employees</p>
              <p className="text-lg font-semibold">{tenantData?.max_employees || '—'}</p>
              <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wide">Currency</p>
              <p className="text-sm font-medium">{tenantData?.currency || 'SGD'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <div>
        <h3 className="text-sm font-heading font-semibold mb-3">Available Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {PLAN_ORDER.map(planKey => {
            const cfg = PLAN_CONFIG[planKey];
            const isCurrent = planKey === currentPlan;
            const isUpgrade = PLAN_ORDER.indexOf(planKey) > currentPlanIdx;
            const isDowngrade = PLAN_ORDER.indexOf(planKey) < currentPlanIdx;
            return (
              <Card key={planKey} className={`relative ${isCurrent ? 'border-primary ring-1 ring-primary/20' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                    {isCurrent && <Badge className="text-[10px] h-5"><CheckCircle2 className="w-3 h-3 mr-0.5" /> Current</Badge>}
                  </div>
                  <p className="text-xl font-display font-bold">${cfg.price}<span className="text-xs font-normal text-muted-foreground">/{cfg.interval}</span></p>
                  <ul className="mt-3 space-y-1.5">
                    {cfg.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-orbitan-green shrink-0 mt-0.5" /> {f}
                      </li>
                    ))}
                  </ul>
                  {canManage && !isCurrent && (
                    <Button
                      size="sm"
                      variant={isUpgrade ? 'default' : 'outline'}
                      className="w-full mt-3 gap-1.5"
                      disabled={checkoutLoading}
                      onClick={() => handleCheckout(planKey)}
                    >
                      {checkoutLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : isUpgrade ? <ArrowUpRight className="w-3 h-3" /> : null}
                      {isUpgrade ? 'Upgrade' : 'Switch'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm"><CreditCard className="w-4 h-4 text-muted-foreground" /> Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          {!tenantData || currentPlan === 'orbitan_free' ? (
            <EmptyState icon={CreditCard} title="No billing history" description="You're on the Free plan. Upgrade to start billing." />
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              Billing history is managed through Stripe. Contact support for detailed invoices.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Platform Admin View */}
      {isAdmin && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="w-3.5 h-3.5" />
              <span>Platform Admin: View cross-tenant subscription summaries at </span>
              <Link to="/platform/tenant-metrics" className="text-primary hover:underline">Tenant Metrics</Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}