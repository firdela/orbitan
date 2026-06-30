// ============================================================
// ORBITANOS — WorkspaceDashboard (Dynamic + Editable Layout)
//
// Pure-content dashboard rendered inside WorkspaceLayout's
// <Outlet />. Now powered by the EditableDashboardGrid so each
// team can drag-and-drop widgets to match their needs.
// Uses the tenant resolved from the URL :tenantId — no hardcoded
// pilot data. Scales to any customer.
// ============================================================

import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/shared/StatCard';
import StatusBadge from '@/components/shared/StatusBadge';
import EditableDashboardGrid from '@/components/dashboard/EditableDashboardGrid';
import { hasModule } from '@/lib/use-tenant';
import {
  Package, ShoppingCart, FileText, CheckSquare, Users,
  AlertTriangle, ArrowRight, Shield,
} from 'lucide-react';

export default function WorkspaceDashboard() {
  const { tenant, tenantId } = useOutletContext() || {};
  const [inventoryItems, setInventoryItems] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const base = `/workspace/${tenantId}`;

  useEffect(() => {
    Promise.all([
      base44.entities.InventoryItem.list('-created_date', 50),
      base44.entities.PurchaseOrder.list('-created_date', 20),
      base44.entities.Task.list('-created_date', 50),
    ]).then(([inv, po, t]) => {
      setInventoryItems(inv || []);
      setPurchaseOrders(po || []);
      setTasks(t || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const lowStockItems = inventoryItems.filter(i => i.par_level && i.current_stock < i.par_level);
  const pendingPOs = purchaseOrders.filter(p => ['draft', 'pending_approval'].includes(p.status));
  const pendingTasks = tasks.filter(t => ['pending', 'in_progress'].includes(t.status));

  const navModules = [
    { key: 'inventory', label: 'Inventory', icon: Package, href: `${base}/inventory`, count: inventoryItems.length, enabled: hasModule(tenant, 'inventory') },
    { key: 'procurement', label: 'Purchase Orders', icon: ShoppingCart, href: `${base}/procurement`, count: pendingPOs.length, enabled: hasModule(tenant, 'procurement') || hasModule(tenant, 'inventory') },
    { key: 'sales', label: 'Sales & Reconciliation', icon: FileText, href: `${base}/sales`, count: 0, enabled: hasModule(tenant, 'sales_invoice') },
    { key: 'tasks', label: 'Tasks', icon: CheckSquare, href: `${base}/tasks`, count: pendingTasks.length, enabled: hasModule(tenant, 'task') },
    { key: 'workforce', label: 'My Team', icon: Users, href: `${base}/workforce`, count: 0, enabled: hasModule(tenant, 'workforce') },
    { key: 'compliance', label: 'Compliance', icon: Shield, href: `${base}/compliance`, count: 0, enabled: hasModule(tenant, 'compliance') },
  ].filter(m => m.enabled);

  // ── Widget registry — each team can reorder / toggle these ──
  const widgets = [
    { id: 'kpi_inventory', title: 'Inventory Items', icon: Package,
      render: () => <StatCard title="Inventory Items" value={loading ? '—' : inventoryItems.length} icon={Package} accent="blue" /> },
    { id: 'kpi_pos', title: 'Open Purchase Orders', icon: ShoppingCart,
      render: () => <StatCard title="Open Purchase Orders" value={loading ? '—' : pendingPOs.length} icon={ShoppingCart} accent="amber" /> },
    { id: 'kpi_tasks', title: 'Pending Tasks', icon: CheckSquare,
      render: () => <StatCard title="Pending Tasks" value={loading ? '—' : pendingTasks.length} icon={CheckSquare} accent="violet" /> },
    { id: 'kpi_lowstock', title: 'Low Stock Alerts', icon: AlertTriangle,
      render: () => <StatCard title="Low Stock Alerts" value={loading ? '—' : lowStockItems.length} icon={AlertTriangle} accent="red" /> },
    ...navModules.map(m => ({
      id: `mod_${m.key}`,
      title: m.label,
      icon: m.icon,
      render: () => <ModuleCard mod={m} />,
    })),
    { id: 'alert_lowstock', title: 'Low Stock Detail', icon: AlertTriangle,
      render: () => <LowStockCard items={lowStockItems} loading={loading} /> },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="font-heading font-bold text-2xl tracking-tight">{tenant?.name || 'Workspace'}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tenant?.industry?.replace(/_/g, ' ') || 'Operations'} · {tenant?.subscription_plan?.replace('orbitan_', '') || 'starter'} plan
          </p>
        </div>
        <StatusBadge status={tenant?.status || 'active'} />
      </div>

      {/* ── Editable Widget Grid ── */}
      <EditableDashboardGrid
        dashboardKey="workspace_dashboard"
        widgets={widgets}
        tenantId={tenantId}
        role="default"
      />
    </div>
  );
}

function ModuleCard({ mod }) {
  const Icon = mod.icon;
  return (
    <Link to={mod.href} className="group card-elevated rounded-xl border border-border bg-card p-5 transition-all h-full flex flex-col">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <span className="text-2xl font-display font-bold tabular-nums text-foreground">{mod.count}</span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-medium text-sm text-foreground">{mod.label}</span>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}

function LowStockCard({ items, loading }) {
  return (
    <div className="bg-amber-50 border border-amber-500/30 rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <h3 className="font-heading font-semibold text-sm text-amber-900">Low Stock</h3>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">All items above par level.</p>
      ) : (
        <ul className="space-y-1 text-xs flex-1 overflow-y-auto max-h-32">
          {items.slice(0, 5).map(item => (
            <li key={item.id} className="flex justify-between text-amber-900/80 gap-2">
              <span className="truncate">{item.name}</span>
              <span className="tabular-nums flex-shrink-0">{item.current_stock}/{item.par_level} {item.unit}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}