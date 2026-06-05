// ============================================================
// ORBITAN — T3 Point-of-Sale Modal
// Retail pack: quick sale from product catalog with sustainability impact
// EXIT-READY: Pure React + base44 SDK.
// ============================================================

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, CreditCard, Banknote, ArrowUpRight, Leaf,
  Plus, Minus, Trash2, CheckCircle2, ShoppingCart, X
} from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'paynow', label: 'PayNow', icon: ArrowUpRight },
];

// Condition grade display
const GRADE_LABEL = {
  A_new_with_tags: 'New w/ Tags',
  B_like_new: 'Like New',
  C_good: 'Good',
  D_fair: 'Fair',
  E_upcycled: 'Upcycled',
};

export default function POSModal({ open, onClose, tenantId, outletId, onSaleComplete }) {
  const [step, setStep] = useState('cart'); // cart | payment | complete
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptRef, setReceiptRef] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep('cart');
    setCart([]);
    setSearch('');
    setPaymentMethod('card');
    setCustomerName('');
    setLoading(true);
    base44.entities.ProductCatalog.filter({ status: 'active', is_pos_ready: true })
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const updateQty = (id, delta) => {
    setCart(prev => prev
      .map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
      .filter(i => i.qty > 0)
    );
  };

  const subtotal = cart.reduce((s, i) => s + (i.selling_price_sgd || 0) * i.qty, 0);
  const totalCO2 = cart.reduce((s, i) => s + ((i.sustainability_impact?.co2_saved_kg || 0) * i.qty), 0);

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    const ref = `S-${Date.now()}`;
    try {
      // Create a SalesInvoice record
      await base44.entities.SalesInvoice.create({
        tenant_id: tenantId,
        outlet_id: outletId,
        invoice_number: ref,
        date: format(new Date(), 'yyyy-MM-dd'),
        customer_name: customerName || 'Walk-in',
        line_items: cart.map(i => ({
          description: i.name,
          quantity: i.qty,
          unit_price: i.selling_price_sgd || 0,
          cogs: (i.cost_price_sgd || 0) * i.qty,
          total: (i.selling_price_sgd || 0) * i.qty,
        })),
        subtotal,
        total: subtotal,
        cogs_total: cart.reduce((s, i) => s + (i.cost_price_sgd || 0) * i.qty, 0),
        gross_profit: subtotal - cart.reduce((s, i) => s + (i.cost_price_sgd || 0) * i.qty, 0),
        payment_method: paymentMethod,
        payment_status: 'paid',
        processing_status: 'verified',
      });

      // Mark items as sold
      for (const item of cart) {
        await base44.entities.ProductCatalog.update(item.id, {
          status: 'sold',
          sold_date: format(new Date(), 'yyyy-MM-dd'),
        });
      }

      setReceiptRef(ref);
      setStep('complete');
      if (onSaleComplete) onSaleComplete();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#22C55E]" />
            {step === 'cart' ? 'New Sale' : step === 'payment' ? 'Payment' : 'Sale Complete'}
          </DialogTitle>
        </DialogHeader>

        {/* ── CART STEP ── */}
        {step === 'cart' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex flex-col sm:flex-row gap-0 flex-1 overflow-hidden">
              {/* Product Browser */}
              <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
                <div className="p-4 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search items..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {loading ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Loading catalog…</p>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No POS-ready items found.</p>
                      <p className="text-xs text-muted-foreground mt-1">Mark items as POS-ready in the Catalog.</p>
                    </div>
                  ) : (
                    filtered.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors text-left border border-transparent hover:border-border"
                      >
                        <div className="w-10 h-10 bg-[#F0FDF4] rounded-lg flex items-center justify-center flex-shrink-0 text-lg">
                          👗
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.sku || '—'} · {GRADE_LABEL[p.condition_grade] || p.condition_grade}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-[#22C55E]">S${p.selling_price_sgd || 0}</p>
                          <p className="text-[10px] text-emerald-600">{p.sustainability_impact?.co2_saved_kg || 0}kg CO₂</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Cart */}
              <div className="w-full sm:w-64 flex flex-col bg-muted/20">
                <div className="p-4 border-b border-border">
                  <h3 className="font-heading font-semibold text-sm text-foreground">Cart ({cart.length})</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {cart.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Add items from the catalog</p>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="bg-white rounded-xl p-3 border border-border">
                        <div className="flex items-start justify-between gap-1 mb-2">
                          <p className="text-xs font-medium text-foreground leading-tight flex-1">{item.name}</p>
                          <button onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => updateQty(item.id, -1)} className="w-5 h-5 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-semibold w-4 text-center">{item.qty}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="w-5 h-5 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-sm font-bold text-foreground">S${((item.selling_price_sgd || 0) * item.qty).toFixed(0)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 border-t border-border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-bold text-foreground">S${subtotal.toFixed(2)}</span>
                  </div>
                  {totalCO2 > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                      <Leaf className="w-3 h-3" />
                      {totalCO2.toFixed(1)}kg CO₂ saved
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
              <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
              <Button
                size="sm"
                disabled={cart.length === 0}
                onClick={() => setStep('payment')}
                style={{ background: '#22C55E' }}
                className="gap-2 text-white"
              >
                Proceed to Payment →
              </Button>
            </div>
          </div>
        )}

        {/* ── PAYMENT STEP ── */}
        {step === 'payment' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="bg-muted/40 rounded-xl p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Total Due</p>
              <p className="text-3xl font-display font-bold text-foreground">S${subtotal.toFixed(2)}</p>
              {totalCO2 > 0 && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <Leaf className="w-3 h-3" /> {totalCO2.toFixed(1)}kg CO₂ saved by this purchase
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(pm => {
                  const Icon = pm.icon;
                  return (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                        paymentMethod === pm.id
                          ? 'border-[#22C55E] bg-[#F0FDF4] text-[#22C55E]'
                          : 'border-border bg-card text-muted-foreground hover:border-muted-foreground'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Customer Name (optional)</label>
              <Input
                placeholder="Walk-in / Customer name"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Order Summary</p>
              {cart.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate flex-1">{item.name} × {item.qty}</span>
                  <span className="font-medium text-foreground ml-2">S${((item.selling_price_sgd || 0) * item.qty).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground">
                <span>Total</span>
                <span>S${subtotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setStep('cart')} className="flex-1">← Back</Button>
              <Button
                size="sm"
                onClick={handleCompleteSale}
                disabled={submitting}
                style={{ background: '#22C55E' }}
                className="flex-1 gap-2 text-white"
              >
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Confirm Sale</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── COMPLETE STEP ── */}
        {step === 'complete' && (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#F0FDF4] border-2 border-[#22C55E] flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[#22C55E]" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-xl text-foreground">Sale Complete!</h3>
              <p className="text-sm text-muted-foreground mt-1">Receipt ref: <span className="font-mono font-semibold">{receiptRef}</span></p>
              {totalCO2 > 0 && (
                <p className="text-sm text-emerald-600 mt-2 flex items-center justify-center gap-1.5">
                  <Leaf className="w-4 h-4" /> {totalCO2.toFixed(1)}kg CO₂ saved by this transaction
                </p>
              )}
            </div>
            <div className="text-2xl font-display font-bold text-foreground">S${subtotal.toFixed(2)}</div>
            <Button onClick={onClose} style={{ background: '#22C55E' }} className="text-white mt-2">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}