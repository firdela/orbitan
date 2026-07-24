// ============================================================
// SalesInvoiceList — transactional sales history (Part F: order history)
// Self-contained: fetches invoices, supports cancel/refund.
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useCurrency } from '@/lib/CurrencyContext';
import { Loader2, FileText, RotateCcw, Ban } from 'lucide-react';

export default function SalesInvoiceList({ tenantId }) {
  const { formatAmount } = useCurrency();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState(null); // { type: 'cancel'|'refund', invoice }
  const [refundAmount, setRefundAmount] = useState(0);
  const [restock, setRestock] = useState(false);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) { setInvoices([]); setLoading(false); return; }
    try {
      const data = await base44.entities.SalesInvoice.filter({ tenant_id: tenantId }, '-created_date', 50);
      setInvoices(data || []);
    } catch { setInvoices([]); } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const runAction = async () => {
    if (!action) return;
    setProcessing(true);
    try {
      const res = await base44.functions.invoke('salesEngine', {
        action: action.type,
        tenant_id: tenantId,
        invoice_id: action.invoice.id,
        amount: action.type === 'refund' ? Number(refundAmount) : 0,
        restock_finished_goods: action.type === 'refund' ? restock : false,
        reason,
      });
      const data = res.data || res;
      if (data.error) throw new Error(data.error);
      toast({ title: action.type === 'cancel' ? 'Sale Cancelled' : 'Refund Processed', description: action.invoice.invoice_number });
      setAction(null); setRefundAmount(0); setRestock(false); setReason('');
      load();
    } catch (err) {
      toast({ title: 'Action failed', description: err?.response?.data?.error || err?.message, variant: 'destructive' });
    } finally { setProcessing(false); }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2.5">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading sales…</span>
            </div>
          ) : invoices.length === 0 ? (
            <EmptyState icon={FileText} title="No sales yet" description="Complete your first sale to see transactional invoices here." color="blue" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Invoice</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Customer</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Total</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Margin</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Xero</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map(inv => {
                  const margin = inv.subtotal > 0 ? ((inv.gross_profit || 0) / inv.subtotal) * 100 : 0;
                  return (
                    <tr key={inv.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{inv.invoice_number}<div className="text-xs text-muted-foreground">{inv.date}</div></td>
                      <td className="px-4 py-3 hidden sm:table-cell">{inv.customer_name || 'Walk-in'}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatAmount(inv.total)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden md:table-cell">{margin.toFixed(0)}%</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={inv.payment_status} /></td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={inv.xero_sync_status || 'not_synced'} /></td>
                      <td className="px-4 py-3 text-right">
                        {inv.payment_status === 'paid' && (
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Refund" onClick={() => { setAction({ type: 'refund', invoice: inv }); setRefundAmount(inv.total || 0); }}>
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Cancel" onClick={() => setAction({ type: 'cancel', invoice: inv })}>
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Cancel / Refund dialog */}
      <Dialog open={!!action} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{action?.type === 'cancel' ? 'Cancel Sale' : 'Process Refund'} — {action?.invoice?.invoice_number}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {action?.type === 'refund' && (
              <>
                <div><Label className="text-xs mb-1 block">Refund Amount</Label><Input type="number" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} /></div>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={restock} onChange={e => setRestock(e.target.checked)} className="rounded" />
                  Restock finished goods (goods physically returned)
                </label>
              </>
            )}
            <div><Label className="text-xs mb-1 block">Reason</Label><Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional note…" /></div>
            <p className="text-xs text-muted-foreground">
              {action?.type === 'cancel'
                ? 'Cancellation recovers finished-goods availability (deterministic) and enqueues a credit note to finance.'
                : restock
                  ? 'Full refund with restock recovers finished-goods availability.'
                  : 'Refund without restock keeps finished goods consumed — goods are not physically returnable.'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)} disabled={processing}>Cancel</Button>
            <Button variant={action?.type === 'cancel' ? 'destructive' : 'default'} onClick={runAction} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {action?.type === 'cancel' ? 'Confirm Cancel' : 'Confirm Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}