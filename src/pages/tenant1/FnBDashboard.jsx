import React from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { PackBadgeGroup, PlanBadge } from '@/components/shared/PackBadge';
import { Button } from '@/components/ui/button';
import {
  Package, ShoppingCart, FileText, Users, CheckSquare,
  Shield, BarChart2, Link2, Calendar, ChevronRight,
  AlertTriangle, TrendingUp, DollarSign, Clock, Utensils,
  Home
} from 'lucide-react';
import { OrbitanEngine } from '@/lib/orbitan-engine';

// ── Icon Map — keeps OrbitanEngine framework-agnostic ────────
const ICON_MAP = {
  Home, Package, ShoppingCart, FileText, Calendar, Users,
  CheckSquare, Shield, BarChart2, Link2, Clock, AlertTriangle, Utensils,
};

// ── Tenant stub for engine (replace with real tenant record in prod) ──
const TENANT = {
  name: 'Taqueria Pte Ltd',
  subscription_plan: 'orbitan_business',
  enabled_modules: ['dashboard', 'inventory', 'procurement', 'sales', 'scheduling', 'replenishment', 'workforce', 'clockin', 'tasks', 'compliance', 'reporting', 'xero'],
  enabled_packs: ['core', 'fnb', 'finance', 'compliance'],
};

const engine = OrbitanEngine.for(TENANT);
const NAV = engine.buildNav('t1', ICON_MAP);

const MODULE_CARDS = [
  { href: '/t1/inventory',     icon: Package,      label: 'Inventory',       desc: 'Ingredient stock & par levels',      color: 'bg-orbitan-amber-light text-orbitan-amber',  alert: '3 items below par' },
  { href: '/t1/procurement',   icon: ShoppingCart, label: 'Procurement',     desc: 'Purchase orders & suppliers',        color: 'bg-orbitan-blue-light text-orbitan-blue',   alert: '2 POs pending approval' },
  { href: '/t1/sales',         icon: FileText,     label: 'Sales & Invoicing',desc: 'Daily reconciliation & COGS',       color: 'bg-orbitan-green-light text-orbitan-green', alert: null },
  { href: '/t1/scheduling',    icon: Calendar,     label: 'Scheduling',      desc: 'Shift planning & attendance',        color: 'bg-orbitan-purple-light text-orbitan-purple',alert: null },
  { href: '/t1/workforce',     icon: Users,        label: 'Workforce',       desc: 'Staff profiles & roles',             color: 'bg-orbitan-blue-light text-orbitan-blue',   alert: null },
  { href: '/t1/tasks',         icon: CheckSquare,  label: 'Tasks',           desc: 'Operational task management',        color: 'bg-orbitan-amber-light text-orbitan-amber', alert: '5 tasks due today' },
  { href: '/t1/compliance',    icon: Shield,       label: 'Compliance',      desc: 'Food safety & audit records',        color: 'bg-orbitan-red-light text-orbitan-red',     alert: '1 overdue audit' },
  { href: '/t1/xero',          icon: Link2,        label: 'Xero Integration',desc: 'Accounting sync status',             color: 'bg-orbitan-green-light text-orbitan-green', alert: null },
];

const KPI = [
  { label: "Today's Revenue", value: 'S$1,842', sub: 'La Birria Tacos · North Bridge Rd', icon: DollarSign, color: 'text-orbitan-green' },
  { label: 'Gross Margin',    value: '62.4%',   sub: 'vs 60.1% last week',               icon: TrendingUp,    color: 'text-orbitan-blue' },
  { label: 'Low Stock Items', value: '3',       sub: 'Requires replenishment',            icon: AlertTriangle, color: 'text-orbitan-amber' },
  { label: 'Open Shifts',     value: '8',       sub: '2 unconfirmed',                     icon: Clock,         color: 'text-orbitan-purple' },
];

export default function FnBDashboard() {
  return (
    <AppShell
      navigation={NAV}
      title="La Birria Tacos — F&B Console"
      headerRight={
        <Link to="/leader-org">
          <Button size="sm" variant="ghost" className="text-xs text-muted-foreground">
            ← Platform Console
          </Button>
        </Link>
      }
    >
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

        {/* Header — Enterprise Multi-Pack Identity */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F97316' }}>
                <Utensils className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-heading font-bold text-xl text-foreground">Taqueria Pte Ltd</h2>
              <PlanBadge plan="orbitan_business" />
            </div>
            <PackBadgeGroup packs={TENANT.enabled_packs} />
            <p className="text-sm text-muted-foreground mt-1">
              Client: <span className="font-medium text-foreground">La Birria Tacos</span> &nbsp;·&nbsp;
              Outlet: <span className="font-medium text-foreground">North Bridge Rd</span> &nbsp;·&nbsp;
              {new Date().toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <Link to="/outlet">
            <Button size="sm" variant="outline" className="text-xs gap-1 flex-shrink-0">
              Outlet View <ChevronRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {KPI.map(k => (
            <div key={k.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
                <k.icon className={`w-4 h-4 ${k.color}`} />
              </div>
              <p className={`text-2xl font-display font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Module Grid */}
        <div>
          <h3 className="font-heading font-semibold text-foreground mb-4">Active Modules — F&B Pack</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODULE_CARDS.map(m => (
              <Link key={m.href} to={m.href}>
                <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all group h-full">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${m.color}`}>
                    <m.icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-heading font-semibold text-sm text-foreground mb-1 group-hover:text-primary transition-colors">{m.label}</h4>
                  <p className="text-xs text-muted-foreground mb-3">{m.desc}</p>
                  {m.alert && (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-orbitan-amber bg-orbitan-amber-light px-2 py-1 rounded-lg">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {m.alert}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Xero Banner */}
        <div className="bg-orbitan-green-light border border-green-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Link2 className="w-5 h-5 text-orbitan-green" />
            </div>
            <div>
              <p className="font-heading font-semibold text-sm text-foreground">Xero Integration</p>
              <p className="text-xs text-muted-foreground">Connect your Xero account to sync sales, invoices and COGS automatically.</p>
            </div>
          </div>
          <Link to="/t1/xero">
            <Button size="sm" className="bg-orbitan-green hover:bg-orbitan-green/90 text-white text-xs gap-1.5 flex-shrink-0">
              <Link2 className="w-3.5 h-3.5" /> Manage Xero
            </Button>
          </Link>
        </div>

      </div>
    </AppShell>
  );
}