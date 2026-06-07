import React from 'react';
import { Shield, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const STATUS_CONFIG = {
  healthy: {
    label: 'Shield Active',
    sublabel: 'All systems governed',
    icon: ShieldCheck,
    iconColor: 'text-[#2563EB]',
    bgColor: 'bg-blue-50 border-blue-100',
    dotColor: 'bg-[#2563EB]',
    pulse: false
  },
  guardian: {
    label: 'Guardian Mode',
    sublabel: 'Enterprise protection active',
    icon: Shield,
    iconColor: 'text-[#D4AF37]',
    bgColor: 'bg-yellow-50 border-yellow-100',
    dotColor: 'bg-[#D4AF37]',
    pulse: true
  },
  warning: {
    label: 'Compliance Alert',
    sublabel: 'Review required',
    icon: ShieldAlert,
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-100',
    dotColor: 'bg-amber-500',
    pulse: true
  },
  critical: {
    label: 'Integrity Failure',
    sublabel: 'Immediate action required',
    icon: ShieldX,
    iconColor: 'text-red-600',
    bgColor: 'bg-red-50 border-red-100',
    dotColor: 'bg-red-500',
    pulse: true
  }
};

export default function ShieldStatusWidget({ status = 'healthy', complianceScore, violationsCount = 0, linkTo, compact = false }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.healthy;
  const Icon = config.icon;

  if (compact) {
    return (
      <Link to={linkTo || '/platform/shield'} className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border transition-all hover:shadow-sm', config.bgColor)}>
        <div className="relative">
          <Icon className={cn('w-4 h-4', config.iconColor)} />
          {config.pulse && (
            <span className={cn('absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full', config.dotColor, 'animate-pulse')} />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className={cn('text-xs font-semibold truncate', config.iconColor)}>{config.label}</span>
          {complianceScore !== undefined && (
            <span className="text-[10px] text-muted-foreground tabular-nums">{complianceScore}% integrity</span>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link to={linkTo || '/platform/shield'} className={cn('flex items-start gap-3 p-4 rounded-xl border transition-all hover:shadow-md card-elevated', config.bgColor)}>
      <div className="relative flex-shrink-0 mt-0.5">
        <Icon className={cn('w-6 h-6', config.iconColor)} />
        {config.pulse && (
          <span className={cn('absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white', config.dotColor, 'animate-pulse')} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={cn('text-sm font-semibold', config.iconColor)}>{config.label}</p>
          {violationsCount > 0 && (
            <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold tabular-nums">
              {violationsCount}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{config.sublabel}</p>
        {complianceScore !== undefined && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Integrity Score</span>
              <span className={cn('text-xs font-bold tabular-nums', config.iconColor)}>{complianceScore}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-700', complianceScore >= 90 ? 'bg-[#2563EB]' : complianceScore >= 70 ? 'bg-amber-500' : 'bg-red-500')}
                style={{ width: `${complianceScore}%` }}
              />
            </div>
          </div>
        )}
        <p className={cn('text-[10px] mt-2 font-medium', config.iconColor)}>
          Orbitan Shield™ · Powered by Regulate →
        </p>
      </div>
    </Link>
  );
}