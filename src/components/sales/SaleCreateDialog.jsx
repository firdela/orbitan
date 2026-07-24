// ============================================================
// SaleCreateDialog — POS-style sale entry (Build Package #12, Part F)
// Trigger button + dialog. Calls salesEngine.
// ============================================================
import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useCurrency } from '@/lib/CurrencyContext';
import { ShoppingCart, Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';

export default function SaleCreateDialog({ tenantId, outletId, onCreated }) {
  const { formatAmount } = useCurrency();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [lines, setLines] = useState([{ recipe_id: '', quantity: 1, unit_price: 0, discount: 0 }]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [taxPct, setTaxPct] = useState(8);
  const [servicePct, setServicePct] = useState(10);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && tenantId) {
      setLoadingRecipes(true);
      base44.entities.Recipe.filter({ tenant_id: tenantId, is_active: true }, '-updated_date', 200)
        .then(d => setRecipes(d || []))
        .catch(() => setRecipes([]))
        .finally(() => setLoadingRecipes(false));
    }
  }, [open, tenantId]);

  const recipeMap = useMemo(() => new Map(recipes.map(r => [r.id, r])), [recipes]);

  const subtotal = lines.reduce((s, l) => {
    const r = recipeMap.get(l.recipe_id);
    const up = Number(l.unit_price) || r?.selling_price || 0;
    return s + Math.max(0, up * (Number(l.quantity) || 0) - (Number(l.discount) || 0));
  }, 0);
  const taxable = Math.max(0, subtotal - (Number(orderDiscount) || 0));
  const taxAmount = taxable * (Number(taxPct) || 0) / 100;
  const serviceCharge = taxable * (Number(servicePct) || 0) / 100;
  const total = taxable + taxAmount + serviceCharge;
  const cogs = lines.reduce((s, l) => {
    const r = recipeMap.get(l.recipe_id);
    return s + (r?.total_cogs || 0) * (Number(l.quantity) || 0);
  }, 0);
  const grossProfit = subtotal - cogs;
  const margin = subtotal > 0 ? (grossProfit / subtotal) * 100 : 0;

  const updateLine = (i, field, value) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  const addLine = () => setLines(prev => [...prev, { recipe_id: '', quantity: 1, unit_price: 0, discount: 0 }]);
  const removeLine = (i) => setLines(prev => prev.filter((_, idx) => idx !== i));

  const reset = () => { setLines([{ recipe_id: '', quantity: 1, unit_price: 0, discount: 0 }]); setCustomerName('Walk-in Customer'); setOrderDiscount(0); setError(''); };

  const handleCreate = async () => {
    const validLines = lines.filter(l => l.recipe_id && Number(l.quantity) > 0);
    if (validLines.length === 0) { setError('Add at least one item with quantity.'); return; }
    setCreating(true); setError('');
    try {
      const res = await base44.functions.invoke('salesEngine', {
        action: 'create', tenant_id: tenantId, outlet_id: outletId,
        line_items: validLines.map(l => {
          const r = recipeMap.get(l.recipe_id);
          return { recipe_id: l.recipe_id, quantity: Number(l.quantity), unit_price: Number(l.unit_price) || r?.selling_price || 0, discount: Number(l.discount) || 0 };
        }),
        customer_name: customerName, payment_method: paymentMethod,
        tax_pct: Number(taxPct) || 0, service_charge_pct: Number(servicePct) || 0,
        order_discount: Number(orderDiscount) || 0,
      });
      const data = res.data || res;
      if (data.error) throw new Error(data.error);
      toast({ title: 'Sale Completed', description: `${data.invoice?.invoice_number} — ${formatAmount(data.invoice?.total || 0)}${data.finance_queued ? ' · finance queued' : ''}` });
      reset(); setOpen(false);
      onCreated?.(data);
    } catch (err) {
      const body = err?.response?.data || {};
      setError(body.error || err?.message || 'Sale failed');
    } finally { setCreating(false); }
  };

  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <ShoppingCart className="w-4 h-4" /> New Sale
      </Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-orbitan-blue" /> New Sale (POS)</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Customer</Label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in Customer" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['cash', 'card', 'transfer', 'paynow', 'other'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Order Items</Label>
              <div className="space-y-2">
                {lines.map((l, i) => {
                  const r = recipeMap.get(l.recipe_id);
                  const up = Number(l.unit_price) || r?.selling_price || 0;
                  return (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <Select value={l.recipe_id} onValueChange={v => { updateLine(i, 'recipe_id', v); const rr = recipeMap.get(v); if (rr) updateLine(i, 'unit_price', rr.selling_price || 0); }}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Select menu item…" /></SelectTrigger>
                          <SelectContent>
                            {loadingRecipes ? <p className="text-xs px-2 py-1.5 text-muted-foreground">Loading…</p> :
                              recipes.map(rr => <SelectItem key={rr.id} value={rr.id}>{rr.menu_item_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2"><Input type="number" min="1" value={l.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} className="text-xs" placeholder="Qty" /></div>
                      <div className="col-span-2"><Input type="number" value={up} onChange={e => updateLine(i, 'unit_price', e.target.value)} className="text-xs" placeholder="Price" /></div>
                      <div className="col-span-2"><Input type="number" value={l.discount} onChange={e => updateLine(i, 'discount', e.target.value)} className="text-xs" placeholder="Disc" /></div>
                      <div className="col-span-1">{lines.length > 1 && <button onClick={() => removeLine(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>}</div>
                    </div>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" className="mt-2 text-xs gap-1" onClick={addLine}><Plus className="w-3 h-3" />Add Item</Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs mb-1 block">Tax %</Label><Input type="number" value={taxPct} onChange={e => setTaxPct(e.target.value)} className="text-xs" /></div>
              <div><Label className="text-xs mb-1 block">Service Charge %</Label><Input type="number" value={servicePct} onChange={e => setServicePct(e.target.value)} className="text-xs" /></div>
              <div><Label className="text-xs mb-1 block">Order Discount</Label><Input type="number" value={orderDiscount} onChange={e => setOrderDiscount(e.target.value)} className="text-xs" /></div>
            </div>

            <div className="bg-muted rounded-xl p-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatAmount(subtotal, { decimals: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax ({taxPct}%)</span><span className="tabular-nums">{formatAmount(taxAmount, { decimals: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Service ({servicePct}%)</span><span className="tabular-nums">{formatAmount(serviceCharge, { decimals: 2 })}</span></div>
              <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1"><span>Total</span><span className="tabular-nums">{formatAmount(total, { decimals: 2 })}</span></div>
              <div className="flex justify-between text-xs text-muted-foreground pt-1"><span>COGS / GP / Margin</span><span className="tabular-nums">{formatAmount(cogs, { decimals: 2 })} · {formatAmount(grossProfit, { decimals: 2 })} · {margin.toFixed(1)}%</span></div>
            </div>

            {error && <div className="bg-orbitan-red-light border border-red-200 rounded-lg p-3 text-xs text-red-800"><AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" />{error}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              Complete Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}