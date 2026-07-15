import React from 'react';
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SovereignAssetBadge — ADR-0026 Trust Signal
 *
 * A subtle, non-obtrusive badge that signals the platform treats the
 * customer's IP with seriousness and that actions are being logged.
 * This "nudge" is often more effective at deterring theft than
 * technical restrictions alone.
 */
export default function SovereignAssetBadge({ ipLevel = 'standard', className }) {
  const config = {
    standard: {
      icon: Shield,
      label: 'Standard Asset',
      classes: 'bg-muted text-muted-foreground border-border',
    },
    proprietary: {
      icon: ShieldCheck,
      label: 'Proprietary IP · Watermarked',
      classes: 'bg-orbitan-blue-light text-orbitan-blue border-orbitan-blue/30',
    },
    confidential: {
      icon: ShieldAlert,
      label: 'Confidential IP · Controlled View',
      classes: 'bg-orbitan-red-light text-orbitan-red border-orbitan-red/30',
    },
  };

  const { icon: Icon, label, classes } = config[ipLevel] || config.standard;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        classes,
        className
      )}
      title={`This document is uniquely identified and registered to your organisation. Unauthorised distribution is tracked. (${ipLevel})`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}