import React from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import StatCard from '@/components/shared/StatCard';
import PageHeader from '@/components/shared/PageHeader';
import EnterpriseIdentityBar from '@/components/shared/EnterpriseIdentityBar';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { useTenant } from '@/lib/use-tenant.jsx';
import { MODULES, INDUSTRY_PACKS, INDUSTRY_LABELS, SUBSCRIPTION_PLANS } from '@/lib/orbitan-config';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import OrbitanLoader from '@/components/brand/OrbitanLoader';
import {
  Building2, Users, Package, BarChart2, ShoppingCart, FileText,
  CheckSquare, Shield, Link as LinkIcon, Calendar, ChevronRight,
  MapPin, Star, Layers, BookOpen, UserCheck, Home
} from 'lucide-react';

const NAV = [
  { type: 'section', label: 'Organisation' },
  { href: '/company', icon: Home, label: 'Dashboard' },
  { href: '/company/clients', icon: Star, label: 'Clients & Brands' },
  { href: '/outlet', icon: MapPin, label: 'Outlets' },
  { type: 'section', label: 'Operations' },
  { href: '/company/workforce', icon: Users, label: 'Workforce' },
  { href: '/company/scheduling', icon: Calendar, label: 'Scheduling' },
  { href: '/company/inventory', icon: Package, label: 'Inventory' },
  { href: '/company/procurement', icon: ShoppingCart, label: 'Procurement' },
  { href: '/company/sales', icon: FileText, label: 'Sales & Invoices' },
  { href: '/company/tasks', icon: CheckSquare, label: 'Tasks' },
  { type: 'section', label: 'Management' },
  { href: '/company/compliance', icon: Shield, label: 'Compliance' },
  { href: '/platform/access-control', icon: Shield, label: 'Access Control' },
  { href: '/company/reporting', icon: BarChart2, label: 'Reporting' },
  { href: '/company/integrations', icon: LinkIcon, label: 'Integrations' },
  { type: 'section', label: 'Platform' },
  { href: '/leader-org', icon: Layers, label: 'OrbitanOS Console' },
];

const MODULE_CARDS = [
  { key: 'workforce', label: 'Workforce', icon: Users, href: '/company/workforce', color: 'blue' },
  { key: 'scheduling', label: 'Scheduling', icon: Calendar, href: '/company/scheduling', color: 'purple' },
  { key: 'inventory', label: 'Inventory', icon: Package, href: '/company/inventory', color: 'amber' },
  { key: 'procurement', label: 'Procurement', icon: ShoppingCart, href: '/company/procurement', color: 'green' },
  { key: 'sales_invoice', label: 'Sales & Invoices', icon: FileText, href: '/company/sales', color: 'blue' },
  { key: 'task', label: 'Tasks', icon: CheckSquare, href: '/company/tasks', color: 'purple' },
  { key: 'compliance', label: 'Compliance', icon: Shield, href: '/company/compliance', color: 'red' },
  { key: 'reporting', label: 'Reporting', icon: BarChart2, href: '/company/reporting', color: 'green' },
  { key: 'finance_integration', label: 'Finance Integration', icon: LinkIcon, href: '/company/integrations', color: 'slate' },
  { key: 'customer_management', label: 'Customers', icon: UserCheck, href: '/company/customers', color: 'blue' },
];

export default function CompanyDashboard() {
  const { currentTenant: tenant } = useTenant();

  if (!tenant) {
    return <OrbitanLoader size="fullscreen" message="Loading workspace..." />;
  }

  const plan = SUBSCRIPTION_PLANS[tenant.subscription_plan];

  const enabledModules = tenant.enabled_modules || [];
  const enabledPacks = tenant.enabled_packs || [];

  return (
    <AppShell
      navigation={NAV}
      tenant={tenant}
      title=""
      headerRight={
        <div className="flex items-center gap-2">
          <TenantSwitcher />
          <Link to="/worker">
            <Button variant="outline" size="sm" className="text-xs hidden sm:flex">Worker View</Button>
          </Link>
        </div>
      }
    >
      <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
        {/* Phase A — Enterprise Multi-Pack Identity Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <EnterpriseIdentityBar
            tenant={tenant}
            showPlan
            showOutlet
            size="lg"
          />
          <Link to="/outlet">
            <Button size="sm" className="gap-1.5 flex-shrink-0">
              <MapPin className="w-3.5 h-3.5" />
              Go to Outlet
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Active Modules" value={enabledModules.length} icon={Layers} color="blue" />
          <StatCard title="Employees" value="—" subtitle="Add via Workforce" icon={Users} color="purple" />
          <StatCard title="Outlets" value="1" subtitle="La Birria Tacos NB" icon={MapPin} color="green" />
          <StatCard title="Clients / Brands" value="1" subtitle="La Birria Tacos" icon={Star} color="amber" />
        </div>

        {/* Module Grid */}
        <div className="mb-8">
          <h3 className="font-heading font-semibold text-foreground mb-4">Your Modules</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {MODULE_CARDS.map(mod => {
              const isEnabled = enabledModules.includes(mod.key);
              return (
                <Link
                  key={mod.key}
                  to={isEnabled ? mod.href : '#'}
                  className={`bg-card border rounded-xl p-4 flex flex-col items-center text-center transition-all ${
                    isEnabled
                      ? 'border-border hover:shadow-md hover:border-primary/20 cursor-pointer'
                      : 'border-border opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                    isEnabled ? 'orbitan-gradient' : 'bg-muted'
                  }`}>
                    <mod.icon className={`w-5 h-5 ${isEnabled ? 'text-white' : 'text-muted-foreground'}`} />
                  </div>
                  <p className={`text-xs font-medium leading-tight ${isEnabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {mod.label}
                  </p>
                  {!isEnabled && <p className="text-[10px] text-muted-foreground mt-1">Upgrade to unlock</p>}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-orbitan-amber" />
              <h4 className="font-heading font-semibold text-sm">Active Clients</h4>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-foreground">La Birria Tacos</span>
              <span className="text-xs bg-orbitan-amber-light text-orbitan-amber px-2 py-0.5 rounded-full">F&amp;B Pack</span>
            </div>
            <Link to="/company/clients" className="text-xs text-primary hover:underline mt-3 block">
              Manage clients →
            </Link>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-orbitan-blue" />
              <h4 className="font-heading font-semibold text-sm">Active Outlets</h4>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-foreground">La Birria Tacos (North Bridge Rd)</span>
              <StatusBadge status="active" />
            </div>
            <Link to="/outlet" className="text-xs text-primary hover:underline mt-3 block">
              Go to outlet →
            </Link>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-orbitan-purple" />
              <h4 className="font-heading font-semibold text-sm">Subscription</h4>
            </div>
            <p className="text-2xl font-display font-bold text-foreground mb-1">{plan?.name}</p>
            <p className="text-xs text-muted-foreground mb-3">S${plan?.price_sgd}/month · Up to {plan?.max_employees} employees</p>
            <Link to="/leader-org" className="text-xs text-primary hover:underline">
              Manage subscription →
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}