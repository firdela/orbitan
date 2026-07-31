import React from 'react';
import { Link } from 'react-router-dom';
import { PLATFORM_IDENTITY } from '@/lib/orbitan-config';

const FOOTER_LINKS = [
  { label: 'About', to: '/about-orbitan' },
  { label: 'Support', to: '/support' },
  { label: 'Status', to: '/status' },
  { label: 'Legal', to: '/legal' },
  { label: 'Governance', to: '/governance' },
  { label: 'Knowledge Hub', to: '/knowledge-hub' },
  { label: 'Audit Centre', to: '/audit-centre' },
  { label: 'Pricing', to: '/checkout' },
];

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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full orbitan-gradient" />
          <span className="text-[11px] font-semibold text-foreground tracking-tight">
            {PLATFORM_IDENTITY.os}
          </span>
          <span className="text-[10px] text-muted-foreground/60">v{PLATFORM_IDENTITY.version}</span>
        </div>
        <nav className="flex items-center gap-4 flex-wrap justify-center">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-[10px] text-muted-foreground/60">
          {PLATFORM_IDENTITY.copyright}
        </p>
      </div>
    </footer>
  );
}