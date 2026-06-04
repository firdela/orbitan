import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Package, ShoppingCart, FileText, Users, CheckSquare,
  Shield, BarChart2, Link2, Calendar, Plus, ChevronRight,
  Utensils, Truck, CheckCircle2, Clock
} from 'lucide-react';

const NAV = [
  { type: 'section', label: 'F&B Operations' },
  { href: '/t1/dashboard', icon: Utensils, label: 'Dashboard' },
  { href: '/t1/inventory', icon: Package, label: 'Inventory' },
  { href: '/t1/procurement', icon: ShoppingCart, label: 'Procurement' },
  { href: '/t1/sales', icon: FileText, label: 'Sales & Invoicing' },
  { href: '/t1/scheduling', icon: Calendar, label: 'Scheduling' },
  { type: 'section', label: 'People & Tasks' },
  { href: '/t1/workforce', icon: Users, label: 'Workforce' },
  { href: '/t1/tasks', icon: CheckSquare, label: 'Tasks' },
  { type: 'section', label: 'Governance' },
  { href: '/t1/compliance', icon: Shield, label: 'Compliance' },
  { href: '/t1/reporting', icon: BarChart2, label: 'Reporting' },
  { href: '/t1/xero', icon: Link2, label: 'Xero Integration' },
];

const SUPPLIERS = [
  { id: 's1', name: 'SG Meat Co.', contact: 'Ahmad', phone: '+65 9111 2222', category: 'Meat & Protein', lead_time: 1 },
  { id: 's2', name: 'Fresh Produce SG', contact: 'James', phone: '+65 8222 3333', category: 'Produce & Veg', lead_time: 1 },
  { id: 's3', name: 'Pan Asian Food Supply', contact: 'Maria', phone: '+65 9333 4444', category: 'Dry Goods & Spices', lead_time: 2 },
  { id: 's4', name: 'DairySG Pte Ltd', contact: 'Wei Lin', phone: '+65 9444 5555', category: 'Dairy', lead_time: 2 },
];

const DEMO_POS = [
  { id: 'po1', po_number: 'PO-2026-001', supplier_name: 'SG Meat Co.', status: 'approved', total_amount: 286.00, requested_date: '2026-06-01', expected_delivery_date: '2026-06-02', items: [{ item_name: 'Beef Chuck (Birria Cut)', quantity: 13, unit: 'kg', unit_price: 22 }] },
  { id: 'po2', po_number: 'PO-2026-002', supplier_name: 'Fresh Produce SG', status: 'pending_approval', total_amount: 52.50, requested_date: '2026-06-03', expected_delivery_date: '2026-06-04', items: [{ item_name: 'Coriander', quantity: 20, unit: 'bunch', unit_price: 0.9 }, { item_name: 'Lime', quantity: 5, unit: 'kg', unit_price: 3.5 }] },
  { id: 'po3', po_number: 'PO-2026-003', supplier_name: 'Pan Asian Food Supply', status: 'draft', total_amount: 126.00, requested_date: '2026-06-04', expected_delivery_date: '2026-06-06', items: [{ item_name: 'Dried Guajillo Chillies', quantity: 3, unit: 'kg', unit_price: 18 }, { item_name: 'Beef Consommé Sachets', quantity: 6, unit: 'box', unit_price: 8 }] },
  { id: 'po4', po_number: 'PO-2026-004', supplier_name: 'DairySG Pte Ltd', status: 'received', total_amount: 64.00, requested_date: '2026-05-28', expected_delivery_date: '2026-05-30', items: [{ item_name: 'Oaxaca Cheese', quantity: 4, unit: 'kg', unit_price: 16 }] },
];

const STATUS_FLOW = ['draft', 'pending_approval', 'approved', 'sent', 'received'];

export default function FnBProcurement() {
  const [pos, setPos] = useState(DEMO_POS);
  const [selectedPO, setSelectedPO] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');
  const [newPO, setNewPO] = useState({ supplier_id: 's1', notes: '', items: [{ item_name: '', quantity: 1, unit: 'kg', unit_price: 0 }] });

  function advanceStatus(po) {
    const idx = STATUS_FLOW.indexOf(po.status);
    if (idx < STATUS_FLOW.length - 1) {
      setPos(prev => prev.map(p => p.id === po.id ? { ...p, status: STATUS_FLOW[idx + 1] } : p));
    }
  }

  function nextLabel(status) {
    const idx = STATUS_FLOW.indexOf(status);
    const next = STATUS_FLOW[idx + 1];
    if (!next) return null;
    const labels = { pending_approval: 'Submit for Approval', approved: 'Mark Approved', sent: 'Mark Sent', received: 'Mark Received' };
    return labels[next] || `Move to ${next}`;
  }

  return (
    <AppShell navigation={NAV} title="Procurement — La Birria Tacos">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Procurement & Purchase Orders"
          subtitle="La Birria Tacos · North Bridge Rd · F&B Pack"
          actions={
            <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" /> New Purchase Order
            </Button>
          }
        />

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
          {['orders', 'suppliers', 'goods_receipt'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t === 'orders' ? 'Purchase Orders' : t === 'suppliers' ? 'Suppliers' : 'Goods Receipts'}
            </button>
          ))}
        </div>

        {/* PO List */}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            {pos.map(po => (
              <div key={po.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-heading font-semibold text-foreground">{po.po_number}</span>
                      <StatusBadge status={po.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {po.supplier_name} · Delivery: {po.expected_delivery_date} · <span className="font-semibold text-foreground">S${po.total_amount.toFixed(2)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setSelectedPO(po)}>View</Button>
                    {po.status !== 'received' && po.status !== 'cancelled' && (
                      <Button size="sm" className="text-xs gap-1" onClick={() => advanceStatus(po)}>
                        <ChevronRight className="w-3 h-3" /> {nextLabel(po.status)}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1">
                  {po.items.map((item, i) => (
                    <span key={i} className="text-[11px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                      {item.item_name} × {item.quantity} {item.unit}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suppliers */}
        {activeTab === 'suppliers' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SUPPLIERS.map(s => (
              <div key={s.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-orbitan-blue-light rounded-xl flex items-center justify-center">
                    <Truck className="w-5 h-5 text-orbitan-blue" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.category}</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Contact: <span className="text-foreground">{s.contact}</span></p>
                  <p>Phone: <span className="text-foreground">{s.phone}</span></p>
                  <p>Lead Time: <span className="text-foreground font-medium">{s.lead_time} day{s.lead_time > 1 ? 's' : ''}</span></p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Goods Receipt */}
        {activeTab === 'goods_receipt' && (
          <div className="space-y-3">
            {pos.filter(p => p.status === 'received').map(po => (
              <div key={po.id} className="bg-orbitan-green-light border border-green-200 rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-orbitan-green flex-shrink-0" />
                  <div>
                    <p className="font-heading font-semibold text-foreground">{po.po_number} — Received</p>
                    <p className="text-xs text-muted-foreground">Supplier: {po.supplier_name} · Delivery: {po.expected_delivery_date}</p>
                  </div>
                  <span className="ml-auto font-semibold text-orbitan-green">S${po.total_amount.toFixed(2)}</span>
                </div>
              </div>
            ))}
            {pos.filter(p => p.status === 'received').length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No goods received yet.</p>
              </div>
            )}
          </div>
        )}

        {/* PO Detail Modal */}
        {selectedPO && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-lg">{selectedPO.po_number}</h3>
                <StatusBadge status={selectedPO.status} />
              </div>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between"><span className="text-muted-foreground">Supplier</span><span className="font-medium">{selectedPO.supplier_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Requested</span><span>{selectedPO.requested_date}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Expected Delivery</span><span>{selectedPO.expected_delivery_date}</span></div>
              </div>
              <div className="bg-muted rounded-xl overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border"><th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Item</th><th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Qty</th><th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Unit Price</th><th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Total</th></tr></thead>
                  <tbody>{selectedPO.items.map((item, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">{item.item_name}</td>
                      <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                      <td className="px-3 py-2 text-right">S${item.unit_price.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium">S${(item.quantity * item.unit_price).toFixed(2)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="flex justify-between items-center font-semibold text-base mb-5">
                <span>Total</span><span className="text-orbitan-blue">S${selectedPO.total_amount.toFixed(2)}</span>
              </div>
              <Button className="w-full" onClick={() => setSelectedPO(null)}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}