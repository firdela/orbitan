import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import AppShell from '@/components/layout/AppShell';
import StatCard from '@/components/shared/StatCard';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Package, ShoppingCart, FileText, CheckSquare, Users, Calendar,
  AlertTriangle, TrendingUp, BarChart2, Shield, Home, ArrowRight,
  Building2, Layers
} from 'lucide-react';

const NAV = [
  { type: 'section', label: 'Outlet' },
  { href: '/outlet', icon: Home, label: 'Dashboard' },
  { href: '/outlet/inventory', icon: Package, label: 'Inventory' },
  { href: '/outlet/procurement', icon: ShoppingCart, label: 'Purchase Orders' },
  { href: '/outlet/sales', icon: FileText, label: 'Sales & Reconciliation' },
  { type: 'section', label: 'Team' },
  { href: '/outlet/workforce', icon: Users, label: 'My Team' },
  { href: '/outlet/scheduling', icon: Calendar, label: 'Shift Schedule' },
  { href: '/outlet/tasks', icon: CheckSquare, label: 'Tasks' },
  { type: 'section', label: 'Reports' },
  { href: '/outlet/reports', icon: BarChart2, label: 'Reports' },
  { href: '/outlet/compliance', icon: Shield, label: 'Compliance' },
  { type: 'section', label: 'Navigation' },
  { href: '/company', icon: Building2, label: 'Company Dashboard' },
  { href: '/leader-org', icon: Layers, label: 'OrbitanOS Console' },
];

export default function OutletDashboard() {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.InventoryItem.filter({ tenant_id: "tenant_taqueria", outlet_id: "outlet_nb" }),
      base44.entities.PurchaseOrder.filter({ tenant_id: "tenant_taqueria" }),
      base44.entities.Task.filter({ tenant_id: "tenant_taqueria" }),
    ]).then(([inv, po, t]) => {
      setInventoryItems(inv || []);
      setPurchaseOrders(po || []);
      setTasks(t || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const lowStockItems = inventoryItems.filter(i => i.par_level && i.current_stock < i.par_level);
  const pendingPOs = purchaseOrders.filter(p => ['draft', 'pending_approval'].includes(p.status));
  const pendingTasks = tasks.filter(t => ['pending', 'in_progress'].includes(t.status));

  return (
    <AppShell
      navigation={NAV}
      title=""
      headerRight={
        <Link to="/worker">
          <Button variant="outline" size="sm" className="text-xs">Worker View</Button>
        </Link>
      }
    >
      <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
        <PageHeader
          title="La Birria Tacos — North Bridge Rd"
          subtitle="Outlet Dashboard · F&B Pack · Orbitan Business"
          actions={
            <Link to="/outlet/sales">
              <Button size="sm" className="gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Daily Reconciliation
              </Button>
            </Link>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total SKUs"
            value={loading ? '...' : inventoryItems.length}
            subtitle={`${lowStockItems.length} low stock`}
            icon={Package}
            color={lowStockItems.length > 0 ? 'amber' : 'green'}
            trend={lowStockItems.length > 0 ? 'down' : 'up'}
            trendValue={lowStockItems.length > 0 ? `${lowStockItems.length} alerts` : 'Stocked'}
          />
          <StatCard
            title="Purchase Orders"
            value={loading ? '...' : purchaseOrders.length}
            subtitle={`${pendingPOs.length} pending`}
            icon={ShoppingCart}
            color="blue"
          />
          <StatCard
            title="Pending Tasks"
            value={loading ? '...' : pendingTasks.length}
            subtitle="Assigned today"
            icon={CheckSquare}
            color="purple"
          />
          <StatCard
            title="Today's Sales"
            value="S$—"
            subtitle="Submit reconciliation"
            icon={TrendingUp}
            color="green"
          />
        </div>

        {/* Alerts */}
        {lowStockItems.length > 0 && (
          <div className="bg-orbitan-amber-light border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orbitan-amber flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orbitan-amber">Low Stock Alert</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {lowStockItems.map(i => i.name).join(', ')} {lowStockItems.length === 1 ? 'is' : 'are'} below par level.{' '}
                <Link to="/outlet/procurement" className="underline font-medium">Create a Purchase Order</Link>
              </p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Package, label: 'Inventory', desc: 'Stock levels & tracking', href: '/outlet/inventory', color: 'amber' },
            { icon: ShoppingCart, label: 'Purchase Orders', desc: 'Create & manage POs', href: '/outlet/procurement', color: 'blue' },
            { icon: FileText, label: 'Sales & Invoices', desc: 'Reconcile daily sales', href: '/outlet/sales', color: 'green' },
            { icon: Users, label: 'My Team', desc: 'Workforce management', href: '/outlet/workforce', color: 'purple' },
            { icon: Calendar, label: 'Shift Schedule', desc: 'Manage and publish shifts', href: '/outlet/scheduling', color: 'blue' },
            { icon: CheckSquare, label: 'Tasks', desc: 'Assign & track tasks', href: '/outlet/tasks', color: 'slate' },
          ].map(item => (
            <Link
              key={item.href}
              to={item.href}
              className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 hover:shadow-md hover:border-primary/20 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl orbitan-gradient flex items-center justify-center flex-shrink-0">
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-foreground text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>

        {/* Recent POs */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-heading font-semibold text-sm">Recent Purchase Orders</h3>
            <Link to="/outlet/procurement" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : purchaseOrders.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">No purchase orders yet. <Link to="/outlet/procurement" className="text-primary underline">Create one</Link></div>
            ) : (
              purchaseOrders.slice(0, 5).map(po => (
                <div key={po.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{po.po_number || 'PO-' + po.id?.slice(-5)}</p>
                    <p className="text-xs text-muted-foreground">{po.supplier_name || 'Supplier'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {po.total_amount && <span className="text-sm font-semibold">S${po.total_amount?.toFixed(2)}</span>}
                    <StatusBadge status={po.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}