import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, X, AlertCircle, FileText, ShoppingCart } from 'lucide-react';

export default function XeroReviewModal({ record, onVerify, onClose }) {
  const [notes, setNotes] = useState('');

  const isInvoice = record.type === 'sales_invoice';
  const lineItems = isInvoice ? (record.line_items || []) : (record.items || []);
  const confidenceColor = record.ai_confidence_score >= 90
    ? 'text-orbitan-green bg-orbitan-green-light'
    : record.ai_confidence_score >= 70
    ? 'text-orbitan-amber bg-orbitan-amber-light'
    : 'text-red-600 bg-red-50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orbitan-blue-light flex items-center justify-center">
              {isInvoice ? <FileText className="w-4 h-4 text-orbitan-blue" /> : <ShoppingCart className="w-4 h-4 text-orbitan-blue" />}
            </div>
            <div>
              <p className="font-heading font-semibold text-foreground">{record.reference}</p>
              <p className="text-xs text-muted-foreground">{record.label} · {record.date}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Confidence Banner */}
        {record.ai_confidence_score && (
          <div className={`mx-6 mt-5 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${confidenceColor}`}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              AI extracted this document with <strong>{record.ai_confidence_score}% confidence</strong>.
              {record.ai_confidence_score < 80 && ' Please review carefully — some fields may need correction.'}
            </span>
          </div>
        )}

        {/* Document Details */}
        <div className="px-6 pt-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Document Reference</p>
              <p className="text-sm font-semibold text-foreground">{record.reference}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Date</p>
              <p className="text-sm font-semibold text-foreground">{record.date}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{isInvoice ? 'Customer' : 'Supplier'}</p>
              <p className="text-sm font-semibold text-foreground">
                {isInvoice ? record.customer_name : record.supplier_name}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
              <p className="text-sm font-semibold text-foreground">{record.amount}</p>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {isInvoice ? 'Line Items' : 'Order Items'}
            </p>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Description</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Qty</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Unit Price</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lineItems.length > 0 ? lineItems.map((item, i) => (
                    <tr key={i} className="bg-white">
                      <td className="px-4 py-2.5 text-foreground">
                        {isInvoice ? item.description : item.item_name}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">S${item.unit_price?.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground">S${item.total?.toFixed(2)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-xs text-muted-foreground">No line items extracted yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reviewer Notes */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Reviewer Notes (optional)</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Add any notes about this document before approving..."
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Xero Destination */}
          <div className="flex items-start gap-2 p-3 bg-orbitan-blue-light rounded-xl text-xs text-orbitan-blue border border-blue-200">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Xero destination:</strong> This will be pushed as a{' '}
              <strong>{isInvoice ? 'Sales Invoice (ACCREC)' : 'Bill (ACCPAY)'}</strong> to Taqueria Pte Ltd in Xero.
              The status will be set to <strong>AUTHORISED</strong>.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-5 border-t border-border mt-5 sticky bottom-0 bg-white rounded-b-2xl">
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">Cancel</Button>
          <Button
            onClick={() => onVerify(record)}
            className="flex-1 sm:flex-none gap-2 bg-orbitan-green hover:bg-orbitan-green/90"
          >
            <CheckCircle2 className="w-4 h-4" />
            Approve & Mark Verified
          </Button>
        </div>
      </div>
    </div>
  );
}