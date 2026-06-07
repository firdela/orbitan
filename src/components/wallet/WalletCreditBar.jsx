// Orbitan Credits — compact usage bar for dashboards & sidebars
import React from 'react';
import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';

const TIER_COLORS = {
  orbitan_elite: 'from-yellow-400 to-amber-500',
  platinum:      'from-slate-300 to-slate-500',
  gold:          'from-yellow-300 to-amber-400',
  silver:        'from-slate-300 to-slate-400',
  bronze:        'from-orange-300 to-orange-500',
};

const TIER_LABELS = {
  orbitan_elite: 'Orbitan Elite',
  platinum:      'Platinum',
  gold:          'Gold',
  silver:        'Silver',
  bronze:        'Bronze',
};

export default function WalletCreditBar({ wallet, compact = false }) {
  if (!wallet) return null;

  const quota = wallet.credits_quota_monthly || 150;
  const used = wallet.credits_used_this_month || 0;
  const balance = wallet.balance_credits || 0;
  const pct = Math.min(100, Math.round((used / quota) * 100));
  const isLow = pct >= 80;
  const tierGradient = TIER_COLORS[wallet.reward_tier] || TIER_COLORS.bronze;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Zap className={cn('w-3.5 h-3.5 flex-shrink-0', isLow ? 'text-red-500' : 'text-orbitan-blue')} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-muted-foreground">Credits</span>
            <span className={cn('text-[10px] font-bold', isLow ? 'text-red-500' : 'text-foreground')}>{balance}</span>
          </div>
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', isLow ? 'bg-red-500' : 'bg-primary')}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Orbitan Credits</p>
            <p className="text-[10px] text-muted-foreground">Monthly quota</p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn('text-xl font-display font-bold', isLow ? 'text-red-500' : 'text-foreground')}>{balance}</p>
          <p className="text-[10px] text-muted-foreground">of {quota} remaining</p>
        </div>
      </div>

      <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
        <div
          className={cn('h-full rounded-full transition-all duration-700', isLow ? 'bg-red-500' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{used} used this month</span>
        {isLow && (
          <span className="text-[10px] text-red-500 font-semibold animate-pulse">Low credits — top up</span>
        )}
      </div>

      {/* Reward Tier */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Rewards Tier</span>
        <span className={cn('text-[10px] font-bold bg-gradient-to-r bg-clip-text text-transparent', tierGradient)}>
          {TIER_LABELS[wallet.reward_tier] || 'Bronze'}
        </span>
      </div>
    </div>
  );
}