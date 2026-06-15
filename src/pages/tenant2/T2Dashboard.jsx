import React from 'react';
import AppShell from '@/components/layout/AppShell';
import EnterpriseIdentityBar from '@/components/shared/EnterpriseIdentityBar';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import NotificationsInbox from '@/components/shared/NotificationsInbox';
import ShieldStatusWidget from '@/components/shield/ShieldStatusWidget';
import { Button } from '@/components/ui/button';
import {
  Recycle, Package, ShoppingCart, CheckSquare, Shield,
  BarChart2, Users, Leaf, TrendingUp,
  Home, ArrowUpRight, Rocket,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { OrbitanEngine } from '@/lib/orbitan-engine';
import EmptyState from '@/components/shared/EmptyState';


// ── Icon Map ─────────────────────────────────────────────────
const ICON_MAP = {
  Home, Package, ShoppingCart, Users, CheckSquare,
  Shield, BarChart2, Recycle, Leaf, TrendingUp,
};

// ── Tenant stub ───────────────────────────────────────────────
const TENANT = {
  name: 'Renewed Resources Pte Ltd',
  subscription_plan: 'orbitan_business',
  enabled_modules: ['dashboard', 'collections', 'inventory', 'procurement', 'workforce', 'tasks', 'compliance', 'reporting'],
  enabled_packs: ['core', 'recycling', 'compliance'],
};

const engine = OrbitanEngine.for(TENANT);
const NAV = engine.buildNav('t2', ICON_MAP);

const KPI_DATA = [
  { label: 'Collections This Month', value: '0',     unit: 'jobs',    delta: 'Pilot Day — awaiting first collection', icon: Recycle,    color: 'text-muted-foreground', bg: 'bg-[#F0FDF4]' },
  { label: 'Materials Recovered',    value: '0',     unit: 'kg',     delta: 'Calculated after first collection',     icon: Package,    color: 'text-muted-foreground', bg: 'bg-[#F0FDF4]' },
  { label: 'CO₂ Saved',             value: '0',     unit: 'tonnes', delta: 'Impact tracking active',                 icon: Leaf,       color: 'text-muted-foreground', bg: 'bg-emerald-50' },
  { label: 'Revenue (Materials)',    value: 'S$0.00',unit: 'MTD',   delta: 'Awaiting first sale',                    icon: TrendingUp, color: 'text-muted-foreground', bg: 'bg-orbitan-blue-light' },
];

const MODULE_CARDS = [
  { label: 'Collections',        href: '/t2/collections', icon: Recycle,     desc: 'Track pickups & processing' },
  { label: 'Materials Inventory',href: '/t2/inventory',   icon: Package,     desc: 'Recovered stock levels' },
  { label: 'Compliance',         href: '/t2/compliance',  icon: Shield,      desc: 'Regulatory audit trail' },
  { label: 'Workforce',          href: '/t2/workforce',   icon: Users,       desc: 'Driver & staff management' },
  { label: 'Tasks',              href: '/t2/tasks',       icon: CheckSquare, desc: 'Operational assignments' },
  { label: 'Reporting',          href: '/t2/reporting',   icon: BarChart2,   desc: 'Sustainability KPIs' },
];

export default function T2Dashboard() {
  return (
    <AppShell navigation={NAV} tenant={TENANT} title="" headerRight={<div className="flex items-center gap-2"><ShieldStatusWidget status="healthy" compact /><NotificationsInbox tenantSlug="t2" /><TenantSwitcher /></div>}>
      <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">

        {/* Header — Phase A: Enterprise Multi-Pack Identity */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <EnterpriseIdentityBar
            tenant={{ ...TENANT, brand: 'Renewed Resources', outlet: null }}
            showPlan
            showOutlet
            size="lg"
          />
          <Link to="/t2/collections">
            <Button size="sm" className="gap-2 bg-[#16A34A] hover:bg-[#15803D] flex-shrink-0">
              <Recycle className="w-3.5 h-3.5" /> New Collection
            </Button>
          </Link>
        </div>

        {/* Pilot Launch Message */}
        <div className="bg-card border border-border rounded-xl p-6">
          <EmptyState
            icon={Rocket}
            title="Pilot Phase Active — Renewed Resources"
            description="Your sustainability operating system is live. All metrics are reset and ready for genuine operational data. Record your first collection to start tracking recycling impact and CO₂ savings."
            color="green"
          />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {KPI_DATA.map(kpi => (
            <div key={kpi.label} className="bg-card border border-border rounded-xl p-4">
              <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-display font-bold text-muted-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.unit}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.delta}</p>
            </div>
          ))}
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {MODULE_CARDS.map(m => (
            <Link key={m.href} to={m.href}>
              <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-[#16A34A]/30 transition-all cursor-pointer group">
                <div className="w-9 h-9 rounded-lg bg-[#F0FDF4] flex items-center justify-center mb-3">
                  <m.icon className="w-4 h-4 text-[#16A34A]" />
                </div>
                <p className="text-sm font-semibold text-foreground group-hover:text-[#16A34A] transition-colors">{m.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}