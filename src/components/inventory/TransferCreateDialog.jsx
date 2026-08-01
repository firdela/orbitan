import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';

export default function TransferCreateDialog({ open, onOpenChange, editTransfer }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!editTransfer;

  const [sourceOutlet, setSourceOutlet] = useState('');
  const [destOutlet, setDestOutlet] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: outlets } = useQuery({
    queryKey: ['outlets-for-transfer'],
    queryFn: async () => base44.entities.Outlet.list('-name', 100) || [],
  });
  const { data: inventoryItems } = useQuery({
    queryKey: ['inventory-for-transfer'],
    queryFn: async () => base44.entities.InventoryItem.list('-name', 200) || [],
  });

  useEffect(() => {
    if (open) {
      if (editTransfer) {
        setSourceOutlet(editTransfer.source_outlet_id || '');
        setDestOutlet(editTransfer.destination_outlet_id || '');
        setRequiredDate(editTransfer.required_date || '');
        setNotes(editTransfer.notes || '');
        setItems((editTransfer.items || []).map((it) => ({
          inventory_item_id: it.inventory_item_id || '',
          inventory_item_name: it.inventory_item_name || '',
          requested_qty: it.requested_qty || 0,
          unit: it.unit || '',
        })));
      } else {
        setSourceOutlet(''); setDestOutlet(''); setRequiredDate(''); setNotes(''); setItems([]);
      }
      setError('');
    }
  }, [open, editTransfer]);

  const tenantId = user?.data?.tenant_id;

  const addItem = () => {
    setItems([...items, { inventory_item_id: '', inventory_item_name: '', requested_qty: 1, unit: '' }]);
  };
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx, field, value) => {
    const next = [...items];
    if (field === 'inventory_item_id') {
      const inv = (inventoryItems || []).find((i) => i.id === value);
      next[idx] = { ...next[idx], inventory_item_id: value, inventory_item_name: inv?.name || '', unit: inv?.unit || '' };
    } else {
      next[idx] = { ...next[idx], [field]: value };
    }
    setItems(next);
  };

  const validate = () => {
    if (!tenantId) { setError('No tenant context. Cannot create transfer.'); return false; }
    if (!sourceOutlet) { setError('Source outlet is required.'); return false; }
    if (!destOutlet) { setError('Destination outlet is required.'); return false; }
    if (sourceOutlet === destOutlet) { setError('Source and destination outlets must differ.'); return false; }
    if (items.length === 0) { setError('At least one item is required.'); return false; }
    if (items.some((it) => !it.inventory_item_id || it.requested_qty <= 0)) {
      setError('All items must have a selected inventory item and a positive quantity.'); return false;
    }
    return true;
  };

  const handleSave = async (submitAfter = false) => {
    if (!validate()) return;
    setSaving(true); setError('');
    try {
      const sourceName = (outlets || []).find((o) => o.id === sourceOutlet)?.name || '';
      const destName = (outlets || []).find((o) => o.id === destOutlet)?.name || '';
      const transferNumber = editTransfer?.transfer_number || `IT-${Date.now().toString().slice(-8)}`;
      const payload = {
        tenant_id: tenantId,
        source_outlet_id: sourceOutlet,
        source_outlet_name: sourceName,
        destination_outlet_id: destOutlet,
        destination_outlet_name: destName,
        transfer_number: transferNumber,
        items: items.map((it) => ({
          inventory_item_id: it.inventory_item_id,
          inventory_item_name: it.inventory_item_name,
          requested_qty: Number(it.requested_qty),
          unit: it.unit,
        })),
        status: submitAfter ? 'requested' : 'draft',
        requester_id: user?.id,
        requester_name: user?.full_name || user?.email,
        request_date: new Date().toISOString().split('T')[0],
        required_date: requiredDate || undefined,
        notes: notes || undefined,
      };

      if (isEdit) {
        await base44.entities.InventoryTransfer.update(editTransfer.id, payload);
      } else {
        await base44.entities.InventoryTransfer.create(payload);
      }
      qc.invalidateQueries({ queryKey: ['inventory-transfers'] });
      onOpenChange(false);
    } catch (e) {
      setError(e.message || 'Failed to save transfer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Transfer Draft' : 'Create Inventory Transfer'}</DialogTitle>
          <DialogDescription>Move stock between outlets. Source and destination must differ.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Source Outlet</Label>
              <Select value={sourceOutlet} onValueChange={setSourceOutlet}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select source…" /></SelectTrigger>
                <SelectContent>
                  {(outlets || []).map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Destination Outlet</Label>
              <Select value={destOutlet} onValueChange={setDestOutlet}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select destination…" /></SelectTrigger>
                <SelectContent>
                  {(outlets || []).filter((o) => o.id !== sourceOutlet).map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Required Date</Label>
            <Input type="date" value={requiredDate} onChange={(e) => setRequiredDate(e.target.value)} className="mt-1" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Transfer Items</Label>
              <Button variant="outline" size="sm" onClick={addItem} className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" /> Add Item</Button>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-md">No items added yet.</p>
            ) : (
              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Select value={it.inventory_item_id} onValueChange={(v) => updateItem(idx, 'inventory_item_id', v)}>
                      <SelectTrigger className="flex-1 text-xs"><SelectValue placeholder="Select item…" /></SelectTrigger>
                      <SelectContent>
                        {(inventoryItems || []).filter((i) => i.outlet_id === sourceOutlet || !sourceOutlet).map((i) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.current_stock} {i.unit})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" min="1" value={it.requested_qty} onChange={(e) => updateItem(idx, 'requested_qty', e.target.value)} className="w-20 text-xs" aria-label="Quantity" />
                    <span className="text-xs text-muted-foreground w-10">{it.unit || ''}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)} aria-label="Remove item">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes…" className="mt-1 text-sm" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          {!isEdit && (
            <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Draft'}
            </Button>
          )}
          {isEdit && editTransfer?.status === 'draft' && (
            <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Draft'}
            </Button>
          )}
          <Button size="sm" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEdit ? 'Save & Submit' : 'Create & Submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}