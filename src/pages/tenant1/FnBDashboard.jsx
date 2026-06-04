import React from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import {
  Package, ShoppingCart, FileText, Users, CheckSquare,
  Shield, BarChart2, Link2, Calendar, ChevronRight,
  AlertTriangle, TrendingUp, DollarSign, Clock, Utensils
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV = [
  { type: 'section', label: 'F&B Operations' },
  { href: '/t1/dashboard', icon: Utensils, label: 'Dashboard' },
  { href: '/t1/inventory', icon: Package, label: 'Inventory' },
  { href: '/t1/procurement', icon: ShoppingCart, label: 'Procurement' },
  { href: '/t1/sales', icon: FileText, label: 'Sales & Invoicing' },
  { href: '/t1/scheduling', icon: Calendar, label: 'Scheduling' },
  { type: 'section', label: 'People & Tasks' },
  { href: '/t1/workforce', icon: Users, label: 'Workforce' },
  { href: '/t1/tasks', icon: CheckSquare, label: 'Tasks' },
  { type: 'section', label: 'Governance' },
  { href: '/t1/compliance', icon: Shield, label: 'Compliance' },
  { href: '/t1/reporting', icon: BarChart2, label: 'Reporting' },
  { href: '/t1/xero', icon: Link2, label: 'Xero Integration' },
  { type: 'section', label: 'Platform' },
  { href: '/leader-org', icon: BarChart2, label: '← Platform Console' },
];

const MODULES = [
  { href: '/t1/inventory', icon: Package, label: 'Inventory', desc: 'Ingredient stock & par levels', color: 'bg-orbitan-amber-light text-orbitan-amber', alert: '3 items below par' },
  { href: '/t1/procurement', icon: ShoppingCart, label: 'Procurement', desc: 'Purchase orders & suppliers', color: 'bg-orbitan-blue-light text-orbitan-blue', alert: '2 POs pending approval' },
  { href: '/t1/sales', icon: FileText, label: 'Sales & Invoicing', desc: 'Daily reconciliation & COGS', color: 'bg-orbitan-green-light text-orbitan-green', alert: null },
  { href: '/t1/scheduling', icon: Calendar, label: 'Scheduling', desc: 'Shift planning & attendance', color: 'bg-orbitan-purple-light text-orbitan-purple', alert: null },
  { href: '/t1/workforce', icon: Users, label: 'Workforce', desc: 'Staff profiles & roles', color: 'bg-orbitan-blue-light text-orbitan-blue', alert: null },
  { href: '/t1/tasks', icon: CheckSquare, label: 'Tasks', desc: 'Operational task management', color: 'bg-orbitan-amber-light text-orbitan-amber', alert: '5 tasks due today' },
  { href: '/t1/compliance', icon: Shield, label: 'Compliance', desc: 'Food safety & audit records', color: 'bg-orbitan-red-light text-orbitan-red', alert: '1 overdue audit' },
  { href: '/t1/xero', icon: Link2, label: 'Xero Integration', desc: 'Accounting sync status', color: 'bg-orbitan-green-light text-orbitan-green', alert: null },
];

const KPI = [
  { label: "Today's Revenue", value: 'S$1,842', sub: 'La Birria Tacos · North Bridge Rd', icon: DollarSign, color: 'text-orbitan-green' },
  { label: 'Gross Margin', value: '62.4%', sub: 'vs 60.1% last week', icon: TrendingUp, color: 'text-orbitan-blue' },
  { label: 'Low Stock Items', value: '3', sub: 'Requires replenishment', icon: AlertTriangle, color: 'text-orbitan-amber' },
  { label: 'Open Shifts Today', value: '8', sub: '2 unconfirmed', icon: Clock, color: 'text-orbitan-purple' },
];

export default function FnBDashboard() {
  return (
    <AppShell
      navigation={NAV}
      title="La Birria Tacos — F&B Console"
      headerRight={
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 bg-orbitan-amber-light text-orbitan-amber text-xs font-semibold px-3 py-1.5 rounded-full">
            <Utensils className="w-3.5 h-3.5" /> F&B Pack
          </span>
          <Link to="/outlet">
            <Button size="sm" variant="outline" className="text-xs gap-1">
              Outlet View <ChevronRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      }
    >
      <div className="p-6 max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-1">Tenant 1 · Taqueria Pte Ltd</p>
          <h2 className="text-2xl font-display font-bold text-foreground">F&B Operations Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Client: <span className="font-medium text-foreground">La Birria Tacos</span> &nbsp;·&nbsp;
            Outlet: <span className="font-medium text-foreground">North Bridge Rd</span> &nbsp;·&nbsp;
            {new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI.map(k => (
            <div key={k.label} className="bg-card border border-border rounded-xl p-5">
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
            {MODULES.map(m => (
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