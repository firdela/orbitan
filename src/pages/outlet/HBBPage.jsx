import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  ShoppingCart, Plus, Package, Home, Users, Calendar, FileText,
  CheckSquare, BarChart2, Shield, Layers, Building2, Trash2, Loader2, Cake, ClipboardList
} from 'lucide-react';

const NAV = [
  { type: 'section', label: 'Outlet' },
  { href: '/outlet', icon: Home, label: 'Dashboard' },
  { href: '/outlet/hbb', icon: Cake, label: 'Orders & Production' },
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

export default function HBBPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const tenantId = user?.data?.tenant_id || user?.tenant_id || null;
  const outletId = user?.data?.outlet_id || user?.outlet_id || null;

  const [orders, setOrders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOrder, setShowOrder] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);

  const [newOrder, setNewOrder] = useState({
    customer_name: '', customer_email: '',
    line_items: [{ description: '', quantity: '', unit_price: '', total: 0 }],
    payment_method: 'transfer',
  });
  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '', priority: 'medium' });

  useEffect(() => {
    if (!tenantId || !outletId) { setLoading(false); return; }
    Promise.all([
      base44.entities.SalesInvoice.filter({ tenant_id: tenantId, outlet_id: outletId }, '-created_date', 50).catch(() => []),
      base44.entities.Task.filter({ tenant_id: tenantId, outlet_id: outletId, module_context: 'hbb_production' }, '-created_date', 50).catch(() => []),
    ]).then(([ord, tsk]) => {
      setOrders(ord || []);
      setTasks(tsk || []);
    }).finally(() => setLoading(false));
  }, [tenantId, outletId]);

  const orderSubtotal = newOrder.line_items.reduce((s, i) => s + (i.total || 0), 0);

  const updateOrderLine = (idx, field, value) => {
    setNewOrder(prev => {
      const items = [...prev.line_items];
      items[idx] = { ...items[idx], [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        items[idx].total = (parseFloat(items[idx].quantity) || 0) * (parseFloat(items[idx].unit_price) || 0);
      }
      return { ...prev, line_items: items };
    });
  };
  const addOrderLine = () => setNewOrder(p => ({ ...p, line_items: [...p.line_items, { description: '', quantity: '', unit_price: '', total: 0 }] }));
  const removeOrderLine = (idx) => setNewOrder(p => ({ ...p, line_items: p.line_items.filter((_, i) => i !== idx) }));

  const handleCreateOrder = async () => {
    setCreatingOrder(true);
    try {
      const inv = {
        tenant_id: tenantId, outlet_id: outletId,
        invoice_number: `ORD-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`,
        date: new Date().toISOString().split('T')[0],
        customer_name: newOrder.customer_name,
        customer_email: newOrder.customer_email,
        line_items: newOrder.line_items.map(i => ({ ...i, quantity: parseFloat(i.quantity) || 0, unit_price: parseFloat(i.unit_price) || 0 })),
        subtotal: orderSubtotal, total: orderSubtotal,
        payment_method: newOrder.payment_method,
        payment_status: 'pending',
      };
      const created = await base44.entities.SalesInvoice.create(inv);
      setOrders(prev => [created, ...prev]);
      setShowOrder(false);
      setNewOrder({ customer_name: '', customer_email: '', line_items: [{ description: '', quantity: '', unit_price: '', total: 0 }], payment_method: 'transfer' });
      toast({ title: 'Order Created', description: `${inv.invoice_number} for ${inv.customer_name}` });
    } catch (err) {
      toast({ title: 'Failed to create order', description: err?.response?.data?.error || err?.message, variant: 'destructive' });
    } finally { setCreatingOrder(false); }
  };

  const handleCreateTask = async () => {
    setCreatingTask(true);
    try {
      const task = {
        tenant_id: tenantId, outlet_id: outletId,
        title: newTask.title, description: newTask.description,
        due_date: newTask.due_date, priority: newTask.priority,
        status: 'pending', module_context: 'hbb_production',
        category: 'production',
      };
      const created = await base44.entities.Task.create(task);
      setTasks(prev => [created, ...prev]);
      setShowTask(false);
      setNewTask({ title: '', description: '', due_date: '', priority: 'medium' });
      toast({ title: 'Production Task Added', description: task.title });
    } catch (err) {
      toast({ title: 'Failed to create task', description: err?.response?.data?.error || err?.message, variant: 'destructive' });
    } finally { setCreatingTask(false); }
  };

  const toggleTaskStatus = async (id, currentStatus) => {
    const next = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await base44.entities.Task.update(id, { status: next, completed_date: next === 'completed' ? new Date().toISOString() : null });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: next } : t));
    } catch (err) {
      toast({ title: 'Update failed', description: err?.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <AppShell navigation={NAV} title="">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell navigation={NAV} title="">
      <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
        <PageHeader
          title="Orders & Production"
          subtitle="Home-Based Business pack — customer orders and production planning"
          actions={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowTask(true)}>
                <ClipboardList className="w-4 h-4" /> New Production Task
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => setShowOrder(true)}>
                <Plus className="w-4 h-4" /> New Order
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Customer Orders ── */}
          <div>
            <h3 className="text-sm font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
              <Cake className="w-4 h-4 text-primary" /> Customer Orders
              <span className="text-muted-foreground font-normal">({orders.length})</span>
            </h3>
            <div className="space-y-2">
              {orders.map(o => (
                <div key={o.id} className="bg-card border border-border rounded-xl px-4 py-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-heading font-semibold text-sm text-foreground">{o.invoice_number}</span>
                    <StatusBadge status={o.payment_status} />
                  </div>
                  <p className="text-sm text-foreground">{o.customer_name}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(o.line_items || []).map((item, i) => (
                      <span key={i} className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                        {item.description} ×{item.quantity}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm font-display font-bold text-foreground mt-1.5">S${(o.total || 0).toFixed(2)}</p>
                </div>
              ))}
              {orders.length === 0 && <EmptyState icon={Cake} title="No orders yet" description="Create your first customer order." action={() => setShowOrder(true)} actionLabel="New Order" />}
            </div>
          </div>

          {/* ── Production Planning ── */}
          <div>
            <h3 className="text-sm font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" /> Production Planning
              <span className="text-muted-foreground font-normal">({tasks.length})</span>
            </h3>
            <div className="space-y-2">
              {tasks.map(t => (
                <div key={t.id} className="bg-card border border-border rounded-xl px-4 py-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-heading font-semibold text-sm text-foreground">{t.title}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    {t.due_date && <span className="text-[10px] text-muted-foreground">Due: {t.due_date}</span>}
                    <Button size="sm" variant="ghost" className="text-xs h-6 px-2 ml-auto" onClick={() => toggleTaskStatus(t.id, t.status)}>
                      {t.status === 'completed' ? 'Reopen' : 'Mark Done'}
                    </Button>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && <EmptyState icon={ClipboardList} title="No production tasks" description="Plan what to bake and when." action={() => setShowTask(true)} actionLabel="New Task" />}
            </div>
          </div>
        </div>
      </div>

      {/* ── Create Order Dialog ── */}
      <Dialog open={showOrder} onOpenChange={setShowOrder}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Customer Order</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Customer Name</Label>
                <Input value={newOrder.customer_name} onChange={e => setNewOrder(p => ({ ...p, customer_name: e.target.value }))} placeholder="e.g. Siti Aminah" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Customer Email (optional)</Label>
                <Input value={newOrder.customer_email} onChange={e => setNewOrder(p => ({ ...p, customer_email: e.target.value }))} placeholder="email@example.com" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Order Items</Label>
              <div className="space-y-2">
                {newOrder.line_items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6"><Input placeholder="Item description" value={item.description} onChange={e => updateOrderLine(idx, 'description', e.target.value)} className="text-xs" /></div>
                    <div className="col-span-2"><Input placeholder="Qty" type="number" value={item.quantity} onChange={e => updateOrderLine(idx, 'quantity', e.target.value)} className="text-xs" /></div>
                    <div className="col-span-3"><Input placeholder="Unit Price" type="number" value={item.unit_price} onChange={e => updateOrderLine(idx, 'unit_price', e.target.value)} className="text-xs" /></div>
                    <div className="col-span-1"><button onClick={() => removeOrderLine(idx)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button></div>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2 text-xs gap-1" onClick={addOrderLine}><Plus className="w-3 h-3" />Add Line</Button>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Payment Method</Label>
              <Select value={newOrder.payment_method} onValueChange={v => setNewOrder(p => ({ ...p, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">Bank Transfer</SelectItem>
                  <SelectItem value="paynow">PayNow</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted rounded-xl p-4 text-right">
              <p className="text-sm font-semibold">Total: <span className="text-lg font-display font-bold text-foreground">S${orderSubtotal.toFixed(2)}</span></p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowOrder(false)}>Cancel</Button>
            <Button onClick={handleCreateOrder} disabled={!newOrder.customer_name || creatingOrder}>
              {creatingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Order'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create Production Task Dialog ── */}
      <Dialog open={showTask} onOpenChange={setShowTask}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Production Task</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-1 block">What needs to be produced?</Label>
              <Input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Bake 5 jars of Kuih Makmur" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Notes (optional)</Label>
              <Input value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} placeholder="e.g. For Siti Aminah's Hari Raya order" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Due Date</Label>
                <Input type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Priority</Label>
                <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowTask(false)}>Cancel</Button>
            <Button onClick={handleCreateTask} disabled={!newTask.title || creatingTask}>
              {creatingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Task'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}