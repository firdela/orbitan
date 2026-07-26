import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ContextualHelp from '@/components/shared/ContextualHelp';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend, trendValue, className, help, to, onClick, compact }) {
  const navigate = useNavigate();
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

  const isInteractive = !!(to || onClick);
  const handleClick = isInteractive ? (e) => {
    if (onClick) onClick(e);
    if (to) navigate(to);
  } : undefined;
  const handleKeyDown = isInteractive ? (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e);
    }
  } : undefined;

  return (
    <div
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={isInteractive ? `${title} — view details` : undefined}
      className={cn(
        "group bg-card border border-border rounded-xl transition-shadow duration-200",
        compact ? "p-3" : "p-5",
        isInteractive && "cursor-pointer hover:shadow-md hover:border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn(compact ? "w-8 h-8" : "w-10 h-10", "rounded-lg flex items-center justify-center", c.bg)}>
          {Icon && <Icon className={cn(compact ? "w-4 h-4" : "w-5 h-5", c.icon)} />}
        </div>
        {trendValue !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
            <TrendIcon className="w-3.5 h-3.5" />
            {trendValue}
          </div>
        )}
      </div>
      <div className="relative">
        <p className={cn(compact ? "text-xl" : "text-2xl", "font-heading font-bold text-foreground mb-0.5")}>{value ?? '—'}</p>
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium text-foreground/80">{title}</p>
          {help && <ContextualHelp {...(typeof help === 'string' ? { content: help } : help)} />}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {isInteractive && (
          <ChevronRight className="absolute -right-1 bottom-0 w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
  );
}