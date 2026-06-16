import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ShoppingCart, Plus, Package, Home, Users, Calendar, FileText,
  CheckSquare, BarChart2, Shield, Layers, Building2, Trash2, ChevronDown
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

const DEMO_SUPPLIERS = [];
const DEMO_ITEMS = [];

export default function ProcurementPage() {
  const [pos, setPos] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newPO, setNewPO] = useState({ supplier_name: '', items: [{ item_name: '', quantity: '', unit: 'unit', unit_price: '', total: 0 }] });

  const updateLine = (idx, field, value) => {
    setNewPO(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        items[idx].total = (parseFloat(items[idx].quantity) || 0) * (parseFloat(items[idx].unit_price) || 0);
      }
      return { ...prev, items };
    });
  };

  const addLine = () => setNewPO(prev => ({ ...prev, items: [...prev.items, { item_name: '', quantity: '', unit: 'unit', unit_price: '', total: 0 }] }));
  const removeLine = (idx) => setNewPO(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  const subtotal = newPO.items.reduce((s, i) => s + (i.total || 0), 0);

  const handleCreate = async () => {
    const po = {
      tenant_id: "tenant_taqueria",
      outlet_id: "outlet_nb",
      po_number: `PO-2024-${String(pos.length + 4).padStart(3, '0')}`,
      supplier_name: newPO.supplier_name,
      supplier_id: "supplier_demo",
      status: 'draft',
      items: newPO.items.map(i => ({ ...i, quantity: parseFloat(i.quantity) || 0, unit_price: parseFloat(i.unit_price) || 0 })),
      total_amount: subtotal,
      created_date: new Date().toISOString().split('T')[0],
    };
    const created = await base44.entities.PurchaseOrder.create(po);
    setPos(prev => [created, ...prev]);
    setShowCreate(false);
    setNewPO({ supplier_name: '', items: [{ item_name: '', quantity: '', unit: 'unit', unit_price: '', total: 0 }] });
  };

  const updateStatus = (id, status) => {
    setPos(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  return (
    <AppShell navigation={NAV} title="">
      <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
        <PageHeader
          title="Purchase Orders"
          subtitle={`${pos.length} orders · ${pos.filter(p => p.status === 'pending_approval').length} pending approval`}
          actions={
            <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" />
              New PO
            </Button>
          }
        />

        <div className="space-y-3">
          {pos.map(po => (
            <div key={po.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-heading font-semibold text-foreground">{po.po_number}</h3>
                    <StatusBadge status={po.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{po.supplier_name} · {po.created_date}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(po.items || []).map((item, i) => (
                      <span key={i} className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                        {item.item_name} × {item.quantity} {item.unit}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-lg font-display font-bold text-foreground">S${po.total_amount?.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {po.status === 'draft' && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus(po.id, 'pending_approval')}>
                        Submit
                      </Button>
                    )}
                    {po.status === 'pending_approval' && (
                      <Button size="sm" className="text-xs" onClick={() => updateStatus(po.id, 'approved')}>
                        Approve
                      </Button>
                    )}
                    {po.status === 'approved' && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus(po.id, 'received')}>
                        Receive
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {pos.length === 0 && <EmptyState icon={ShoppingCart} title="No purchase orders" description="Create your first purchase order to get started." action={() => setShowCreate(true)} actionLabel="Create PO" />}
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-1 block">Supplier</Label>
              <Select value={newPO.supplier_name} onValueChange={v => setNewPO(p => ({ ...p, supplier_name: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {DEMO_SUPPLIERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Line Items</Label>
              <div className="space-y-2">
                {newPO.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Input placeholder="Item name" value={item.item_name} onChange={e => updateLine(idx, 'item_name', e.target.value)} className="text-xs" />
                    </div>
                    <div className="col-span-2">
                      <Input placeholder="Qty" type="number" value={item.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} className="text-xs" />
                    </div>
                    <div className="col-span-2">
                      <Input placeholder="Unit" value={item.unit} onChange={e => updateLine(idx, 'unit', e.target.value)} className="text-xs" />
                    </div>
                    <div className="col-span-2">
                      <Input placeholder="Price" type="number" value={item.unit_price} onChange={e => updateLine(idx, 'unit_price', e.target.value)} className="text-xs" />
                    </div>
                    <div className="col-span-1">
                      <button onClick={() => removeLine(idx)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2 text-xs gap-1" onClick={addLine}>
                <Plus className="w-3 h-3" />Add Line
              </Button>
            </div>

            <div className="bg-muted rounded-xl p-4 text-right">
              <p className="text-sm font-semibold">Total: <span className="text-lg font-display font-bold text-foreground">S${subtotal.toFixed(2)}</span></p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newPO.supplier_name}>Create PO</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}