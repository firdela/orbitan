import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, XCircle, AlertTriangle, Eye, FileText,
  ShoppingCart, Receipt, Clock, Shield, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import DocumentReviewModal from './DocumentReviewModal';

const PROCESSING_STATUS_CONFIG = {
  awaiting_evidence: { label: 'Awaiting Evidence', color: '#9CA3AF', bg: '#F3F4F6', icon: Clock },
  raw:               { label: 'Pending Review',    color: '#D97706', bg: '#FEF3C7', icon: Clock },
  needs_review:      { label: 'Needs Review',      color: '#DC2626', bg: '#FEF2F2', icon: AlertTriangle },
  ai_processing:     { label: 'AI Processing',     color: '#2563EB', bg: '#DBEAFE', icon: RefreshCw },
  verified:          { label: 'Verified',           color: '#16A34A', bg: '#DCFCE7', icon: CheckCircle2 },
  rejected:          { label: 'Rejected',           color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
};

function ConfidenceBadge({ score }) {
  if (!score && score !== 0) return <span className="text-xs text-muted-foreground">—</span>;
  const color = score >= 85 ? '#16A34A' : score >= 60 ? '#D97706' : '#DC2626';
  const bg    = score >= 85 ? '#DCFCE7' : score >= 60 ? '#FEF3C7' : '#FEF2F2';
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border"
      style={{ color, background: bg, borderColor: bg }}>
      {score < 85 && <AlertTriangle className="w-3 h-3" />}
      {score}%
    </span>
  );
}

function RecordRow({ record, type, onReview }) {
  const status = PROCESSING_STATUS_CONFIG[record.processing_status] || PROCESSING_STATUS_CONFIG.raw;
  const StatusIcon = status.icon;
  const isFlagged = record.ai_confidence_score < 85 && record.ai_confidence_score != null;
  const missingDoc = !record.document_url;

  return (
    <div className={`flex items-center gap-3 px-5 py-3.5 border-b border-border last:border-0 hover:bg-accent/30 transition-colors ${isFlagged || missingDoc ? 'bg-amber-50/40' : ''}`}>
      {/* Type icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${type === 'po' ? 'bg-orange-50' : 'bg-blue-50'}`}>
        {type === 'po'
          ? <ShoppingCart className="w-4 h-4 text-[#F97316]" />
          : <Receipt className="w-4 h-4 text-primary" />
        }
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground truncate">
            {type === 'po' ? record.supplier_name || 'Unknown Supplier' : record.customer_name || 'Walk-in'}
          </p>
          {missingDoc && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 border border-red-200">
              NO DOCUMENT
            </span>
          )}
          {isFlagged && !missingDoc && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
              LOW CONFIDENCE
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {type === 'po' ? record.po_number || 'No PO#' : record.invoice_number || 'No Inv#'}
          {' · '}
          {record.created_date ? format(new Date(record.created_date), 'dd MMM yyyy') : '—'}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-foreground">
          S${((type === 'po' ? record.total_amount : record.total) || 0).toFixed(2)}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase">{type === 'po' ? 'PO Total' : 'Invoice'}</p>
      </div>

      {/* AI Confidence */}
      <div className="flex-shrink-0 w-16 text-center hidden sm:block">
        <ConfidenceBadge score={record.ai_confidence_score} />
      </div>

      {/* Status */}
      <div className="flex-shrink-0 hidden md:block">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
          style={{ color: status.color, background: status.bg }}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
      </div>

      {/* Action */}
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-xs flex-shrink-0"
        onClick={() => onReview(record, type)}
      >
        <Eye className="w-3.5 h-3.5" />
        Review
      </Button>
    </div>
  );
}

export default function FinanceReviewQueue({ tenantId, outletId }) {
  const [reviewTarget, setReviewTarget] = useState(null);
  const queryClient = useQueryClient();

  // Build filter — outlet_id is optional so tenant_admins can see
  // ALL outlets' pending reviews, not just one. This makes the inbox
  // work at both outlet-manager and tenant_admin scope.
  const buildReviewFilter = () => {
    const filter = {
      tenant_id: tenantId,
      processing_status: { $in: ['awaiting_evidence', 'raw', 'needs_review', 'ai_processing'] }
    };
    if (outletId) filter.outlet_id = outletId;
    return filter;
  };

  const { data: purchaseOrders = [], isLoading: loadingPOs } = useQuery({
    queryKey: ['po-review', tenantId, outletId],
    queryFn: () => base44.entities.PurchaseOrder.filter(buildReviewFilter(), '-created_date', 50),
    enabled: !!tenantId,
  });

  const { data: salesInvoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoice-review', tenantId, outletId],
    queryFn: () => base44.entities.SalesInvoice.filter(buildReviewFilter(), '-created_date', 50),
    enabled: !!tenantId,
  });

  const isLoading = loadingPOs || loadingInvoices;
  const totalPending = purchaseOrders.length + salesInvoices.length;
  const missingDocs = [...purchaseOrders, ...salesInvoices].filter(r => !r.document_url).length;
  const flagged = [...purchaseOrders, ...salesInvoices].filter(r => r.ai_confidence_score != null && r.ai_confidence_score < 85).length;

  const handleReviewClose = () => {
    setReviewTarget(null);
    queryClient.invalidateQueries({ queryKey: ['po-review'] });
    queryClient.invalidateQueries({ queryKey: ['invoice-review'] });
  };

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{isLoading ? '…' : totalPending}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pending Review</p>
        </div>
        <div className="bg-card border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-display font-bold text-red-600">{isLoading ? '…' : missingDocs}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Missing Document</p>
        </div>
        <div className="bg-card border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-display font-bold text-amber-600">{isLoading ? '…' : flagged}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Low AI Confidence</p>
        </div>
      </div>

      {/* Queue */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#F97316]" />
            <h3 className="font-heading font-semibold text-foreground text-sm">Document Review Queue</h3>
            {totalPending > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F97316] text-white">{totalPending}</span>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-6 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide pr-2">
            <span className="w-16 text-center">AI Score</span>
            <span className="w-24">Status</span>
            <span className="w-16">Action</span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Loading queue…</div>
        ) : totalPending === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-[#16A34A] mx-auto mb-3 opacity-60" />
            <p className="text-sm font-medium text-foreground">Queue is clear</p>
            <p className="text-xs text-muted-foreground mt-1">All documents are verified and ready for Xero sync.</p>
          </div>
        ) : (
          <div>
            {purchaseOrders.length > 0 && (
              <>
                <div className="px-5 py-2 bg-orange-50/60 border-b border-border">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#F97316]">Purchase Orders ({purchaseOrders.length})</p>
                </div>
                {purchaseOrders.map(po => (
                  <RecordRow key={po.id} record={po} type="po" onReview={setReviewTarget} />
                ))}
              </>
            )}
            {salesInvoices.length > 0 && (
              <>
                <div className="px-5 py-2 bg-blue-50/60 border-b border-border">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Sales Invoices ({salesInvoices.length})</p>
                </div>
                {salesInvoices.map(inv => (
                  <RecordRow key={inv.id} record={inv} type="invoice" onReview={setReviewTarget} />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewTarget && (
        <DocumentReviewModal
          record={reviewTarget.record || reviewTarget}
          type={reviewTarget.type || reviewTarget}
          onClose={handleReviewClose}
        />
      )}
    </div>
  );
}