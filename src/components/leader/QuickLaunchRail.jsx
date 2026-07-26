import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Wallet, ShoppingBag, Shield, FileText, Lock, ChevronRight } from 'lucide-react';

/**
 * QuickLaunchRail — compact quick-launch cards for platform tools.
 * Reduced height (~20% vs original), tighter padding, preserves branded identities.
 * Responsive: 2 cols mobile → 3 cols tablet → 5 cols desktop.
 */
const QUICK_LINKS = [
  { to: '/platform/wallet', label: 'Orbit Wallet', sub: 'Credits · Rewards', icon: Wallet, gradient: 'from-[#1D4ED8] to-[#111827]', iconColor: 'text-white' },
  { to: '/platform/marketplace', label: 'Orbit Marketplace', sub: 'Modules · Packs', icon: ShoppingBag, gradient: 'from-[#6D28D9] to-[#111827]', iconColor: 'text-white' },
  { to: '/platform/shield', label: 'Orbit Shield™', sub: 'Regulate · Govern', icon: Shield, gradient: 'from-[#111827] to-[#1F2937]', iconColor: 'text-[#D4AF37]', border: 'border border-[#D4AF37]/20' },
  { to: '/platform/audit-logs', label: 'Audit Logs', sub: 'Compliance · Trace', icon: FileText, gradient: 'from-[#0F766E] to-[#111827]', iconColor: 'text-white' },
  { to: '/platform/access-control', label: 'Access Control', sub: 'Role permissions', icon: Lock, gradient: 'from-[#1E3A8A] to-[#111827]', iconColor: 'text-white' },
];

export default function QuickLaunchRail() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5">
      {QUICK_LINKS.map((link) => {
        const Icon = link.icon;
        return (
          <Link
            key={link.to}
            to={link.to}
            aria-label={`${link.label} — ${link.sub}`}
            className={cn(
              'group rounded-lg p-3 flex items-center gap-2.5 hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              `bg-gradient-to-br ${link.gradient}`,
              link.border
            )}
          >
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon className={cn('w-4 h-4', link.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{link.label}</p>
              <p className="text-[10px] text-white/60 truncate">{link.sub}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white/70 transition-colors flex-shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}