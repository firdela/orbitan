// ============================================================
// ORBITANOS — ManifestNav
//
// Renders navigation items from the ManifestHydrator output.
// Implements the "Graceful Lockout" pattern: locked modules
// (not in the tenant's subscription tier) are shown with an
// "Upgrade" badge instead of being hidden — turning navigation
// into a growth/upsell engine.
// ============================================================

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, Crown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ManifestNav({ navigation }) {
  const location = useLocation();
  const { toast } = useToast();

  if (!navigation || navigation.length === 0) return null;

  const handleLockedClick = (label) => {
    toast({
      title: 'Module Locked',
      description: `Upgrade your subscription to access ${label}.`,
      variant: 'default',
    });
  };

  return (
    <nav className="space-y-1">
      {navigation.map((item, idx) => {
        // Section header
        if (item.type === 'section') {
          return (
            <div key={`section-${idx}`} className="px-3 pt-4 pb-1">
              <p className="text-xs font-medium uppercase tracking-wider text-sidebar-foreground/40">
                {item.label}
              </p>
            </div>
          );
        }

        // Nav item — use startsWith so sub-routes also highlight parent
        const isActive = item.route && (
          location.pathname === item.route ||
          (item.route !== `/workspace` && location.pathname.startsWith(item.route))
        );
        const Icon = resolveIcon(item.icon);

        if (item.isLocked) {
          // Graceful Lockout — visible but locked, with click feedback
          return (
            <div
              key={`nav-${idx}`}
              onClick={() => handleLockedClick(item.label)}
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/50 cursor-pointer relative hover:bg-sidebar-accent/30 transition-colors"
              title={`Upgrade to access ${item.label}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-sm">{item.label}</span>
              <span className="flex items-center gap-1 text-xs text-amber-500/80">
                <Crown className="w-3 h-3" />
                <span className="hidden sm:inline">Upgrade</span>
              </span>
            </div>
          );
        }

        // Skip items with no route (would render dead links)
        if (!item.route) return null;

        // Active nav item
        return (
          <Link
            key={`nav-${idx}`}
            to={item.route}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors relative ${
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
            }`}
          >
            {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-sidebar-primary rounded-r" />}
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ── Icon resolver ───────────────────────────────────────────
// Maps string icon names from the manifest to lucide-react components.
import {
  Home, Package, ShoppingCart, FileText, Users, Calendar,
  CheckSquare, BarChart2, Shield, Layers, Settings,
  Clock, DollarSign, TrendingUp, Building2, ClipboardList,
  Truck, AlertTriangle, Award, Zap, ChefHat, MessageSquare,
  UserCheck, Receipt, ArrowLeftRight, Store, Leaf,
} from 'lucide-react';

const ICON_MAP = {
  Home, Package, ShoppingCart, FileText, Users, Calendar,
  CheckSquare, BarChart2, Shield, Layers, Settings,
  Clock, DollarSign, TrendingUp, Building2, ClipboardList,
  Truck, AlertTriangle, Award, Zap, ChefHat, MessageSquare,
  UserCheck, Receipt, ArrowLeftRight, Store, Leaf,
};

function resolveIcon(iconName) {
  if (!iconName) return Package;
  return ICON_MAP[iconName] || Package;
}