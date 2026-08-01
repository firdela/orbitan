import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2, XCircle, Truck, PackageCheck, AlertTriangle,
  ClipboardCheck, Loader2, ArrowRight, History,
} from 'lucide-react';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
  requested: { label: 'Requested', color: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approved', color: 'bg-purple-100 text-purple-700' },
  preparing: { label: 'Preparing', color: 'bg-amber-100 text-amber-700' },
  dispatched: { label: 'Dispatched', color: 'bg-orange-100 text-orange-700' },
  partially_received: { label: 'Partial', color: 'bg-yellow-100 text-yellow-700' },
  received: { label: 'Received', color: 'bg-green-100 text-green-700' },
  reconciled: { label: 'Reconciled', color: 'bg-teal-100 text-teal-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

const LIFECYCLE_FLOW = ['draft', 'requested', 'approved', 'preparing', 'dispatched', 'received', 'reconciled'];

export default function TransferDetailSheet({ transfer, open, onOpenChange, onEdit }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [actionLoading, setActionLoading] = useState(false);
  const [discrepancyOpen, setDiscrepancyOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [discrepancies, setDiscrepancies] = useState({});
  const [error, setError] = useState('');

  if (!transfer) return null;

  const cfg = STATUS_CONFIG[transfer.status] || STATUS_CONFIG.draft;
  const role = user?.role;
  const canManage = ['admin', 'tenant_admin', 'outlet_manager', 'supervisor'].includes(role);

  const refresh = () => qc.invalidateQueries({ queryKey: ['inventory-transfers'] });

  // ── Server-side transition via inventoryTransferService (Build #27H)
  // The browser does NOT authorise transitions or mutate stock directly.
  const transition = async (newStatus, opts = {}) => {
    setActionLoading(true); setError('');
    try {
      const payload = {
        action: 'transition',
        transfer_id: transfer.id,
        target_status: newStatus,
        tenant_id: user?.data?.tenant_id,
      };

      // Build receipt items if receiving
      if (discrepancyOpen && (newStatus === 'received' || newStatus === 'partially_received')) {
        payload.receipt_items = (transfer.items || []).map((it, idx) => {
          const disc = discrepancies[idx];
          const receivedQty = disc?.received_qty !== undefined
            ? Number(disc.received_qty)
            : Number(it.dispatched_qty || it.approved_qty || it.requested_qty);
          return {
            inventory_item_id: it.inventory_item_id,
            received_qty: receivedQty,
            discrepancy_reason: disc?.reason || '',
          };
        });
      }

      if (newStatus === 'cancelled') {
        payload.cancel_reason = opts.cancelReason || cancelReason || 'Cancelled by user';
      }

      const res = await base44.functions.invoke('inventoryTransferService', payload);
      const result = res?.data || res;
      if (result?.error) throw new Error(result.error);

      refresh();
      setDiscrepancyOpen(false);
      setCancelOpen(false);
      setCancelReason('');
      setDiscrepancies({});
      onOpenChange(false);
    } catch (e) {
      setError(e.message || e?.response?.data?.error || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const allFullyReceived = () => {
    if (!discrepancyOpen) return true;
    return (transfer.items || []).every((it, idx) => {
      const disc = discrepancies[idx];
      const dispatched = it.dispatched_qty || it.approved_qty || it.requested_qty;
      return disc?.received_qty !== undefined && Number(disc.received_qty) >= Number(dispatched);
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-lg">{transfer.transfer_number}</SheetTitle>
            <Badge className={cfg.color}>{cfg.label}</Badge>
          </div>
          <SheetDescription className="flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">{transfer.source_outlet_name || 'Source'}</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{transfer.destination_outlet_name || 'Destination'}</span>
          </SheetDescription>
        </SheetHeader>

        {/* Lifecycle Progress */}
        <div className="flex items-center gap-1 my-4 flex-wrap">
          {LIFECYCLE_FLOW.map((s, i) => {
            const currentIdx = LIFECYCLE_FLOW.indexOf(transfer.status);
            const isActive = i <= currentIdx;
            return (
              <React.Fragment key={s}>
                <div className={`px-2 py-1 rounded text-[10px] font-medium ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {STATUS_CONFIG[s]?.label || s}
                </div>
                {i < LIFECYCLE_FLOW.length - 1 && <div className="w-3 h-px bg-border" />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Items */}
        <div className="space-y-2 mb-4">
          <Label className="text-xs font-medium">Transfer Items</Label>
          {(transfer.items || []).map((it, idx) => (
            <div key={idx} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{it.inventory_item_name || 'Item'}</span>
                <span className="text-xs text-muted-foreground">{it.unit || ''}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><span className="text-muted-foreground">Requested:</span> {it.requested_qty}</div>
                {it.approved_qty !== undefined && it.approved_qty !== null && <div><span className="text-muted-foreground">Approved:</span> {it.approved_qty}</div>}
                {it.dispatched_qty !== undefined && it.dispatched_qty !== null && <div><span className="text-muted-foreground">Dispatched:</span> {it.dispatched_qty}</div>}
                {it.received_qty !== undefined && it.received_qty !== null && <div><span className="text-muted-foreground">Received:</span> {it.received_qty}</div>}
                {it.discrepancy_qty !== undefined && it.discrepancy_qty > 0 && (
                  <div className="col-span-3 text-destructive"><AlertTriangle className="w-3 h-3 inline mr-1" />Discrepancy: {it.discrepancy_qty} — {it.discrepancy_reason || 'No reason given'}</div>
                )}
              </div>
              {/* Discrepancy inputs */}
              {discrepancyOpen && (transfer.status === 'dispatched' || transfer.status === 'partially_received') && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                  <div>
                    <Label className="text-[10px]">Received Qty</Label>
                    <Input type="number" min="0" defaultValue={it.received_qty ?? ''} onChange={(e) => setDiscrepancies((p) => ({ ...p, [idx]: { ...p[idx], received_qty: e.target.value } }))} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Discrepancy Reason</Label>
                    <Input defaultValue={it.discrepancy_reason || ''} onChange={(e) => setDiscrepancies((p) => ({ ...p, [idx]: { ...p[idx], reason: e.target.value } }))} className="h-7 text-xs" placeholder="Optional…" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Metadata */}
        <div className="space-y-1 text-xs text-muted-foreground border-t border-border pt-3">
          {transfer.requester_name && <div>Requested by: {transfer.requester_name}</div>}
          {transfer.request_date && <div>Request date: {new Date(transfer.request_date).toLocaleDateString()}</div>}
          {transfer.required_date && <div>Required by: {new Date(transfer.required_date).toLocaleDateString()}</div>}
          {transfer.approver_name && <div>Approved by: {transfer.approver_name}</div>}
          {transfer.dispatcher_name && <div>Dispatched by: {transfer.dispatcher_name}</div>}
          {transfer.receiver_name && <div>Received by: {transfer.receiver_name}</div>}
          {transfer.notes && <div className="pt-1">Notes: {transfer.notes}</div>}
        </div>

        {error && <p className="text-sm text-destructive mt-2">{error}</p>}

        {/* Lifecycle Actions */}
        {canManage && transfer.status !== 'cancelled' && transfer.status !== 'reconciled' && (
          <>
            <Separator className="my-4" />
            <div className="flex flex-wrap gap-2">
              {transfer.status === 'draft' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => { onEdit(transfer); onOpenChange(false); }}>Edit Draft</Button>
                  <Button size="sm" onClick={() => transition('requested')} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Request'}
                  </Button>
                </>
              )}
              {transfer.status === 'requested' && (
                <>
                  <Button size="sm" onClick={() => transition('approved')} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1" /> Approve</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => transition('cancelled', { cancelReason: 'Request rejected' })} disabled={actionLoading}>
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </>
              )}
              {transfer.status === 'approved' && (
                <Button size="sm" onClick={() => transition('preparing')} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark Preparing'}
                </Button>
              )}
              {transfer.status === 'preparing' && (
                <Button size="sm" onClick={() => transition('dispatched')} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Truck className="w-4 h-4 mr-1" /> Dispatch</>}
                </Button>
              )}
              {(transfer.status === 'dispatched' || transfer.status === 'partially_received') && (
                <>
                  {!discrepancyOpen && (
                    <Button size="sm" variant="outline" onClick={() => setDiscrepancyOpen(true)}>
                      <AlertTriangle className="w-4 h-4 mr-1" /> Record Receipt
                    </Button>
                  )}
                  {discrepancyOpen && (
                    <>
                      <Button size="sm" onClick={() => transition(allFullyReceived() ? 'received' : 'partially_received')} disabled={actionLoading}>
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><PackageCheck className="w-4 h-4 mr-1" /> Confirm Receipt</>}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDiscrepancyOpen(false)}>Cancel</Button>
                    </>
                  )}
                </>
              )}
              {transfer.status === 'received' && (
                <Button size="sm" onClick={() => transition('reconciled')} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ClipboardCheck className="w-4 h-4 mr-1" /> Reconcile</>}
                </Button>
              )}
              {transfer.status !== 'draft' && transfer.status !== 'received' && transfer.status !== 'reconciled' && !cancelOpen && (
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCancelOpen(true)}>Cancel Transfer</Button>
              )}
              {cancelOpen && (
                <div className="w-full space-y-2">
                  <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Reason for cancellation…" className="text-sm" rows={2} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => transition('cancelled')} disabled={actionLoading}>Confirm Cancel</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setCancelOpen(false); setCancelReason(''); }}>Dismiss</Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}