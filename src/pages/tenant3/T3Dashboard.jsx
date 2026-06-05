import React from 'react';
import AppShell from '@/components/layout/AppShell';
import EnterpriseIdentityBar from '@/components/shared/EnterpriseIdentityBar';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Button } from '@/components/ui/button';
import {
  ShoppingBag, Package, FileText, Users, CheckSquare,
  BarChart2, ShoppingCart, Leaf, TrendingUp, Tag,
  Heart, ArrowUpRight, Shirt, Home, Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { OrbitanEngine } from '@/lib/orbitan-engine';


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
  { label: 'Items Listed',       value: '348',     unit: 'products', delta: '+42 this week', icon: Shirt,       color: 'text-[#22C55E]', bg: 'bg-[#F0FDF4]' },
  { label: 'Sales This Month',   value: 'S$4,280', unit: 'MTD',      delta: '+28%',          icon: TrendingUp,  color: 'text-primary',   bg: 'bg-orbitan-blue-light' },
  { label: 'Items Sold',         value: '89',      unit: 'pieces',   delta: '+15%',          icon: ShoppingBag, color: 'text-[#22C55E]', bg: 'bg-[#F0FDF4]' },
  { label: 'CO₂ Impact',        value: '284',     unit: 'kg saved', delta: 'via purchases',  icon: Leaf,        color: 'text-emerald-600',bg: 'bg-emerald-50' },
];

const RECENT_SALES = [
  { id: 'S-089', item: "Vintage Levi's Denim Jacket", grade: 'B_like_new', price: 'S$48', customer: 'Sarah T.',  date: '2026-06-04' },
  { id: 'S-088', item: 'Upcycled Floral Maxi Dress',  grade: 'E_upcycled', price: 'S$35', customer: 'Priya M.',  date: '2026-06-04' },
  { id: 'S-087', item: 'H&M Striped Tee (M)',          grade: 'C_good',     price: 'S$12', customer: 'Walk-in',   date: '2026-06-03' },
  { id: 'S-086', item: 'Nike Running Shorts',          grade: 'B_like_new', price: 'S$22', customer: 'James K.',  date: '2026-06-03' },
];

const GRADE_MAP = {
  A_new_with_tags: { label: 'New w/ Tags', color: '#16A34A', bg: '#DCFCE7' },
  B_like_new:      { label: 'Like New',    color: '#2563EB', bg: '#DBEAFE' },
  C_good:          { label: 'Good',        color: '#D97706', bg: '#FEF3C7' },
  D_fair:          { label: 'Fair',        color: '#9CA3AF', bg: '#F3F4F6' },
  E_upcycled:      { label: 'Upcycled ♻', color: '#7C3AED', bg: '#EDE9FE' },
};

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
    <AppShell navigation={NAV} tenant={TENANT} title="" headerRight={<TenantSwitcher />}>
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

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {KPI_DATA.map(kpi => (
            <div key={kpi.label} className="bg-card border border-border rounded-xl p-4">
              <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.unit}</p>
              <p className="text-xs font-medium text-[#22C55E] mt-1">{kpi.delta}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Condition Grade Breakdown */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Inventory by Condition Grade</h3>
          <div className="flex flex-wrap gap-3">
            {[
              { grade: 'A_new_with_tags', count: 28 },
              { grade: 'B_like_new',      count: 94 },
              { grade: 'C_good',          count: 142 },
              { grade: 'D_fair',          count: 56 },
              { grade: 'E_upcycled',      count: 28 },
            ].map(g => {
              const cfg = GRADE_MAP[g.grade];
              return (
                <div key={g.grade} className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ background: cfg.bg, borderColor: cfg.bg }}>
                  <span className="text-sm font-bold" style={{ color: cfg.color }}>{g.count}</span>
                  <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-heading font-semibold text-foreground">Recent Sales</h3>
            <Link to="/t3/sales">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">View All <ArrowUpRight className="w-3.5 h-3.5" /></Button>
            </Link>
          </div>
          <div className="divide-y divide-border">
            {RECENT_SALES.map(s => {
              const grade = GRADE_MAP[s.grade] || GRADE_MAP.C_good;
              return (
                <div key={s.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: grade.bg }}>
                      <Shirt className="w-4 h-4" style={{ color: grade.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.item}</p>
                      <p className="text-xs text-muted-foreground">{s.id} · {s.customer} · {s.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ color: grade.color, background: grade.bg }}>{grade.label}</span>
                    <p className="text-sm font-semibold text-foreground">{s.price}</p>
                  </div>
                </div>
              );
            })}
          </div>
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