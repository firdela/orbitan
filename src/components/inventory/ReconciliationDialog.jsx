import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { auditFrontend, ACTION_TYPES } from '@/lib/audit';
import { Loader2, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ReconciliationDialog({ open, onOpenChange, item, onReconciled }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [countedStock, setCountedStock] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open && item) {
      setCountedStock(item.current_stock?.toString() || '');
      setReason('');
    }
  }, [open, item]);

  if (!item) return null;

  const systemStock = item.current_stock || 0;
  const counted = parseFloat(countedStock) || 0;
  const discrepancy = counted - systemStock;
  const discrepancyPct = systemStock > 0 ? Math.round((discrepancy / systemStock) * 100) : 0;
  const hasDiscrepancy = discrepancy !== 0;
  const isSignificant = Math.abs(discrepancyPct) >= 10;

  const handleSave = async () => {
    setSaving(true);
    try {
      const tenantId = item.tenant_id || user?.data?.tenant_id;
      const outletId = item.outlet_id || user?.data?.outlet_id;

      const stockCountData = {
        tenant_id: tenantId,
        outlet_id: outletId,
        inventory_item_id: item.id,
        inventory_item_name: item.name,
        unit: item.unit,
        system_stock: systemStock,
        counted_stock: counted,
        discrepancy,
        discrepancy_pct: discrepancyPct,
        reason: reason || 'No reason provided',
        status: hasDiscrepancy && isSignificant ? 'flagged' : 'counted',
        counted_by_id: user.id,
        counted_by_name: user.full_name,
        counted_date: new Date().toISOString(),
      };

      const stockCount = await base44.entities.StockCount.create(stockCountData);

      if (hasDiscrepancy) {
        const auditEntry = await auditFrontend({
          tenant_id: tenantId,
          outlet_id: outletId,
          actor_id: user.id,
          actor_name: user.full_name,
          actor_role: user.role,
          action_type: ACTION_TYPES.STOCK_DISCREPANCY,
          module: 'inventory',
          target_entity: 'InventoryItem',
          target_record_id: item.id,
          previous_state: { current_stock: systemStock },
          new_state: { current_stock: counted, discrepancy, discrepancy_pct: discrepancyPct },
          details: `Stock reconciliation for ${item.name}: system=${systemStock}${item.unit}, counted=${counted}${item.unit}, discrepancy=${discrepancy > 0 ? '+' : ''}${discrepancy}${item.unit} (${discrepancyPct}%). Reason: ${reason || 'Not provided'}`,
          shield_outcome: isSignificant ? 'notify' : 'not_evaluated',
        });

        await base44.entities.StockCount.update(stockCount.id, {
          audit_log_id: auditEntry?.id,
          status: isSignificant ? 'flagged' : 'adjusted',
        });

        if (!isSignificant) {
          await base44.entities.InventoryItem.update(item.id, { current_stock: counted });
        }

        toast({
          title: isSignificant ? 'Discrepancy Flagged' : 'Stock Reconciled',
          description: isSignificant
            ? `Significant variance (${discrepancyPct}%) logged for audit review.`
            : `Stock updated from ${systemStock} to ${counted}${item.unit}. Discrepancy logged.`,
          variant: isSignificant ? 'destructive' : 'default',
        });
      } else {
        toast({ title: 'Count Verified', description: `${item.name}: count matches system stock.` });
      }

      onReconciled?.(item.id, counted, isSignificant);
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Reconciliation Failed', description: err?.message || 'An error occurred.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Stock Reconciliation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-muted rounded-lg p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orbitan-blue-light flex items-center justify-center">
              <span className="text-sm font-bold text-orbitan-blue">{item.name?.[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p className="font-semibold text-sm">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.category || 'No category'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">System Stock</p>
              <p className="text-xl font-display font-bold">{systemStock}</p>
              <p className="text-[10px] text-muted-foreground">{item.unit}</p>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Counted Stock</p>
              <Input
                type="number"
                value={countedStock}
                onChange={e => setCountedStock(e.target.value)}
                className="text-xl font-display font-bold text-center h-auto py-1 border-0 bg-transparent"
              />
              <p className="text-[10px] text-muted-foreground">{item.unit}</p>
            </div>
          </div>

          {hasDiscrepancy ? (
            <div className={`rounded-lg p-3 ${isSignificant ? 'bg-orbitan-red-light border border-red-200' : 'bg-orbitan-amber-light border border-amber-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                {isSignificant ? <AlertTriangle className="w-4 h-4 text-orbitan-red" /> : <AlertTriangle className="w-4 h-4 text-orbitan-amber" />}
                <span className={`text-sm font-semibold ${isSignificant ? 'text-orbitan-red' : 'text-orbitan-amber'}`}>
                  {isSignificant ? 'Significant Discrepancy' : 'Minor Discrepancy'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{systemStock}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-semibold">{counted}</span>
                <span className={`ml-2 font-bold ${discrepancy < 0 ? 'text-orbitan-red' : 'text-orbitan-green'}`}>
                  ({discrepancy > 0 ? '+' : ''}{discrepancy} · {discrepancyPct}%)
                </span>
              </div>
              {isSignificant && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Variance ≥10% — stock will be flagged for manager review. System stock will not auto-update.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-orbitan-green-light rounded-lg p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-orbitan-green" />
              <span className="text-sm font-medium text-orbitan-green">Count matches system stock</span>
            </div>
          )}

          {hasDiscrepancy && (
            <div>
              <Label className="text-xs mb-1 block">Reason for discrepancy</Label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                placeholder="e.g. Spillage, damaged goods, miscount..."
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || countedStock === ''}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Count'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}