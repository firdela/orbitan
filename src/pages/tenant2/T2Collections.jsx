import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Recycle, Package, ShoppingCart, CheckSquare, Shield,
  BarChart2, Users, Leaf, Plus, Search, Filter,
  MapPin, Weight, Calendar, CheckCircle2, Clock,
  Truck, AlertCircle, X, ArrowRight
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

const DEMO_COLLECTIONS = [
  { id: 'C-2026-089', source: 'CapitaLand HQ', address: '168 Robinson Rd', material_category: 'paper_cardboard', gross_weight_kg: 320, net_weight_kg: 304, co2_saved_kg: 480, processing_status: 'completed', collection_date: '2026-06-04', driver: 'Ahmad Razif', revenue_sgd: 224 },
  { id: 'C-2026-088', source: 'Raffles Hotel', address: '1 Beach Rd', material_category: 'plastics', gross_weight_kg: 85, net_weight_kg: 72, co2_saved_kg: 144, processing_status: 'sorting', collection_date: '2026-06-04', driver: 'Tan Wei Ming', revenue_sgd: 108 },
  { id: 'C-2026-087', source: 'NUS Campus', address: '21 Lower Kent Ridge Rd', material_category: 'e_waste', gross_weight_kg: 42, net_weight_kg: 42, co2_saved_kg: 210, processing_status: 'in_transit', collection_date: '2026-06-03', driver: 'Muthu Rajan', revenue_sgd: 630 },
  { id: 'C-2026-086', source: 'Suntec City', address: '3 Temasek Blvd', material_category: 'metals', gross_weight_kg: 210, net_weight_kg: 198, co2_saved_kg: 990, processing_status: 'completed', collection_date: '2026-06-03', driver: 'Ahmad Razif', revenue_sgd: 594 },
  { id: 'C-2026-085', source: 'Marina Bay Sands', address: '10 Bayfront Ave', material_category: 'mixed', gross_weight_kg: 560, net_weight_kg: 420, co2_saved_kg: 630, processing_status: 'received_at_facility', collection_date: '2026-06-02', driver: 'Tan Wei Ming', revenue_sgd: 378 },
];

const MATERIAL_LABELS = {
  paper_cardboard: { label: 'Paper / Cardboard', color: '#92400E', bg: '#FEF3C7' },
  plastics:        { label: 'Plastics',           color: '#1D4ED8', bg: '#DBEAFE' },
  metals:          { label: 'Metals',             color: '#374151', bg: '#F3F4F6' },
  e_waste:         { label: 'E-Waste',            color: '#7C3AED', bg: '#EDE9FE' },
  glass:           { label: 'Glass',              color: '#0369A1', bg: '#E0F2FE' },
  textiles:        { label: 'Textiles',           color: '#B45309', bg: '#FEF3C7' },
  organic:         { label: 'Organic',            color: '#166534', bg: '#DCFCE7' },
  mixed:           { label: 'Mixed',              color: '#6B7280', bg: '#F9FAFB' },
};

const STATUS_MAP = {
  collected:           { label: 'Collected',       icon: Package,      color: 'text-slate-700',   bg: 'bg-slate-50 border-slate-200' },
  in_transit:          { label: 'In Transit',       icon: Truck,        color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
  received_at_facility:{ label: 'At Facility',     icon: CheckCircle2, color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-200' },
  sorting:             { label: 'Sorting',          icon: Filter,       color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  processed:           { label: 'Processed',        icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  completed:           { label: 'Completed',        icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
};

export default function T2Collections() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newJob, setNewJob] = useState({ source: '', address: '', material_category: 'mixed', collection_date: '', gross_weight_kg: '', driver: '' });

  const filtered = DEMO_COLLECTIONS.filter(c => {
    const matchSearch = c.source.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.processing_status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalWeight = DEMO_COLLECTIONS.reduce((s, c) => s + c.net_weight_kg, 0);
  const totalCO2 = DEMO_COLLECTIONS.reduce((s, c) => s + c.co2_saved_kg, 0);
  const totalRevenue = DEMO_COLLECTIONS.reduce((s, c) => s + c.revenue_sgd, 0);

  return (
    <AppShell navigation={NAV} title="Collections — Renewed Resources">
      <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
        <PageHeader
          title="Collection Jobs"
          subtitle="Track all recycling pickups, processing, and material recovery"
          actions={
            <Button size="sm" className="gap-2 bg-[#16A34A] hover:bg-[#15803D]" onClick={() => setShowNewModal(true)}>
              <Plus className="w-3.5 h-3.5" /> New Collection
            </Button>
          }
        />

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Net Materials Recovered', value: `${totalWeight.toLocaleString()} kg` },
            { label: 'CO₂ Saved (Est.)', value: `${(totalCO2 / 1000).toFixed(1)} tonnes` },
            { label: 'Revenue Generated', value: `S$${totalRevenue.toLocaleString()}` },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-xl font-display font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Search by source or reference..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 text-sm border border-border rounded-lg bg-background"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Collection list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map(c => {
              const mat = MATERIAL_LABELS[c.material_category] || MATERIAL_LABELS.mixed;
              const st = STATUS_MAP[c.processing_status] || STATUS_MAP.collected;
              const StatusIcon = st.icon;
              return (
                <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: mat.bg }}>
                      <Recycle className="w-4 h-4" style={{ color: mat.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{c.source}</p>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ color: mat.color, background: mat.bg }}>{mat.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{c.id} · {c.address} · {c.collection_date}</p>
                      <p className="text-xs text-muted-foreground">Driver: {c.driver} · Net: {c.net_weight_kg} kg · CO₂ saved: {c.co2_saved_kg} kg</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-12 sm:ml-0 flex-shrink-0">
                    <p className="text-sm font-semibold text-foreground">S${c.revenue_sgd}</p>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border ${st.bg} ${st.color}`}>
                      <StatusIcon className="w-3 h-3" /> {st.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* New Collection Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <p className="font-heading font-semibold text-foreground">Log New Collection Job</p>
              <button onClick={() => setShowNewModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: 'Source / Client Name', field: 'source', type: 'text', placeholder: 'e.g. CapitaLand HQ' },
                { label: 'Collection Address', field: 'address', type: 'text', placeholder: '168 Robinson Rd' },
                { label: 'Collection Date', field: 'collection_date', type: 'date' },
                { label: 'Gross Weight (kg)', field: 'gross_weight_kg', type: 'number', placeholder: '0' },
                { label: 'Assigned Driver', field: 'driver', type: 'text', placeholder: 'Driver name' },
              ].map(f => (
                <div key={f.field}>
                  <label className="block text-xs font-medium text-foreground mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={newJob[f.field]}
                    onChange={e => setNewJob(p => ({ ...p, [f.field]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Material Category</label>
                <select
                  value={newJob.material_category}
                  onChange={e => setNewJob(p => ({ ...p, material_category: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                >
                  {Object.entries(MATERIAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" className="flex-1" onClick={() => setShowNewModal(false)}>Cancel</Button>
              <Button className="flex-1 gap-2 bg-[#16A34A] hover:bg-[#15803D]" onClick={() => setShowNewModal(false)}>
                <Plus className="w-4 h-4" /> Log Collection
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}