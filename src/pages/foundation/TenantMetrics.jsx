import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Building2, DollarSign, Activity, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import BackBar from '@/components/shared/BackBar';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { SUBSCRIPTION_PLANS } from '@/lib/orbitan-config';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

export default function TenantMetrics() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTenants = async () => {
      try {
        const list = await base44.entities.Tenant.list('-created_date', 100);
        setTenants(list || []);
      } catch {
        setTenants([]);
      } finally {
        setLoading(false);
      }
    };
    loadTenants();
  }, []);

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.status === 'active').length;
  const trialTenants = tenants.filter(t => t.status === 'trial').length;
  const onboardingTenants = tenants.filter(t => t.status === 'onboarding').length;

  const planDistribution = Object.keys(SUBSCRIPTION_PLANS).map(key => {
    const plan = SUBSCRIPTION_PLANS[key];
    const count = tenants.filter(t => t.subscription_plan === key).length;
    return { key, name: plan.name, count, color: plan.color_hex };
  }).filter(p => p.count > 0);

  const monthlyRevenue = tenants.reduce((sum, t) => {
    const plan = SUBSCRIPTION_PLANS[t.subscription_plan];
    return sum + (plan?.price_sgd || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <BackBar to="/leader-org" label="Back to Platform Console" />
      <PageHeader
        title="Tenant Metrics"
        subtitle="Platform-wide analytics: tenant growth, usage, subscriptions, and revenue."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Tenants', value: totalTenants, icon: Building2, trend: '+12%', up: true, color: 'text-blue-500' },
          { label: 'Active Tenants', value: activeTenants, icon: Activity, trend: '+8%', up: true, color: 'text-emerald-500' },
          { label: 'Onboarding', value: onboardingTenants, icon: Users, trend: '0', up: null, color: 'text-amber-500' },
          { label: 'Monthly Revenue', value: `S$${monthlyRevenue.toLocaleString()}`, icon: DollarSign, trend: '+15%', up: true, color: 'text-purple-500' },
        ].map((stat, i) => (
          <motion.div key={stat.label} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.05 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  {stat.up !== null && (
                    <span className={`flex items-center gap-0.5 text-[10px] font-medium ${stat.up ? 'text-emerald-500' : 'text-red-500'}`}>
                      {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {stat.trend}
                    </span>
                  )}
                </div>
                <p className="text-2xl font-display font-bold text-foreground">{loading ? '—' : stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <motion.div {...fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subscription Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
              ) : planDistribution.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No tenants yet.</p>
              ) : (
                <div className="space-y-3">
                  {planDistribution.map((plan) => {
                    const pct = totalTenants > 0 ? (plan.count / totalTenants) * 100 : 0;
                    return (
                      <div key={plan.key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{plan.name}</span>
                          <span className="text-xs text-muted-foreground">{plan.count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: plan.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Tenant Status */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tenant Lifecycle</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Active', value: activeTenants, color: 'bg-emerald-50 text-emerald-600' },
                    { label: 'Trial', value: trialTenants, color: 'bg-blue-50 text-blue-600' },
                    { label: 'Onboarding', value: onboardingTenants, color: 'bg-amber-50 text-amber-600' },
                    { label: 'Suspended', value: tenants.filter(t => t.status === 'suspended').length, color: 'bg-red-50 text-red-600' },
                  ].map(item => (
                    <div key={item.label} className={`p-4 rounded-xl ${item.color}`}>
                      <p className="text-2xl font-display font-bold">{item.value}</p>
                      <p className="text-xs">{item.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Industry Breakdown */}
      <motion.div {...fadeUp} className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Industry Adoption</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {['food_beverage', 'recycling_sustainability', 'retail', 'other'].map(industry => {
                  const count = tenants.filter(t => t.industry === industry).length;
                  return (
                    <div key={industry} className="p-4 rounded-xl border border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium capitalize">{industry.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-xl font-display font-bold text-foreground">{count}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}