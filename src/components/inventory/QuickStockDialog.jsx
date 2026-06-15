import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Package, Loader2 } from 'lucide-react';

export default function QuickStockDialog({ open, onOpenChange, item, onSave }) {
  const [newStock, setNewStock] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open && item) {
      setNewStock(item.current_stock?.toString() || '');
      setReason('');
    }
  }, [open, item]);

  const handleSave = async () => {
    if (!item || newStock === '') return;
    setSaving(true);
    await onSave(item, parseFloat(newStock), reason);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orbitan-blue" />
            Adjust Stock
          </DialogTitle>
        </DialogHeader>

        {item && (
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-semibold text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                Current: <span className="font-medium text-foreground">{item.current_stock} {item.unit}</span>
                {item.par_level && <span className="ml-2">Par: {item.par_level} {item.unit}</span>}
              </p>
            </div>

            <div>
              <Label className="text-xs mb-1 block">New Stock Level</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newStock}
                onChange={e => setNewStock(e.target.value)}
                placeholder={`Enter new stock (${item.unit})`}
              />
            </div>

            <div>
              <Label className="text-xs mb-1 block">Reason / Notes (optional)</Label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Stock count, waste, delivery..."
                className="h-20 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!newStock || saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                {saving ? 'Saving...' : 'Save Adjustment'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}