import React from 'react';
import AppShell from '@/components/layout/AppShell';
import EnterpriseIdentityBar from '@/components/shared/EnterpriseIdentityBar';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Button } from '@/components/ui/button';
import {
  Recycle, Package, ShoppingCart, CheckSquare, Shield,
  BarChart2, Users, Leaf, TrendingUp, AlertTriangle,
  Home, ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { OrbitanEngine } from '@/lib/orbitan-engine';


// ── Icon Map ─────────────────────────────────────────────────
const ICON_MAP = {
  Home, Package, ShoppingCart, Users, CheckSquare,
  Shield, BarChart2, Recycle, Leaf, TrendingUp, AlertTriangle,
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
  { label: 'Collections This Month', value: '142', unit: 'jobs',       delta: '+18%', icon: Recycle,     color: 'text-[#16A34A]', bg: 'bg-[#F0FDF4]' },
  { label: 'Materials Recovered',    value: '8,420', unit: 'kg',       delta: '+23%', icon: Package,     color: 'text-[#16A34A]', bg: 'bg-[#F0FDF4]' },
  { label: 'CO₂ Saved',             value: '12.4',  unit: 'tonnes',   delta: '+31%', icon: Leaf,        color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Revenue (Materials)',    value: 'S$6,840', unit: 'MTD',   delta: '+12%', icon: TrendingUp,  color: 'text-primary',    bg: 'bg-orbitan-blue-light' },
];

const RECENT_COLLECTIONS = [
  { id: 'C-2026-089', source: 'CapitaLand HQ',  material: 'Paper / Cardboard', weight: '320 kg', status: 'completed',  date: '2026-06-04' },
  { id: 'C-2026-088', source: 'Raffles Hotel',  material: 'Mixed Plastics',    weight: '85 kg',  status: 'processing', date: '2026-06-04' },
  { id: 'C-2026-087', source: 'NUS Campus',     material: 'E-Waste',           weight: '42 kg',  status: 'in_transit', date: '2026-06-03' },
  { id: 'C-2026-086', source: 'Suntec City',    material: 'Metals',            weight: '210 kg', status: 'completed',  date: '2026-06-03' },
];

const STATUS_MAP = {
  completed:   { label: 'Completed',  color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  processing:  { label: 'Processing', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  in_transit:  { label: 'In Transit', color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
  collected:   { label: 'Collected',  color: 'text-slate-700',   bg: 'bg-slate-50 border-slate-200' },
};

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
    <AppShell navigation={NAV} tenant={TENANT} title="" headerRight={<TenantSwitcher />}>
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

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {KPI_DATA.map(kpi => (
            <div key={kpi.label} className="bg-card border border-border rounded-xl p-4">
              <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.unit}</p>
              <p className="text-xs font-medium text-emerald-600 mt-1">{kpi.delta} vs last month</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Sustainability Impact Banner */}
        <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #16A34A 0%, #14532D 100%)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-3">June 2026 — Sustainability Impact</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'CO₂ Saved',        value: '12.4t', sub: 'equivalent' },
              { label: 'Landfill Diverted', value: '8.4t',  sub: 'materials' },
              { label: 'Trees Equivalent',  value: '568',   sub: 'trees saved' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-display font-bold">{s.value}</p>
                <p className="text-xs opacity-75">{s.label}</p>
                <p className="text-[10px] opacity-50">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Collections */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-heading font-semibold text-foreground">Recent Collections</h3>
            <Link to="/t2/collections">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-border">
            {RECENT_COLLECTIONS.map(c => {
              const s = STATUS_MAP[c.status] || STATUS_MAP.collected;
              return (
                <div key={c.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] flex items-center justify-center">
                      <Recycle className="w-4 h-4 text-[#16A34A]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.source}</p>
                      <p className="text-xs text-muted-foreground">{c.id} · {c.material} · {c.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-foreground hidden sm:block">{c.weight}</p>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${s.bg} ${s.color}`}>
                      {s.label}
                    </span>
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