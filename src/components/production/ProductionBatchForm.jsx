// ============================================================
// ProductionBatchForm — create + preview + confirm a production batch
// Build Package #11, Part A. Calls the productionEngine backend.
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ChefHat, AlertTriangle, CheckCircle2, Package } from 'lucide-react';
import { useCurrency } from '@/lib/CurrencyContext';

export default function ProductionBatchForm({ recipes, tenantId, outletId, onConfirmed }) {
  const { formatAmount } = useCurrency();
  const [recipeId, setRecipeId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [shelfLifeDays, setShelfLifeDays] = useState('');
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const qtyNum = Math.max(0, parseFloat(quantity) || 0);
  const selectedRecipe = useMemo(() => recipes.find(r => r.id === recipeId), [recipes, recipeId]);

  // Debounced preview as recipe/quantity changes.
  useEffect(() => {
    if (!recipeId || qtyNum <= 0) { setPreview(null); setError(''); return; }
    let cancelled = false;
    setPreviewLoading(true);
    setError('');
    const t = setTimeout(async () => {
      try {
        const res = await base44.functions.invoke('productionEngine', {
          action: 'preview',
          tenant_id: tenantId,
          outlet_id: outletId,
          recipe_id: recipeId,
          quantity: qtyNum,
        });
        if (!cancelled) setPreview(res.data || res);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || err?.message || 'Preview failed');
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [recipeId, qtyNum, tenantId, outletId]);

  const handleConfirm = async () => {
    if (!recipeId || qtyNum <= 0) return;
    setConfirming(true);
    setError('');
    try {
      const res = await base44.functions.invoke('productionEngine', {
        action: 'confirm',
        tenant_id: tenantId,
        outlet_id: outletId,
        recipe_id: recipeId,
        quantity: qtyNum,
        production_date: productionDate,
        shelf_life_days: parseFloat(shelfLifeDays) || 0,
        notes,
      });
      const data = res.data || res;
      if (data.error) throw new Error(data.error);
      onConfirmed?.(data);
      // reset
      setRecipeId(''); setQuantity(''); setShelfLifeDays(''); setNotes(''); setPreview(null);
    } catch (err) {
      const body = err?.response?.data || {};
      setError(body.error || err?.message || 'Production failed');
    } finally {
      setConfirming(false);
    }
  };

  const canConfirm = preview?.sufficient && qtyNum > 0 && !confirming;

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-5">
      <div className="flex items-center gap-2">
        <ChefHat className="w-4 h-4 text-orbitan-blue" />
        <h3 className="font-heading font-semibold text-sm">New Production Batch</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs mb-1 block">Recipe *</Label>
          <Select value={recipeId} onValueChange={setRecipeId}>
            <SelectTrigger><SelectValue placeholder="Select recipe…" /></SelectTrigger>
            <SelectContent>
              {recipes.filter(r => r.is_active !== false).map(r => (
                <SelectItem key={r.id} value={r.id}>{r.menu_item_name}</SelectItem>
              ))}
              {recipes.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1.5">No recipes — create one first.</p>}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs mb-1 block">Quantity to Produce *</Label>
          <Input type="number" min="0" value={quantity} onChange={e => setQuantity(e.target.value)}
            placeholder={selectedRecipe?.yield_unit ? `in ${selectedRecipe.yield_unit}` : 'e.g. 20 servings'} />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Production Date</Label>
          <Input type="date" value={productionDate} onChange={e => setProductionDate(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Shelf Life (days)</Label>
          <Input type="number" min="0" value={shelfLifeDays} onChange={e => setShelfLifeDays(e.target.value)} placeholder="e.g. 3" />
        </div>
      </div>

      <div>
        <Label className="text-xs mb-1 block">Notes (optional)</Label>
        <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Batch notes…" />
      </div>

      {/* Preview */}
      {previewLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Calculating ingredient consumption…
        </div>
      )}
      {preview && !previewLoading && (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="bg-muted/50 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold">Ingredient Consumption Preview</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${preview.sufficient ? 'bg-orbitan-green-light text-orbitan-green' : 'bg-orbitan-amber-light text-orbitan-amber'}`}>
              {preview.sufficient ? <><CheckCircle2 className="w-3 h-3 inline mr-1" />Sufficient</> : <><AlertTriangle className="w-3 h-3 inline mr-1" />Insufficient</>}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Ingredient</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Required</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">In Stock</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.ingredients.map((ing, i) => (
                  <tr key={i} className={ing.sufficient ? '' : 'bg-orbitan-amber-light/40'}>
                    <td className="px-4 py-2">
                      <span className="font-medium">{ing.inventory_item_name}</span>
                      <span className="text-xs text-muted-foreground ml-1">/ {ing.unit}</span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{ing.total_consumed} {ing.unit}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{ing.available_stock} {ing.unit}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatAmount(ing.line_cost, { decimals: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-muted/30 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Yield: <span className="font-semibold text-foreground">{qtyNum} {preview.yield_unit}</span></span>
            <span className="text-muted-foreground">Production Cost: <span className="font-semibold text-foreground">{formatAmount(preview.production_cost, { decimals: 2 })}</span></span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-orbitan-red-light border border-red-200 rounded-lg p-3 text-xs text-red-800">
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" />{error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => { setRecipeId(''); setQuantity(''); setPreview(null); setError(''); }}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!canConfirm}>
          {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
          Confirm Production
        </Button>
      </div>
    </div>
  );
}