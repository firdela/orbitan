import React from 'react';
import { PLATFORM_IDENTITY } from '@/lib/orbitan-config';

export default function PlatformFooter({ variant = 'default' }) {
  if (variant === 'minimal') {
    return (
      <div className="flex items-center justify-center gap-2 py-2.5 border-t border-border/40">
        <div className="w-1 h-1 rounded-full bg-primary/40" />
        <p className="text-[10px] text-muted-foreground/50 tracking-wide">
          {PLATFORM_IDENTITY.copyright}
        </p>
      </div>
    );
  }

  return (
    <footer className="border-t border-border/60 bg-background px-6 py-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full orbitan-gradient" />
          <span className="text-[11px] font-semibold text-foreground tracking-tight">
            {PLATFORM_IDENTITY.platform} &amp; {PLATFORM_IDENTITY.os}
          </span>
          <span className="text-[10px] text-muted-foreground/60">v{PLATFORM_IDENTITY.version}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 text-center">
          {PLATFORM_IDENTITY.copyright}
        </p>
        <p className="text-[10px] text-muted-foreground/60">
          Strategic Partner: {PLATFORM_IDENTITY.strategic_partner}
        </p>
      </div>
    </footer>
  );
}