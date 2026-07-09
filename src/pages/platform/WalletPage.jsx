// ============================================================
// ORBIT WALLET — Platform Wallet & Credits Dashboard
// Shows: credit balance, loyalty points, reward tier,
// transaction history, and top-up controls.
// ============================================================

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppShell from '@/components/layout/AppShell';
import OrbitanLoader from '@/components/brand/OrbitanLoader';
import WalletCreditBar from '@/components/wallet/WalletCreditBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Zap, Star, Gift, TrendingUp, ArrowUpRight, ArrowDownRight,
  RefreshCw, Plus, Shield, Cpu, BarChart2, Award,
  CreditCard, Activity, ChevronRight, Wallet
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DEMO_TENANTS } from '@/lib/use-tenant.jsx';
import OrbitanLogo from '@/components/layout/OrbitanLogo';
import { Link } from 'react-router-dom';

const TIER_CONFIG = {
  orbitan_elite: { label: 'Orbitan Elite', color: '#D4AF37', bg: 'bg-yellow-50', badge: 'from-yellow-400 to-amber-500', icon: '👑' },
  platinum:      { label: 'Platinum',       color: '#94A3B8', bg: 'bg-slate-50',  badge: 'from-slate-300 to-slate-500', icon: '💎' },
  gold:          { label: 'Gold',           color: '#F59E0B', bg: 'bg-amber-50',  badge: 'from-yellow-300 to-amber-400', icon: '🥇' },
  silver:        { label: 'Silver',         color: '#64748B', bg: 'bg-gray-50',   badge: 'from-slate-300 to-slate-400', icon: '🥈' },
  bronze:        { label: 'Bronze',         color: '#EA7C3C', bg: 'bg-orange-50', badge: 'from-orange-300 to-orange-500', icon: '🥉' },
};

const TX_TYPE_CONFIG = {
  credit_topup:           { label: 'Credit Top-Up',        color: 'text-green-600',  icon: ArrowUpRight,   bg: 'bg-green-50' },
  credit_debit_ai:        { label: 'AI Usage',             color: 'text-blue-600',   icon: Cpu,            bg: 'bg-blue-50' },
  credit_debit_module:    { label: 'Module Unlock',        color: 'text-purple-600', icon: Zap,            bg: 'bg-purple-50' },
  credit_debit_marketplace:{ label: 'Marketplace',         color: 'text-orange-600', icon: Star,           bg: 'bg-orange-50' },
  points_earned_referral: { label: 'Referral Reward',      color: 'text-green-600',  icon: Gift,           bg: 'bg-green-50' },
  points_earned_training: { label: 'Training Completed',   color: 'text-blue-600',   icon: Award,          bg: 'bg-blue-50' },
  points_earned_renewal:  { label: 'Renewal Bonus',        color: 'text-purple-600', icon: RefreshCw,      bg: 'bg-purple-50' },
  points_redeemed:        { label: 'Points Redeemed',      color: 'text-red-600',    icon: ArrowDownRight, bg: 'bg-red-50' },
  cashback_earned:        { label: 'Cashback Earned',      color: 'text-green-600',  icon: CreditCard,     bg: 'bg-green-50' },
  subscription_renewal:   { label: 'Subscription Renewal', color: 'text-blue-600',   icon: RefreshCw,      bg: 'bg-blue-50' },
  system_adjustment:      { label: 'System Adjustment',    color: 'text-gray-600',   icon: Shield,         bg: 'bg-gray-50' },
};

const NAV = [
  { href: '/leader-org', icon: BarChart2, label: 'Platform Console' },
  { href: '/platform/wallet', icon: Wallet, label: 'Wallet & Credits' },
  { href: '/platform/marketplace', icon: Star, label: 'Marketplace' },
];

export default function WalletPage() {
  const [selectedTenant, setSelectedTenant] = useState(DEMO_TENANTS[0]?.id || 'tenant_taqueria');
  const [topupAmount, setTopupAmount] = useState(100);
  const qc = useQueryClient();

  const { data: walletData, isLoading } = useQuery({
    queryKey: ['wallet', selectedTenant],
    queryFn: () => base44.functions.invoke('walletEngine', { action: 'get_wallet', tenant_id: selectedTenant }),
    select: (r) => r.data,
    retry: false,
  });

  const { data: txData } = useQuery({
    queryKey: ['wallet-tx', selectedTenant],
    queryFn: () => base44.functions.invoke('walletEngine', { action: 'get_transactions', tenant_id: selectedTenant }),
    select: (r) => r.data,
    retry: false,
  });

  const topupMutation = useMutation({
    mutationFn: () => base44.functions.invoke('walletEngine', {
      action: 'topup_credits',
      tenant_id: selectedTenant,
      amount: topupAmount,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wallet', selectedTenant] }),
  });

  const provisionMutation = useMutation({
    mutationFn: (tenant) => base44.functions.invoke('walletEngine', {
      action: 'provision_wallet',
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      subscription_plan: tenant.subscription_plan,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wallet', selectedTenant] }),
  });

  const wallet = walletData?.wallet;
  const transactions = txData?.transactions || [];
  const tier = TIER_CONFIG[wallet?.reward_tier] || TIER_CONFIG.bronze;

  return (
    <AppShell
      navigation={NAV}
      title="Orbit Wallet"
      headerRight={
        <div className="flex items-center gap-2">
          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground"
          >
            {DEMO_TENANTS.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      }
    >
      <div className="p-6 max-w-6xl mx-auto">

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <OrbitanLoader size="lg" message="Loading wallet..." />
          </div>
        ) : !wallet ? (
          /* No wallet — provision CTA */
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <OrbitanLoader size="md" />
            <div className="text-center">
              <h3 className="font-heading font-bold text-lg text-foreground mb-2">No Wallet Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This tenant doesn't have an Orbit Wallet yet. Provision one to enable Credits and Rewards.
              </p>
              <Button
                onClick={() => provisionMutation.mutate(DEMO_TENANTS.find((t) => t.id === selectedTenant))}
                disabled={provisionMutation.isPending}
                className="gap-2"
              >
                <Zap className="w-4 h-4" />
                {provisionMutation.isPending ? 'Provisioning...' : 'Provision Wallet'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Hero Wallet Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

              {/* Main Credits Card */}
              <div className="lg:col-span-2 bg-gradient-to-br from-[#1D4ED8] to-[#111827] rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-4 right-4 w-32 h-32 border border-white rounded-full" />
                  <div className="absolute top-8 right-8 w-24 h-24 border border-white rounded-full" />
                  <div className="absolute -bottom-4 -left-4 w-40 h-40 border border-white rounded-full" />
                </div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <OrbitanLogo size="sm" variant="light" showOS />
                    </div>
                    <div className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold', tier.bg)}
                      style={{ color: tier.color }}>
                      <span>{tier.icon}</span>
                      <span>{tier.label}</span>
                    </div>
                  </div>
                  <p className="text-blue-200 text-xs mb-1 uppercase tracking-widest">Orbit Credits Balance</p>
                  <p className="text-5xl font-display font-bold mb-1">{wallet.balance_credits?.toLocaleString()}</p>
                  <p className="text-blue-300 text-sm">{wallet.credits_used_this_month} used this month · {wallet.credits_quota_monthly} monthly quota</p>

                  <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white/80 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, ((wallet.credits_used_this_month || 0) / (wallet.credits_quota_monthly || 1)) * 100)}%` }}
                    />
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-2">
                      <Star className="w-3.5 h-3.5 text-yellow-300" />
                      <span className="text-xs font-medium">{wallet.loyalty_points?.toLocaleString()} pts</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-2">
                      <Cpu className="w-3.5 h-3.5 text-blue-300" />
                      <span className="text-xs font-medium">{wallet.ai_calls_lifetime} AI calls</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-2">
                      <CreditCard className="w-3.5 h-3.5 text-green-300" />
                      <span className="text-xs font-medium">S${(wallet.cashback_balance_sgd || 0).toFixed(2)} cashback</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top-Up Panel */}
              <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
                <h3 className="font-heading font-semibold text-sm text-foreground">Top Up Credits</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[50, 100, 200, 500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setTopupAmount(amt)}
                      className={cn(
                        'text-xs font-semibold py-2 rounded-lg border transition-all',
                        topupAmount === amt
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary text-secondary-foreground border-border hover:bg-accent'
                      )}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
                <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground">
                  Adding <span className="font-bold text-foreground">{topupAmount}</span> credits
                </div>
                <Button
                  onClick={() => topupMutation.mutate()}
                  disabled={topupMutation.isPending}
                  className="w-full gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {topupMutation.isPending ? 'Processing...' : `Top Up ${topupAmount} Credits`}
                </Button>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Credits auto-reset on plan renewal.</p>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Lifetime Points', value: wallet.lifetime_points_earned?.toLocaleString() || '0', icon: Award, color: 'text-yellow-500', bg: 'bg-yellow-50' },
                { label: 'Marketplace Purchases', value: wallet.marketplace_purchases || 0, icon: Star, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Modules Unlocked', value: (wallet.modules_unlocked || []).length, icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'AI Calls (Month)', value: wallet.ai_calls_this_month || 0, icon: Cpu, color: 'text-green-600', bg: 'bg-green-50' },
              ].map((stat) => (
                <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', stat.bg)}>
                    <stat.icon className={cn('w-4 h-4', stat.color)} />
                  </div>
                  <p className="text-xl font-display font-bold text-foreground">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Reward Tier Progress */}
            <div className="bg-card border border-border rounded-xl p-5 mb-6">
              <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" />
                Orbit Rewards — Tier Progress
              </h3>
              <div className="flex items-center gap-3 flex-wrap">
                {['bronze', 'silver', 'gold', 'platinum', 'orbitan_elite'].map((t, i) => {
                  const tc = TIER_CONFIG[t];
                  const isActive = t === wallet.reward_tier;
                  return (
                    <div key={t} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                      isActive ? 'border-primary bg-primary/10 text-primary scale-110' : 'border-border text-muted-foreground opacity-60'
                    )}>
                      <span>{tc.icon}</span>
                      <span>{tc.label}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse ml-1" />}
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                {wallet.lifetime_points_earned?.toLocaleString() || 0} lifetime points · {wallet.loyalty_points?.toLocaleString() || 0} redeemable points
              </p>
            </div>

            {/* Transaction History */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Transaction History
                </h3>
                <Badge variant="outline" className="text-xs">{transactions.length} records</Badge>
              </div>
              {transactions.length === 0 ? (
                <div className="py-12 text-center">
                  <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">No transactions yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {transactions.map((tx) => {
                    const config = TX_TYPE_CONFIG[tx.transaction_type] || { label: tx.transaction_type, color: 'text-foreground', icon: Activity, bg: 'bg-muted' };
                    const TxIcon = config.icon;
                    const isPositive = tx.amount > 0;
                    return (
                      <div key={tx.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', config.bg)}>
                          <TxIcon className={cn('w-4 h-4', config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{config.label}</p>
                          <p className="text-[11px] text-muted-foreground">{tx.description || '—'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={cn('text-sm font-bold', isPositive ? 'text-green-600' : 'text-red-500')}>
                            {isPositive ? '+' : ''}{tx.amount} {tx.currency}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {tx.created_date ? format(new Date(tx.created_date), 'dd MMM, HH:mm') : '—'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}