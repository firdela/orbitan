import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { getNavItemByKey } from '@/lib/navigation-registry';
import {
  Building2, HeartHandshake, Shield, Plug, ShoppingBag, Settings,
  ChevronDown, ChevronRight,
} from 'lucide-react';

/**
 * UnifiedCommandNav — consolidates ~20 flat nav items into 6 high-level categories.
 *
 * Preserves every existing route (24 items) and navigation-registry authority:
 * item metadata (label, route, description) is fetched from the registry via
 * getNavItemByKey(). Only the grouping is defined here (presentation concern).
 *
 * Interaction:
 *   - 'tab' items call onTabChange(key) → stays in LeaderOrg Tabs
 *   - 'route' items navigate via react-router Link/navigate
 *
 * Accessibility:
 *   - Radix DropdownMenu provides aria-expanded, aria-controls, keyboard nav
 *   - Active category highlighted when it contains the current tab
 */
const NAV_CATEGORIES = [
  {
    id: 'tenants',
    label: 'Tenants',
    icon: Building2,
    primary: { key: 'tenants', type: 'tab', label: 'Tenant Command Center' },
    items: [
      { key: 'subscriptions', type: 'tab' },
      { key: 'modules', type: 'tab' },
      { key: 'pilot-control', type: 'tab' },
      { key: 'pilot-admin', type: 'route' },
      { key: 'pilot-activation', type: 'route' },
      { key: 'pilot-deployment', type: 'route' },
    ],
  },
  {
    id: 'customer-success',
    label: 'Customer Success',
    icon: HeartHandshake,
    items: [
      { key: 'customer-success', type: 'route' },
      { key: 'feedback-intelligence', type: 'tab' },
      { key: 'operational-health', type: 'route' },
      { key: 'support-diagnostics', type: 'route' },
    ],
  },
  {
    id: 'governance',
    label: 'Governance',
    icon: Shield,
    items: [
      { key: 'shield-command', type: 'tab' },
      { key: 'audit-logs', type: 'route' },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Plug,
    items: [
      { key: 'integration-hub', type: 'tab' },
      { key: 'wallet', type: 'route' },
    ],
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: ShoppingBag,
    primary: { key: 'marketplace', type: 'route' },
    items: [],
  },
  {
    id: 'platform',
    label: 'Platform',
    icon: Settings,
    items: [
      { key: 'platform-identity', type: 'tab' },
      { key: 'system-controls', type: 'tab' },
      { key: 'blueprint', type: 'tab' },
      { key: 'capabilities', type: 'route' },
      { key: 'access-control', type: 'route' },
      { key: 'pilot-readiness', type: 'route' },
      { key: 'go-live-readiness', type: 'route' },
      { key: 'exception-centre', type: 'route' },
      { key: 'system-logs', type: 'route' },
      { key: 'deployment-pipeline', type: 'route' },
      { key: 'tenant-metrics', type: 'route' },
      { key: 'security-dashboard', type: 'route' },
      { key: 'feature-flags', type: 'route' },
      { key: 'change-log', type: 'route' },
    ],
  },
];

const TRIGGER_BASE = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring';
const TRIGGER_ACTIVE = 'bg-primary text-primary-foreground';
const TRIGGER_IDLE = 'bg-card border border-border text-foreground hover:bg-muted';

export default function UnifiedCommandNav({ activeTab, onTabChange }) {
  const navigate = useNavigate();

  const handleItem = (entry) => {
    const item = getNavItemByKey(entry.key);
    if (!item) return;
    if (entry.type === 'tab') {
      onTabChange(entry.key);
    } else {
      navigate(item.route);
    }
  };

  const isActiveCategory = (cat) => {
    if (cat.primary?.type === 'tab' && activeTab === cat.primary.key) return true;
    return cat.items.some((i) => i.type === 'tab' && i.key === activeTab);
  };

  return (
    <nav className="flex items-center gap-1.5 flex-wrap mb-5" aria-label="Platform command navigation">
      {NAV_CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const active = isActiveCategory(cat);

        // Categories with no dropdown items → direct link
        if (cat.items.length === 0 && cat.primary) {
          const item = getNavItemByKey(cat.primary.key);
          if (!item) return null;
          return (
            <Link
              key={cat.id}
              to={item.route}
              aria-label={cat.label}
              className={cn(TRIGGER_BASE, active ? TRIGGER_ACTIVE : TRIGGER_IDLE)}
            >
              <Icon className="w-4 h-4" /> {cat.label}
            </Link>
          );
        }

        // Categories with dropdown items
        return (
          <DropdownMenu key={cat.id}>
            <DropdownMenuTrigger
              className={cn(TRIGGER_BASE, active ? TRIGGER_ACTIVE : TRIGGER_IDLE)}
              aria-label={`${cat.label} menu`}
            >
              <Icon className="w-4 h-4" /> {cat.label}
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {cat.primary && (
                <>
                  <DropdownMenuItem
                    onClick={() => handleItem(cat.primary)}
                    className="gap-2 font-medium text-primary focus:text-primary"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                    {cat.primary.label || getNavItemByKey(cat.primary.key)?.label}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {cat.items
                .filter((i) => !cat.primary || i.key !== cat.primary.key)
                .map((entry) => {
                  const item = getNavItemByKey(entry.key);
                  if (!item) return null;
                  return (
                    <DropdownMenuItem
                      key={entry.key}
                      onClick={() => handleItem(entry)}
                      className="gap-2 justify-between"
                    >
                      <span>{entry.label || item.label}</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                        {entry.type === 'tab' ? 'Tab' : 'Page'}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </nav>
  );
}