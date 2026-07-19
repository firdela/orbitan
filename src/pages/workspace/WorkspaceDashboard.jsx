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
import TrustScoreWidget from '@/components/dashboard/TrustScoreWidget';
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
  const [salesInvoices, setSalesInvoices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [complianceRecords, setComplianceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const base = `/workspace/${tenantId}`;

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      base44.entities.InventoryItem.list('-created_date', 50),
      base44.entities.PurchaseOrder.list('-created_date', 20),
      base44.entities.Task.list('-created_date', 50),
      base44.entities.SalesInvoice.list('-created_date', 20),
      base44.entities.Employee.list('-created_date', 50),
      base44.entities.Shift.list('-date', 30),
      base44.entities.ComplianceRecord.list('-created_date', 30),
    ]).then(([inv, po, t, sales, emp, shft, comp]) => {
      setInventoryItems(inv || []);
      setPurchaseOrders(po || []);
      setTasks(t || []);
      setSalesInvoices(sales || []);
      setEmployees(emp || []);
      setShifts(shft || []);
      setComplianceRecords(comp || []);
    }).catch((err) => {
      setError(err?.message || 'Unable to load dashboard data. Please try again.');
    }).finally(() => setLoading(false));
  }, [tenantId]);

  const lowStockItems = inventoryItems.filter(i => i.par_level && i.current_stock < i.par_level);
  const pendingPOs = purchaseOrders.filter(p => ['draft', 'pending_approval'].includes(p.status));
  const pendingTasks = tasks.filter(t => ['pending', 'in_progress'].includes(t.status));
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysSales = salesInvoices.filter(s => s.date === todayStr && s.payment_status !== 'cancelled');
  const todaysRevenue = todaysSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const activeEmployees = employees.filter(e => e.status === 'active');
  const shiftsToday = shifts.filter(s => s.date === todayStr);
  const pendingCompliance = complianceRecords.filter(c => ['pending', 'in_review', 'submitted', 'overdue'].includes(c.status));

  const navModules = [
    { key: 'inventory', label: 'Inventory', icon: Package, href: `${base}/inventory`, count: inventoryItems.length, enabled: hasModule(tenant, 'inventory') },
    { key: 'procurement', label: 'Purchase Orders', icon: ShoppingCart, href: `${base}/procurement`, count: pendingPOs.length, enabled: hasModule(tenant, 'procurement') || hasModule(tenant, 'inventory') },
    { key: 'sales', label: 'Sales & Reconciliation', icon: FileText, href: `${base}/sales`, count: salesInvoices.length, enabled: hasModule(tenant, 'sales_invoice') },
    { key: 'tasks', label: 'Tasks', icon: CheckSquare, href: `${base}/tasks`, count: pendingTasks.length, enabled: hasModule(tenant, 'task') },
    { key: 'workforce', label: 'My Team', icon: Users, href: `${base}/workforce`, count: activeEmployees.length, enabled: hasModule(tenant, 'workforce') },
    { key: 'compliance', label: 'Compliance', icon: Shield, href: `${base}/compliance`, count: pendingCompliance.length, enabled: hasModule(tenant, 'compliance') },
  ].filter(m => m.enabled);

  // ── Widget registry — each team can reorder / toggle these ──
  const widgets = [
    { id: 'kpi_inventory', title: 'Inventory Items', icon: Package,
      render: () => <StatCard title="Inventory Items" value={loading ? '—' : inventoryItems.length} icon={Package} color="blue" to={`${base}/inventory`} help={{ content: "Total tracked inventory items across your outlets. Click to view the full inventory list and manage stock levels.", title: "Inventory Items" }} /> },
    { id: 'kpi_sales', title: "Today's Sales", icon: FileText,
      render: () => <StatCard title="Today's Sales" value={loading ? '—' : todaysSales.length} subtitle={`S$${todaysRevenue.toFixed(2)} revenue`} icon={FileText} color="green" to={`${base}/sales`} help={{ content: "Sales invoices recorded today and the total revenue from those transactions. Click to open daily sales reconciliation.", title: "Today's Sales" }} /> },
    { id: 'kpi_pos', title: 'Open Purchase Orders', icon: ShoppingCart,
      render: () => <StatCard title="Open Purchase Orders" value={loading ? '—' : pendingPOs.length} icon={ShoppingCart} color="amber" to={`${base}/procurement`} help={{ content: "Purchase orders in draft or pending approval status. Click to manage procurement and approve orders.", title: "Open Purchase Orders" }} /> },
    { id: 'kpi_tasks', title: 'Pending Tasks', icon: CheckSquare,
      render: () => <StatCard title="Pending Tasks" value={loading ? '—' : pendingTasks.length} icon={CheckSquare} color="purple" to={`${base}/tasks`} help={{ content: "Tasks currently pending or in progress. Click to view and manage your task list.", title: "Pending Tasks" }} /> },
    { id: 'kpi_team', title: 'Active Team', icon: Users,
      render: () => <StatCard title="Active Team Members" value={loading ? '—' : activeEmployees.length} subtitle={`${shiftsToday.length} shifts today`} icon={Users} color="blue" to={`${base}/workforce`} help={{ content: "Active employees on your team and the number of shifts scheduled for today. Click to view your workforce directory.", title: "Active Team" }} /> },
    { id: 'kpi_compliance', title: 'Pending Compliance', icon: Shield,
      render: () => <StatCard title="Pending Compliance" value={loading ? '—' : pendingCompliance.length} subtitle={pendingCompliance.length === 0 ? 'All clear' : 'Needs attention'} icon={Shield} color="amber" to={`${base}/compliance`} help={{ content: "Compliance records awaiting review, submission, or action. Click to manage compliance and audit readiness.", title: "Pending Compliance" }} /> },
    { id: 'kpi_lowstock', title: 'Low Stock Alerts', icon: AlertTriangle,
      render: () => <StatCard title="Low Stock Alerts" value={loading ? '—' : lowStockItems.length} icon={AlertTriangle} color="red" to={`${base}/inventory`} help={{ content: "Items below their par level — reorder soon to avoid stockouts. Click to view the full inventory and take action.", title: "Low Stock Alerts" }} /> },
    ...navModules.map(m => ({
      id: `mod_${m.key}`,
      title: m.label,
      icon: m.icon,
      render: () => <ModuleCard mod={m} />,
    })),
    { id: 'trust_score', title: 'Operational Trust Score', icon: Shield,
      render: () => <TrustScoreWidget tenantId={tenantId} /> },
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

      {/* ── Error State ── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Dashboard data unavailable</p>
            <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
          </div>
        </div>
      )}

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