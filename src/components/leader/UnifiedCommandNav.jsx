import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { getNavItemByKey } from '@/lib/navigation-registry';
import {
  Building2, HeartHandshake, Shield, Plug, Settings,
  LayoutDashboard, ChevronDown, ChevronRight, Menu,
} from 'lucide-react';

/**
 * UnifiedCommandNav — six primary domains with no TAB/PAGE badges.
 *
 * Domains: Overview · Tenants · Customer Success · Governance ·
 * Integrations · Platform
 *
 * Platform uses a grouped mega-menu (2-column grid with section headings).
 * Mobile uses a Sheet with accordion sections — same information architecture.
 *
 * Internal `type` metadata (tab/route) is engineering-only and never displayed.
 * - 'tab' items call onTabChange(key) → stays in LeaderOrg Tabs
 * - 'route' items navigate via react-router
 */
const NAV_CATEGORIES = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    primary: { key: 'overview', type: 'tab', label: 'Overview' },
    items: [],
  },
  {
    id: 'tenants',
    label: 'Tenants',
    icon: Building2,
    primary: { key: 'tenants', type: 'tab', label: 'Tenant Command Center' },
    items: [
      { key: 'subscriptions', type: 'tab' },
      { key: 'tenant-insights', type: 'tab' },
      { key: 'pilot-management', type: 'route' },
    ],
  },
  {
    id: 'customer-success',
    label: 'Customer Success',
    icon: HeartHandshake,
    items: [
      { key: 'customer-success', type: 'route' },
      { key: 'feedback-intelligence', type: 'tab' },
    ],
  },
  {
    id: 'governance',
    label: 'Governance',
    icon: Shield,
    items: [
      { key: 'shield-command', type: 'tab' },
      { key: 'audit-logs', type: 'route' },
      { key: 'access-control', type: 'route' },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Plug,
    primary: { key: 'integration-hub', type: 'route', label: 'Integration Hub' },
    items: [
      { key: 'integration-health', type: 'route' },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    icon: Settings,
    megaGroups: [
      {
        section: 'Foundation',
        items: [
          { key: 'platform-identity', type: 'tab' },
          { key: 'system-controls', type: 'tab' },
          { key: 'blueprint', type: 'tab' },
        ],
      },
      {
        section: 'Capabilities & Access',
        items: [
          { key: 'capabilities', type: 'route' },
          { key: 'security-centre', type: 'tab' },
        ],
      },
      {
        section: 'Reliability & Operations',
        items: [
          { key: 'system-health', type: 'tab' },
          { key: 'operational-health', type: 'tab' },
          { key: 'incident-response', type: 'tab' },
          { key: 'activity-logs', type: 'tab' },
          { key: 'support-diagnostics', type: 'route' },
        ],
      },
      {
        section: 'Release & Evolution',
        items: [
          { key: 'release-readiness', type: 'tab' },
          { key: 'deployment-pipeline', type: 'tab' },
          { key: 'change-log', type: 'tab' },
          { key: 'roadmap', type: 'tab' },
        ],
      },
    ],
  },
];

const TRIGGER_BASE = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';
const TRIGGER_ACTIVE = 'bg-primary text-primary-foreground';
const TRIGGER_IDLE = 'bg-card border border-border text-foreground hover:bg-muted';

export default function UnifiedCommandNav({ activeTab, onTabChange }) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleItem = (entry) => {
    const item = getNavItemByKey(entry.key);
    if (!item) return;
    if (entry.type === 'tab') {
      onTabChange(entry.key);
    } else {
      navigate(item.route);
    }
  };

  // ── Render a single dropdown item ──
  // Route items use asChild + Link (proper Radix pattern — no
  // menu-closing-before-navigation race condition, no setTimeout).
  // Tab items use onClick + onTabChange (stay within LeaderOrg).
  const renderDropdownItem = (entry, className = 'gap-2 cursor-pointer') => {
    const item = getNavItemByKey(entry.key);
    if (!item) return null;
    if (entry.type === 'route') {
      return (
        <DropdownMenuItem asChild key={entry.key} className={className}>
          <Link to={item.route}>{entry.label || item.label}</Link>
        </DropdownMenuItem>
      );
    }
    return (
      <DropdownMenuItem
        key={entry.key}
        onClick={() => handleItem(entry)}
        className={className}
      >
        {entry.label || item.label}
      </DropdownMenuItem>
    );
  };

  const isActiveCategory = (cat) => {
    if (cat.primary?.type === 'tab' && activeTab === cat.primary.key) return true;
    if (cat.items?.some((i) => i.type === 'tab' && i.key === activeTab)) return true;
    if (cat.megaGroups?.some((g) => g.items.some((i) => i.type === 'tab' && i.key === activeTab))) return true;
    return false;
  };

  // ── Render a single category trigger (shared by desktop + mobile label) ──
  const renderDesktopCategory = (cat) => {
    const Icon = cat.icon;
    const active = isActiveCategory(cat);

    // Direct link — no dropdown items and no megaGroups
    if ((!cat.items || cat.items.length === 0) && !cat.megaGroups && cat.primary) {
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

    // Mega-menu — Platform category with grouped sections
    if (cat.megaGroups) {
      return (
        <DropdownMenu key={cat.id}>
          <DropdownMenuTrigger
            className={cn(TRIGGER_BASE, active ? TRIGGER_ACTIVE : TRIGGER_IDLE)}
            aria-label={`${cat.label} menu`}
          >
            <Icon className="w-4 h-4" /> {cat.label}
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[480px] p-3 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {cat.megaGroups.map((group) => (
                <div key={group.section} className="space-y-0.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                    {group.section}
                  </p>
                  {group.items.map((entry) =>
                    renderDropdownItem(entry, 'gap-2 cursor-pointer rounded-md px-2 py-1.5 text-sm')
                  )}
                </div>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    // Regular dropdown
    return (
      <DropdownMenu key={cat.id}>
        <DropdownMenuTrigger
          className={cn(TRIGGER_BASE, active ? TRIGGER_ACTIVE : TRIGGER_IDLE)}
          aria-label={`${cat.label} menu`}
        >
          <Icon className="w-4 h-4" /> {cat.label}
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 max-h-[80vh] overflow-y-auto">
          {cat.primary && (
            <>
              {cat.primary.type === 'route' ? (
                <DropdownMenuItem asChild className="gap-2 font-medium text-primary focus:text-primary">
                  <Link to={getNavItemByKey(cat.primary.key)?.route}>
                    <ChevronRight className="w-3.5 h-3.5" />
                    {cat.primary.label || getNavItemByKey(cat.primary.key)?.label}
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => handleItem(cat.primary)}
                  className="gap-2 font-medium text-primary focus:text-primary"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  {cat.primary.label || getNavItemByKey(cat.primary.key)?.label}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </>
          )}
          {cat.items
            .filter((i) => !cat.primary || i.key !== cat.primary.key)
            .map((entry) => renderDropdownItem(entry, 'gap-2 cursor-pointer'))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // ── Mobile: Sheet with accordion sections ──
  const renderMobileCategory = (cat) => {
    const Icon = cat.icon;

    // Direct link
    if ((!cat.items || cat.items.length === 0) && !cat.megaGroups && cat.primary) {
      const item = getNavItemByKey(cat.primary.key);
      if (!item) return null;
      return (
        <Button
          key={cat.id}
          variant="ghost"
          className="w-full justify-start gap-2 font-medium"
          onClick={() => { handleItem(cat.primary); setMobileOpen(false); }}
        >
          <Icon className="w-4 h-4" /> {cat.label}
        </Button>
      );
    }

    return (
      <Accordion key={cat.id} type="single" collapsible>
        <AccordionItem value={cat.id} className="border-b-0">
          <AccordionTrigger className="px-3 py-2 hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Icon className="w-4 h-4" /> {cat.label}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-2 pl-4 space-y-0.5">
            {cat.primary && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 font-medium text-primary"
                onClick={() => { handleItem(cat.primary); setMobileOpen(false); }}
              >
                <ChevronRight className="w-3.5 h-3.5" />
                {cat.primary.label || getNavItemByKey(cat.primary.key)?.label}
              </Button>
            )}
            {cat.items?.map((entry) => {
              const item = getNavItemByKey(entry.key);
              if (!item) return null;
              return (
                <Button
                  key={entry.key}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => { handleItem(entry); setMobileOpen(false); }}
                >
                  {entry.label || item.label}
                </Button>
              );
            })}
            {cat.megaGroups?.map((group) => (
              <div key={group.section} className="pt-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1">
                  {group.section}
                </p>
                {group.items.map((entry) => {
                  const item = getNavItemByKey(entry.key);
                  if (!item) return null;
                  return (
                    <Button
                      key={entry.key}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => { handleItem(entry); setMobileOpen(false); }}
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-1.5 flex-wrap mb-5" aria-label="Platform command navigation">
        {NAV_CATEGORIES.map(renderDesktopCategory)}
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden mb-5">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full gap-2" aria-label="Open platform navigation menu">
              <Menu className="w-4 h-4" /> Navigation
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Platform Navigation</SheetTitle>
            </SheetHeader>
            <div className="py-2 space-y-1">
              {NAV_CATEGORIES.map(renderMobileCategory)}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}