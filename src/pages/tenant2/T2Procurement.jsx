import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Recycle, Package, ShoppingCart, CheckSquare, Shield,
  BarChart2, Users, Leaf, Plus, ChevronRight, CheckCircle2,
  Clock, Truck, XCircle, Eye
} from 'lucide-react';

const NAV = [
  { type: 'section', label: 'Sustainability Ops' },
  { href: '/t2/dashboard', icon: Leaf, label: 'Dashboard' },
  { href: '/t2/collections', icon: Recycle, label: 'Collections' },
  { href: '/t2/inventory', icon: Package, label: 'Recovered Materials' },
  { href: '/t2/procurement', icon: ShoppingCart, label: 'Procurement' },
  { type: 'section', label: 'People & Tasks' },
  { href: '/t2/workforce', icon: Users, label: 'Workforce' },
  { href: '/t2/tasks', icon: CheckSquare, label: 'Tasks' },
  { type: 'section', label: 'Governance' },
  { href: '/t2/compliance', icon: Shield, label: 'Compliance' },
  { href: '/t2/reporting', icon: BarChart2, label: 'Reporting' },
];

const DEMO_POS = [
  { id: 'PO-2026-021', supplier: 'EcoFleet Transport Pte Ltd', items: 3, total: 1200, status: 'approved', date: '2026-06-04', expected: '2026-06-06' },
  { id: 'PO-2026-020', supplier: 'Green Sort Solutions', items: 2, total: 840, status: 'received', date: '2026-06-02', expected: '2026-06-04' },
  { id: 'PO-2026-019', supplier: 'RE-Sort Pte Ltd', items: 5, total: 2150, status: 'pending_approval', date: '2026-06-01', expected: '2026-06-07' },
  { id: 'PO-2026-018', supplier: 'EcoFleet Transport Pte Ltd', items: 1, total: 480, status: 'sent', date: '2026-05-29', expected: '2026-06-03' },
  { id: 'PO-2026-017', supplier: 'Material Recovery SG', items: 4, total: 3200, status: 'received', date: '2026-05-25', expected: '2026-05-30' },
];

const DEMO_SUPPLIERS = [
  { name: 'EcoFleet Transport Pte Ltd', contact: 'Ahmad Rashid', email: 'ahmad@ecofleet.sg', category: 'Logistics', terms: 'Net 14' },
  { name: 'Green Sort Solutions', contact: 'Lisa Tan', email: 'lisa@greensort.sg', category: 'Processing', terms: 'COD' },
  { name: 'RE-Sort Pte Ltd', contact: 'David Ng', email: 'david@resort.sg', category: 'Sorting Facility', terms: 'Net 30' },
  { name: 'Material Recovery SG', contact: 'Priya Raj', email: 'priya@mrsg.sg', category: 'Recovery', terms: 'Net 7' },
];

const STATUS_MAP = {
  draft:            { label: 'Draft',            bg: 'bg-muted',          color: 'text-muted-foreground', icon: Clock },
  pending_approval: { label: 'Pending Approval', bg: 'bg-amber-50',       color: 'text-amber-700',         icon: Clock },
  approved:         { label: 'Approved',         bg: 'bg-blue-50',        color: 'text-blue-700',          icon: CheckCircle2 },
  sent:             { label: 'Sent',             bg: 'bg-purple-50',      color: 'text-purple-700',        icon: Truck },
  received:         { label: 'Received',         bg: 'bg-[#F0FDF4]',      color: 'text-[#16A34A]',         icon: CheckCircle2 },
  cancelled:        { label: 'Cancelled',        bg: 'bg-red-50',         color: 'text-red-600',           icon: XCircle },
};

export default function T2Procurement() {
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <AppShell navigation={NAV} title="Procurement — Renewed Resources">
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
            { label: 'Received (MTD)', value: DEMO_POS.filter(p => p.status === 'received').length, color: 'text-[#16A34A]', bg: 'bg-[#F0FDF4] border-green-200' },
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
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-none text-sm font-medium px-5 py-2 rounded-lg transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {activeTab === 'orders' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {DEMO_POS.map(po => {
                const sc = STATUS_MAP[po.status] || STATUS_MAP.draft;
                const StatusIcon = sc.icon;
                return (
                  <div key={po.id} className="flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground">{po.id}</p>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                          <StatusIcon className="w-3 h-3" />{sc.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{po.supplier} · {po.items} items · Due {po.expected}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-foreground">S${po.total.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{po.date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Suppliers List */}
        {activeTab === 'suppliers' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {DEMO_SUPPLIERS.map(s => (
                <div key={s.name} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.contact} · {s.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-[#16A34A]">{s.category}</p>
                    <p className="text-xs text-muted-foreground">{s.terms}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}