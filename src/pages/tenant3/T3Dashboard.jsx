import React from 'react';
import AppShell from '@/components/layout/AppShell';
import EnterpriseIdentityBar from '@/components/shared/EnterpriseIdentityBar';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import NotificationsInbox from '@/components/shared/NotificationsInbox';
import { Button } from '@/components/ui/button';
import {
  ShoppingBag, Package, FileText, Users, CheckSquare,
  BarChart2, ShoppingCart, Leaf, TrendingUp, Tag,
  Heart, Shirt, Home, Shield, Rocket,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { OrbitanEngine } from '@/lib/orbitan-engine';
import EmptyState from '@/components/shared/EmptyState';


// ── Icon Map ─────────────────────────────────────────────────
const ICON_MAP = {
  Home, Package, ShoppingCart, FileText, Users, CheckSquare,
  BarChart2, Leaf, TrendingUp, Heart, Shirt, ShoppingBag, Shield,
};

// ── Tenant stub ───────────────────────────────────────────────
const TENANT = {
  name: 'Renewed Fashion',
  subscription_plan: 'orbitan_business',
  enabled_modules: ['dashboard', 'catalog', 'inventory', 'sales', 'customers', 'workforce', 'tasks', 'reporting'],
  enabled_packs: ['core', 'retail'],
};

const engine = OrbitanEngine.for(TENANT);
const NAV = engine.buildNav('t3', ICON_MAP);

const KPI_DATA = [
  { label: 'Items Listed',       value: '0',      unit: 'products', delta: 'Pilot Day — awaiting first listing', icon: Shirt,      color: 'text-muted-foreground', bg: 'bg-[#F0FDF4]' },
  { label: 'Sales This Month',   value: 'S$0.00', unit: 'MTD',      delta: 'Awaiting first sale',                icon: TrendingUp, color: 'text-muted-foreground', bg: 'bg-orbitan-blue-light' },
  { label: 'Items Sold',         value: '0',      unit: 'pieces',   delta: 'No transactions yet',                icon: ShoppingBag,color: 'text-muted-foreground', bg: 'bg-[#F0FDF4]' },
  { label: 'CO₂ Impact',        value: '0',      unit: 'kg saved', delta: 'Impact tracking active',              icon: Leaf,       color: 'text-muted-foreground', bg: 'bg-emerald-50' },
];

const MODULE_CARDS = [
  { label: 'Product Catalog', href: '/t3/catalog',    icon: Shirt,       desc: 'Manage upcycled products' },
  { label: 'Inventory',       href: '/t3/inventory',  icon: Package,     desc: 'Stock & warehouse view' },
  { label: 'Sales & POS',     href: '/t3/sales',      icon: FileText,    desc: 'Process & track sales' },
  { label: 'Customers',       href: '/t3/customers',  icon: Heart,       desc: 'Profiles & purchase history' },
  { label: 'Workforce',       href: '/t3/workforce',  icon: Users,       desc: 'Staff management' },
  { label: 'Reporting',       href: '/t3/reporting',  icon: BarChart2,   desc: 'Sustainability KPIs' },
];

export default function T3Dashboard() {
  return (
    <AppShell navigation={NAV} tenant={TENANT} title="" headerRight={<div className="flex items-center gap-2"><NotificationsInbox tenantSlug="t3" /><TenantSwitcher /></div>}>
      <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">

        {/* Header — Phase A: Enterprise Multi-Pack Identity */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <EnterpriseIdentityBar
            tenant={{ ...TENANT, brand: 'Renewed Fashion', outlet: null }}
            showPlan
            showOutlet
            size="lg"
          />
          <Link to="/t3/catalog">
            <Button size="sm" className="gap-2 flex-shrink-0" style={{ background: '#22C55E' }}>
              <Tag className="w-3.5 h-3.5" /> Add Product
            </Button>
          </Link>
        </div>

        {/* Pilot Launch Message */}
        <div className="bg-card border border-border rounded-xl p-6">
          <EmptyState
            icon={Rocket}
            title="Pilot Phase Active — Renewed Fashion"
            description="Your retail operating system is live. Inventory and catalog are clean and ready. Add your first upcycled products to the catalog to start selling sustainable fashion today."
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
              <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-[#22C55E]/30 transition-all cursor-pointer group">
                <div className="w-9 h-9 rounded-lg bg-[#F0FDF4] flex items-center justify-center mb-3">
                  <m.icon className="w-4 h-4 text-[#22C55E]" />
                </div>
                <p className="text-sm font-semibold text-foreground group-hover:text-[#22C55E] transition-colors">{m.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}