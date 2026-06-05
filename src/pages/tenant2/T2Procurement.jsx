import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle2, Clock, Truck, XCircle, X, ChevronRight, Mail, Phone, Building2 } from 'lucide-react';
import { T2_NAV, T2_TENANT } from '@/lib/tenant-nav';

const DEMO_POS = [
  { id: 'PO-2026-021', supplier: 'EcoFleet Transport Pte Ltd', items: [{ name: 'Collection Vehicle Fuel', qty: 200, unit: 'L', unit_price: 2.40 }, { name: 'PPE Kit — Driver', qty: 4, unit: 'set', unit_price: 85 }, { name: 'Weighing Scale Calibration', qty: 1, unit: 'svc', unit_price: 320 }], status: 'approved', date: '2026-06-04', expected: '2026-06-06', notes: 'Priority order — vehicles need to run Monday' },
  { id: 'PO-2026-020', supplier: 'Green Sort Solutions', items: [{ name: 'Sorting Conveyor Maintenance', qty: 1, unit: 'svc', unit_price: 680 }, { name: 'Replacement Mesh Screens', qty: 2, unit: 'pcs', unit_price: 80 }], status: 'received', date: '2026-06-02', expected: '2026-06-04', notes: '' },
  { id: 'PO-2026-019', supplier: 'RE-Sort Pte Ltd', items: [{ name: 'Baling Wire', qty: 50, unit: 'kg', unit_price: 3.20 }, { name: 'Hydraulic Press Service', qty: 1, unit: 'svc', unit_price: 850 }, { name: 'Plastic Sorting Bags', qty: 500, unit: 'pcs', unit_price: 0.60 }, { name: 'Safety Signage Set', qty: 10, unit: 'pcs', unit_price: 25 }, { name: 'Facility Deep Clean', qty: 1, unit: 'svc', unit_price: 620 }], status: 'pending_approval', date: '2026-06-01', expected: '2026-06-07', notes: 'Awaiting Hamka sign-off' },
  { id: 'PO-2026-018', supplier: 'EcoFleet Transport Pte Ltd', items: [{ name: 'GPS Tracker Subscription (1 vehicle)', qty: 1, unit: 'mth', unit_price: 480 }], status: 'sent', date: '2026-05-29', expected: '2026-06-03', notes: '' },
  { id: 'PO-2026-017', supplier: 'Material Recovery SG', items: [{ name: 'E-Waste Processing Service', qty: 42, unit: 'kg', unit_price: 18 }, { name: 'Copper Extraction Fee', qty: 18, unit: 'kg', unit_price: 12 }, { name: 'Hazmat Disposal Certificate', qty: 1, unit: 'doc', unit_price: 280 }, { name: 'Certified Destruction Report', qty: 1, unit: 'doc', unit_price: 160 }], status: 'received', date: '2026-05-25', expected: '2026-05-30', notes: 'Completed — certificates filed in compliance' },
];

const DEMO_SUPPLIERS = [
  { name: 'EcoFleet Transport Pte Ltd', contact: 'Ahmad Rashid', email: 'ahmad@ecofleet.sg', phone: '+65 6234 5678', category: 'Logistics', terms: 'Net 14', status: 'active', orders_ytd: 8 },
  { name: 'Green Sort Solutions', contact: 'Lisa Tan', email: 'lisa@greensort.sg', phone: '+65 6345 6789', category: 'Processing', terms: 'COD', status: 'active', orders_ytd: 5 },
  { name: 'RE-Sort Pte Ltd', contact: 'David Ng', email: 'david@resort.sg', phone: '+65 6456 7890', category: 'Facility Services', terms: 'Net 30', status: 'active', orders_ytd: 3 },
  { name: 'Material Recovery SG', contact: 'Priya Raj', email: 'priya@mrsg.sg', phone: '+65 6567 8901', category: 'Recovery & Disposal', terms: 'Net 7', status: 'active', orders_ytd: 6 },
];

const STATUS_MAP = {
  draft:            { label: 'Draft',            bg: 'bg-muted',       color: 'text-muted-foreground', icon: Clock },
  pending_approval: { label: 'Pending Approval', bg: 'bg-amber-50',    color: 'text-amber-700',         icon: Clock },
  approved:         { label: 'Approved',         bg: 'bg-blue-50',     color: 'text-blue-700',          icon: CheckCircle2 },
  sent:             { label: 'Sent',             bg: 'bg-purple-50',   color: 'text-purple-700',        icon: Truck },
  received:         { label: 'Received',         bg: 'bg-[#F0FDF4]',   color: 'text-[#16A34A]',         icon: CheckCircle2 },
  cancelled:        { label: 'Cancelled',        bg: 'bg-red-50',      color: 'text-red-600',           icon: XCircle },
};

export default function T2Procurement() {
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedPO, setSelectedPO] = useState(null);

  const totalSpend = DEMO_POS.filter(p => p.status !== 'cancelled').reduce((s, p) => s + p.items.reduce((a, i) => a + i.qty * i.unit_price, 0), 0);

  return (
    <AppShell navigation={T2_NAV} tenant={T2_TENANT} title="" headerRight={<TenantSwitcher />}>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Procurement"
          subtitle="Renewed Resources Pte Ltd · Supplier & logistics management"
          actions={
            <Button size="sm" className="gap-2" style={{ background: '#16A34A' }}>
              <Plus className="w-3.5 h-3.5" /> New Order
            </Button>
          }
        />

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Orders', value: DEMO_POS.length, color: 'text-foreground', bg: 'bg-card border-border' },
            { label: 'Pending Approval', value: DEMO_POS.filter(p => p.status === 'pending_approval').length, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
            { label: 'In Transit', value: DEMO_POS.filter(p => p.status === 'sent').length, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
            { label: 'Total Spend (MTD)', value: `S$${totalSpend.toLocaleString()}`, color: 'text-[#16A34A]', bg: 'bg-[#F0FDF4] border-green-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
              <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 w-full sm:w-auto">
          {[{ id: 'orders', label: 'Purchase Orders' }, { id: 'suppliers', label: 'Suppliers' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-none text-sm font-medium px-5 py-2 rounded-lg transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'orders' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {DEMO_POS.map(po => {
                const sc = STATUS_MAP[po.status] || STATUS_MAP.draft;
                const StatusIcon = sc.icon;
                const total = po.items.reduce((s, i) => s + i.qty * i.unit_price, 0);
                return (
                  <div key={po.id} className="px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedPO(po)}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{po.id}</p>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                            <StatusIcon className="w-3 h-3" />{sc.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{po.supplier} · {po.items.length} line item{po.items.length > 1 ? 's' : ''} · Expected {po.expected}</p>
                        {po.notes && <p className="text-xs text-amber-600 mt-0.5 italic">{po.notes}</p>}
                      </div>
                      <div className="text-right flex-shrink-0 flex items-center gap-2">
                        <div>
                          <p className="text-sm font-bold text-foreground">S${total.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{po.date}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div className="space-y-3">
            {DEMO_SUPPLIERS.map(s => (
              <div key={s.name} className="bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-[#16A34A]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.contact}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-medium text-[#16A34A] bg-[#F0FDF4] px-2 py-0.5 rounded-full">{s.category}</span>
                    <p className="text-xs text-muted-foreground mt-1">{s.terms} · {s.orders_ytd} orders YTD</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PO Detail Drawer */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelectedPO(null)}>
          <div className="bg-white w-full max-w-sm h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <p className="font-heading font-semibold text-foreground">{selectedPO.id}</p>
                <p className="text-xs text-muted-foreground">{selectedPO.supplier}</p>
              </div>
              <button onClick={() => setSelectedPO(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-2">
                {(() => { const sc = STATUS_MAP[selectedPO.status] || STATUS_MAP.draft; const SI = sc.icon; return <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.color}`}><SI className="w-3.5 h-3.5" />{sc.label}</span>; })()}
                <span className="text-xs text-muted-foreground">Ordered {selectedPO.date}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Line Items</p>
                <div className="space-y-1.5">
                  {selectedPO.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div>
                        <p className="text-sm text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.qty} {item.unit} × S${item.unit_price}</p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">S${(item.qty * item.unit_price).toFixed(0)}</p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm font-bold text-foreground">Total</p>
                    <p className="text-sm font-bold text-foreground">S${selectedPO.items.reduce((s, i) => s + i.qty * i.unit_price, 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              {selectedPO.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-amber-700">Note</p>
                  <p className="text-xs text-amber-600 mt-0.5">{selectedPO.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {selectedPO.status === 'pending_approval' ? (
                  <>
                    <Button size="sm" variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50">Reject</Button>
                    <Button size="sm" className="flex-1" style={{ background: '#16A34A' }}>Approve PO</Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" className="flex-1">Edit PO</Button>
                    <Button size="sm" className="flex-1" style={{ background: '#16A34A' }}>Mark Received</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}