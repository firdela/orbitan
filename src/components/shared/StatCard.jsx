import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend, trendValue, className }) {
  const colors = {
    blue: { bg: 'bg-orbitan-blue-light', icon: 'text-orbitan-blue', border: 'border-blue-100' },
    green: { bg: 'bg-orbitan-green-light', icon: 'text-orbitan-green', border: 'border-green-100' },
    amber: { bg: 'bg-orbitan-amber-light', icon: 'text-orbitan-amber', border: 'border-amber-100' },
    red: { bg: 'bg-orbitan-red-light', icon: 'text-orbitan-red', border: 'border-red-100' },
    purple: { bg: 'bg-orbitan-purple-light', icon: 'text-orbitan-purple', border: 'border-purple-100' },
    slate: { bg: 'bg-secondary', icon: 'text-orbitan-slate', border: 'border-border' },
  };
  const c = colors[color] || colors.blue;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-orbitan-green' : trend === 'down' ? 'text-orbitan-red' : 'text-muted-foreground';

  return (
    <div className={cn(
      "bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow duration-200",
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", c.bg)}>
          {Icon && <Icon className={cn("w-5 h-5", c.icon)} />}
        </div>
        {trendValue !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
            <TrendIcon className="w-3.5 h-3.5" />
            {trendValue}
          </div>
        )}
      </div>
      <p className="text-2xl font-heading font-bold text-foreground mb-0.5">{value ?? '—'}</p>
      <p className="text-sm font-medium text-foreground/80">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}