import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
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
  ShoppingCart, Plus, Trash2, Loader2
} from 'lucide-react';
import { ShieldGuard } from '@/lib/ShieldGuard';
import GovernanceOverrideModal from '@/components/shield/GovernanceOverrideModal';

export default function ProcurementPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [pos, setPos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [receivingId, setReceivingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newPO, setNewPO] = useState({ supplier_id: '', supplier_name: '', items: [{ item_name: '', quantity: '', unit: 'unit', unit_price: '', total: 0 }] });
  const [overrideContext, setOverrideContext] = useState(null);
  const [loading, setLoading] = useState(true);

  const tenantId = user?.data?.tenant_id || user?.tenant_id || null;
  const outletId = user?.data?.outlet_id || user?.outlet_id || null;

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

  useEffect(() => {
    Promise.all([
      base44.entities.PurchaseOrder.list('-created_date', 50),
      base44.entities.Supplier.list('-created_date', 50),
    ])
      .then(([poData, supData]) => {
        setPos(poData || []);
        setSuppliers(supData || []);
      })
      .catch(() => {
        setPos([]);
        setSuppliers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const addLine = () => setNewPO(prev => ({ ...prev, items: [...prev.items, { item_name: '', quantity: '', unit: 'unit', unit_price: '', total: 0 }] }));
  const removeLine = (idx) => setNewPO(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  const subtotal = newPO.items.reduce((s, i) => s + (i.total || 0), 0);

  const handleCreate = async () => {
    if (!tenantId || !outletId) {
      toast({ title: 'Cannot create PO', description: 'Your user profile is missing tenant or outlet assignment.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      // ── Shield evaluation before creating the PO ──
      const shieldResult = await ShieldGuard.check(base44, {
        entity_name: 'PurchaseOrder',
        action: 'create',
        data: { ...newPO, total_amount: subtotal, tenant_id: tenantId, outlet_id: outletId },
        tenant_id: tenantId,
      });

      if (!shieldResult.allowed) {
        setOverrideContext(shieldResult.override_context);
        toast({
          title: 'Action Blocked by Shield',
          description: shieldResult.reason || 'This action requires manager approval.',
          variant: 'destructive',
        });
        return;
      }

      const po = {
        tenant_id: tenantId,
        outlet_id: outletId,
        po_number: `PO-${new Date().getFullYear()}-${String(pos.length + 1).padStart(3, '0')}`,
        supplier_name: newPO.supplier_name,
        supplier_id: newPO.supplier_id,
        status: 'draft',
        items: newPO.items.map(i => ({ ...i, quantity: parseFloat(i.quantity) || 0, unit_price: parseFloat(i.unit_price) || 0 })),
        subtotal,
        total_amount: subtotal,
        requested_date: new Date().toISOString().split('T')[0],
      };
      const created = await base44.entities.PurchaseOrder.create(po);
      setPos(prev => [created, ...prev]);
      setShowCreate(false);
      setNewPO({ supplier_id: '', supplier_name: '', items: [{ item_name: '', quantity: '', unit: 'unit', unit_price: '', total: 0 }] });
      toast({ title: 'Purchase Order Created', description: `${po.po_number} saved as draft.` });
    } catch (err) {
      toast({ title: 'Failed to create PO', description: err?.response?.data?.error || err?.message || 'An error occurred.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (id, status) => {
    // ── Shield evaluation for governance-sensitive status transitions ──
    if (status === 'received' || status === 'approved') {
      const poRecord = pos.find(p => p.id === id);
      const shieldResult = await ShieldGuard.check(base44, {
        entity_name: 'PurchaseOrder',
        action: 'update',
        data: { id, status, total_amount: poRecord?.total_amount, tenant_id: poRecord?.tenant_id },
        tenant_id: poRecord?.tenant_id || tenantId,
      });

      if (!shieldResult.allowed) {
        setOverrideContext(shieldResult.override_context);
        toast({
          title: 'Governance Threshold Exceeded',
          description: shieldResult.reason || 'This action requires manager approval.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Persist status change to database
    await base44.entities.PurchaseOrder.update(id, { status });
    setPos(prev => prev.map(p => p.id === id ? { ...p, status } : p));

    // When a PO is received, post the procurement debit to the Wallet-Native Ledger
    if (status === 'received') {
      const po = pos.find(p => p.id === id);
      if (!po) return;
      setReceivingId(id);
      try {
        const res = await base44.functions.invoke('walletEngine', {
          action: 'debit_procurement_sgd',
          tenant_id: po.tenant_id,
          outlet_id: po.outlet_id,
          amount: po.total_amount || 0,
          reference_id: po.id,
          reference_type: 'PurchaseOrder',
          metadata: {
            po_number: po.po_number,
            supplier_name: po.supplier_name,
            supplier_id: po.supplier_id,
            items: po.items,
          },
        });
        const data = res.data || res;
        if (data.above_threshold) {
          toast({
            title: 'Governance Threshold Exceeded',
            description: `PO SGD ${po.total_amount?.toFixed(2)} exceeds threshold (SGD ${data.threshold_applied}). Manager approval required.`,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Goods Received — Wallet Debited',
            description: `SGD ${po.total_amount?.toFixed(2)} posted to wallet ledger. Threshold: SGD ${data.threshold_applied}.`,
          });
        }
      } catch (err) {
        toast({
          title: 'Wallet Debit Failed',
          description: err?.response?.data?.error || err?.message || 'Could not post procurement debit to wallet.',
          variant: 'destructive',
        });
      } finally {
        setReceivingId(null);
      }
    }
  };

  const isApprover = ['admin', 'tenant_admin', 'outlet_manager'].includes(user?.role);
  const pendingApprovalCount = pos.filter(p => p.status === 'pending_approval').length;
  const totalPendingValue = pos.filter(p => p.status === 'pending_approval').reduce((s, p) => s + (p.total_amount || 0), 0);

  return (
    <>
      <GovernanceOverrideModal
        open={!!overrideContext}
        onOpenChange={(open) => { if (!open) setOverrideContext(null); }}
        overrideContext={overrideContext}
        onSuccess={() => setOverrideContext(null)}
      />
      <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
        <PageHeader
          title="Purchase Orders"
          subtitle={`${pos.length} orders · ${pendingApprovalCount} pending approval${pendingApprovalCount > 0 ? ` · S$${totalPendingValue.toFixed(2)} awaiting review` : ''}`}
          help={{
            title: 'Purchase Orders',
            content: 'Create and manage orders to your suppliers. Each PO moves through Draft → Pending Approval → Approved → Received, and the Shield enforces a governance threshold on spend.',
            tips: [
              'Submit a draft PO for manager approval before it can be received.',
              'Receiving a PO posts the spend to your wallet ledger automatically.',
              'POs above your governance threshold require an override approval.',
            ],
          }}
          actions={
            <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" />
              New PO
            </Button>
          }
        />

        <div className="space-y-3">
          {loading && (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
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
                    {po.status === 'pending_approval' && ['admin', 'tenant_admin', 'outlet_manager'].includes(user?.role) && (
                      <Button size="sm" className="text-xs" onClick={() => updateStatus(po.id, 'approved')}>
                        Approve
                      </Button>
                    )}
                    {po.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        disabled={receivingId === po.id}
                        onClick={() => updateStatus(po.id, 'received')}
                      >
                        {receivingId === po.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Receive'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!loading && pos.length === 0 && <EmptyState icon={ShoppingCart} title="No purchase orders" description="Create your first purchase order to get started." onAction={() => setShowCreate(true)} actionLabel="Create PO" />}
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
              <Select value={newPO.supplier_id} onValueChange={v => {
                const s = suppliers.find(sup => sup.id === v);
                setNewPO(p => ({ ...p, supplier_id: v, supplier_name: s?.name || v }));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}{s.is_preferred ? ' ★' : ''}</SelectItem>)}
                  {suppliers.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1.5">No suppliers yet — add them in the Supplier directory.</p>}
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
            <Button onClick={handleCreate} disabled={!newPO.supplier_id || creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create PO'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}