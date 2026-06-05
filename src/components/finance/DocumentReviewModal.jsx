import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  X, CheckCircle2, XCircle, AlertTriangle, FileText,
  ExternalLink, ShoppingCart, Receipt, User, Calendar,
  DollarSign, Shield, Clock
} from 'lucide-react';
import { format } from 'date-fns';

const VERIFIER_NAME = 'Hamka Ariffin';

export default function DocumentReviewModal({ record, type, onClose }) {
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const isInvoice = type === 'invoice';
  const hasDoc = !!record.document_url;
  const aiScore = record.ai_confidence_score;
  const isLowConfidence = aiScore != null && aiScore < 85;

  async function handleVerify() {
    setLoading(true);
    const timestamp = new Date().toISOString();
    const entityName = isInvoice ? 'SalesInvoice' : 'PurchaseOrder';
    const existingTrail = record.audit_trail || [];

    await base44.entities[entityName].update(record.id, {
      processing_status: 'verified',
      verified_by: 'hamka_ariffin',
      verified_by_name: VERIFIER_NAME,
      verified_date: timestamp,
      audit_trail: [...existingTrail, {
        action: 'verified',
        user_id: 'hamka_ariffin',
        user_name: VERIFIER_NAME,
        timestamp,
        details: `Document verified and approved by ${VERIFIER_NAME}. Ready for Xero sync.`
      }]
    });
    setLoading(false);
    onClose();
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setLoading(true);
    const timestamp = new Date().toISOString();
    const entityName = isInvoice ? 'SalesInvoice' : 'PurchaseOrder';
    const existingTrail = record.audit_trail || [];

    await base44.entities[entityName].update(record.id, {
      processing_status: 'rejected',
      rejection_reason: rejectReason,
      audit_trail: [...existingTrail, {
        action: 'rejected',
        user_id: 'hamka_ariffin',
        user_name: VERIFIER_NAME,
        timestamp,
        details: `Document rejected by ${VERIFIER_NAME}. Reason: ${rejectReason}`
      }]
    });
    setLoading(false);
    onClose();
  }

  const amount = isInvoice ? record.total : record.total_amount;
  const refNumber = isInvoice ? record.invoice_number : record.po_number;
  const partyLabel = isInvoice ? 'Customer' : 'Supplier';
  const partyName = isInvoice ? record.customer_name : record.supplier_name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isInvoice ? 'bg-blue-50' : 'bg-orange-50'}`}>
              {isInvoice
                ? <Receipt className="w-4 h-4 text-primary" />
                : <ShoppingCart className="w-4 h-4 text-[#F97316]" />
              }
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground text-sm">
                {isInvoice ? 'Sales Invoice Review' : 'Purchase Order Review'}
              </h3>
              <p className="text-xs text-muted-foreground">{refNumber || 'No Reference'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Alerts */}
          {!hasDoc && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">No Document Attached</p>
                <p className="text-xs text-red-600 mt-0.5">This record cannot be verified or synced to Xero until a document is uploaded.</p>
              </div>
            </div>
          )}

          {isLowConfidence && hasDoc && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-700">Low AI Confidence ({aiScore}%)</p>
                <p className="text-xs text-amber-600 mt-0.5">AI extraction confidence is below 85%. Please verify all extracted fields manually before approving.</p>
              </div>
            </div>
          )}

          {/* Record Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <User className="w-3 h-3" />{partyLabel}
              </div>
              <p className="text-sm font-semibold text-foreground">{partyName || '—'}</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <DollarSign className="w-3 h-3" />Amount
              </div>
              <p className="text-sm font-semibold text-foreground">S${(amount || 0).toFixed(2)}</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Calendar className="w-3 h-3" />Date
              </div>
              <p className="text-sm font-semibold text-foreground">
                {record.date || record.requested_date
                  ? format(new Date(record.date || record.requested_date), 'dd MMM yyyy')
                  : '—'}
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Shield className="w-3 h-3" />AI Confidence
              </div>
              <p className={`text-sm font-semibold ${!aiScore ? 'text-muted-foreground' : aiScore >= 85 ? 'text-[#16A34A]' : 'text-amber-600'}`}>
                {aiScore != null ? `${aiScore}%` : 'Not processed'}
              </p>
            </div>
          </div>

          {/* Document Preview */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Attached Document</p>
            {hasDoc ? (
              <div className="border border-border rounded-xl overflow-hidden">
                {record.document_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img src={record.document_url} alt="Document" className="w-full max-h-64 object-contain bg-muted/20" />
                ) : (
                  <div className="flex items-center justify-between p-4 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="text-sm text-foreground">Document attached</span>
                    </div>
                    <a href={record.document_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <ExternalLink className="w-3.5 h-3.5" />Open
                      </Button>
                    </a>
                  </div>
                )}
                {record.document_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                  <div className="p-3 border-t border-border flex justify-end">
                    <a href={record.document_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <ExternalLink className="w-3.5 h-3.5" />View Full Size
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-dashed border-red-300 rounded-xl p-6 text-center bg-red-50/30">
                <FileText className="w-8 h-8 text-red-300 mx-auto mb-2" />
                <p className="text-sm text-red-500 font-medium">No document uploaded</p>
                <p className="text-xs text-red-400 mt-0.5">Staff must upload the receipt or invoice photo before this can be reviewed.</p>
              </div>
            )}
          </div>

          {/* Audit Trail */}
          {record.audit_trail?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Audit Trail</p>
              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {record.audit_trail.map((entry, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Clock className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{entry.timestamp ? format(new Date(entry.timestamp), 'dd MMM HH:mm') : '—'}</span>
                    <span className="font-medium text-foreground">{entry.user_name}</span>
                    <span className="text-muted-foreground flex-1">{entry.details}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reject form */}
          {showRejectForm && (
            <div className="border border-red-200 rounded-xl p-4 bg-red-50/30 space-y-3">
              <p className="text-sm font-semibold text-red-700">Rejection Reason</p>
              <textarea
                className="w-full text-sm border border-red-200 rounded-lg p-2.5 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-red-400"
                rows={3}
                placeholder="Explain why this document is being rejected…"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm" variant="outline"
                  className="text-xs"
                  onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
                >Cancel</Button>
                <Button
                  size="sm"
                  className="text-xs bg-red-600 hover:bg-red-700 text-white gap-1.5"
                  disabled={!rejectReason.trim() || loading}
                  onClick={handleReject}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  {loading ? 'Rejecting…' : 'Confirm Reject'}
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {record.processing_status !== 'verified' && record.processing_status !== 'rejected' && (
            <div className="flex gap-3 pt-1">
              {!showRejectForm && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setShowRejectForm(true)}
                  disabled={loading}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </Button>
              )}
              <Button
                size="sm"
                className="gap-1.5 text-xs bg-[#16A34A] hover:bg-[#15803D] text-white flex-1"
                disabled={!hasDoc || loading}
                onClick={handleVerify}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {loading ? 'Verifying…' : `Verify & Approve`}
              </Button>
            </div>
          )}

          {record.processing_status === 'verified' && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              <p className="text-sm font-medium text-green-700">
                Verified by {record.verified_by_name || 'Manager'} — Ready for Xero Sync
              </p>
            </div>
          )}

          {record.processing_status === 'rejected' && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
              <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">Rejected</p>
                {record.rejection_reason && (
                  <p className="text-xs text-red-600 mt-0.5">{record.rejection_reason}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}