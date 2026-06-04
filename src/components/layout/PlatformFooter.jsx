import React from 'react';
import { PLATFORM_IDENTITY } from '@/lib/orbitan-config';

export default function PlatformFooter({ variant = 'default' }) {
  if (variant === 'minimal') {
    return (
      <div className="text-center py-3">
        <p className="text-xs text-muted-foreground">
          {PLATFORM_IDENTITY.copyright}
        </p>
      </div>
    );
  }

  return (
    <footer className="border-t border-border bg-background px-6 py-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full orbitan-gradient" />
          <span className="text-xs font-medium text-foreground">
            {PLATFORM_IDENTITY.platform} &amp; {PLATFORM_IDENTITY.os}
          </span>
          <span className="text-xs text-muted-foreground">v{PLATFORM_IDENTITY.version}</span>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {PLATFORM_IDENTITY.copyright}
        </p>
        <p className="text-xs text-muted-foreground">
          Strategic Partner: {PLATFORM_IDENTITY.strategic_partner}
        </p>
      </div>
    </footer>
  );
}