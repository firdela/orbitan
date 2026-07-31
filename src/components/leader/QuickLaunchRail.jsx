import React from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ShoppingBag, Shield, FileText, Lock } from 'lucide-react';

/**
 * QuickAccess — compact quick-access grid for the Platform Console Overview.
 * Replaces the former large gradient QuickLaunchRail card row (Build #27E).
 *
 * Compact buttons (not large cards), responsive grid:
 * 2 cols mobile → 3 cols tablet → 5 cols desktop.
 * Destinations remain reachable through their canonical domain menus.
 */
const QUICK_LINKS = [
  { to: '/platform/wallet', label: 'Orbit Wallet', icon: Wallet },
  { to: '/platform/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { to: '/platform/shield', label: 'Shield', icon: Shield },
  { to: '/audit-centre', label: 'Audit Centre', icon: FileText },
  { to: '/platform/access-control', label: 'Access Control', icon: Lock },
];

export default function QuickAccess() {
  return (
    <div>
      <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
        Quick Access
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              aria-label={link.label}
              className="group flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 hover:bg-accent hover:border-primary/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground truncate">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}