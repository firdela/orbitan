import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Recycle, Package, ShoppingCart, CheckSquare, Shield,
  BarChart2, Users, Leaf, Search, Plus, AlertTriangle, CheckCircle2
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

const DEMO_MATERIALS = [
  { id: 'm1', name: 'Cardboard (Grade A)', category: 'paper_cardboard', unit: 'kg', current_stock: 840, par_level: 200, reorder_point: 150, cost_per_unit: 0.12, storage_location: 'Bay A1', status: 'active' },
  { id: 'm2', name: 'Clear PET Bottles', category: 'plastics', unit: 'kg', current_stock: 320, par_level: 100, reorder_point: 80, cost_per_unit: 0.28, storage_location: 'Bay B2', status: 'active' },
  { id: 'm3', name: 'Aluminium Cans', category: 'metals', unit: 'kg', current_stock: 95, par_level: 150, reorder_point: 100, cost_per_unit: 1.20, storage_location: 'Bay C1', status: 'active' },
  { id: 'm4', name: 'Mixed E-Waste', category: 'e_waste', unit: 'kg', current_stock: 42, par_level: 50, reorder_point: 30, cost_per_unit: 2.50, storage_location: 'Secure Bay D', status: 'active' },
  { id: 'm5', name: 'Glass Bottles', category: 'glass', unit: 'kg', current_stock: 210, par_level: 100, reorder_point: 80, cost_per_unit: 0.08, storage_location: 'Bay B3', status: 'active' },
  { id: 'm6', name: 'HDPE Plastic (Mixed)', category: 'plastics', unit: 'kg', current_stock: 55, par_level: 100, reorder_point: 70, cost_per_unit: 0.35, storage_location: 'Bay B4', status: 'active' },
  { id: 'm7', name: 'Copper Wire Scrap', category: 'metals', unit: 'kg', current_stock: 18, par_level: 30, reorder_point: 20, cost_per_unit: 8.50, storage_location: 'Secure Bay E', status: 'active' },
  { id: 'm8', name: 'Textiles (Mixed)', category: 'textiles', unit: 'kg', current_stock: 380, par_level: 200, reorder_point: 150, cost_per_unit: 0.05, storage_location: 'Bay F1', status: 'active' },
];

const CATEGORY_LABELS = {
  paper_cardboard: 'Paper / Cardboard',
  plastics: 'Plastics',
  metals: 'Metals',
  e_waste: 'E-Waste',
  glass: 'Glass',
  textiles: 'Textiles',
  organic: 'Organic',
  mixed: 'Mixed',
};

const CATEGORY_COLORS = {
  paper_cardboard: 'bg-amber-50 text-amber-700',
  plastics: 'bg-blue-50 text-blue-700',
  metals: 'bg-slate-100 text-slate-700',
  e_waste: 'bg-purple-50 text-purple-700',
  glass: 'bg-cyan-50 text-cyan-700',
  textiles: 'bg-pink-50 text-pink-700',
  organic: 'bg-green-50 text-green-700',
  mixed: 'bg-gray-100 text-gray-700',
};

function getStockStatus(item) {
  if (item.current_stock <= item.reorder_point) return 'low';
  if (item.current_stock <= item.par_level) return 'ok';
  return 'good';
}

export default function T2Inventory() {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');

  const filtered = DEMO_MATERIALS.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || m.category === filterCat;
    return matchSearch && matchCat;
  });

  const totalValue = DEMO_MATERIALS.reduce((sum, m) => sum + m.current_stock * m.cost_per_unit, 0);
  const lowStockCount = DEMO_MATERIALS.filter(m => getStockStatus(m) === 'low').length;

  return (
    <AppShell navigation={NAV} title="Recovered Materials — Inventory">
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <PageHeader
          title="Recovered Materials"
          subtitle="Renewed Resources Pte Ltd · Material stock levels"
          actions={
            <Button size="sm" className="gap-2" style={{ background: '#16A34A' }}>
              <Plus className="w-3.5 h-3.5" /> Add Material
            </Button>
          }
        />

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Materials', value: DEMO_MATERIALS.length, color: 'text-foreground', bg: 'bg-card border-border' },
            { label: 'Low Stock Items', value: lowStockCount, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
            { label: 'Total Stock (kg)', value: DEMO_MATERIALS.reduce((s, m) => s + m.current_stock, 0).toLocaleString(), color: 'text-[#16A34A]', bg: 'bg-[#F0FDF4] border-green-200' },
            { label: 'Est. Value (S$)', value: `S$${totalValue.toFixed(0)}`, color: 'text-primary', bg: 'bg-orbitan-blue-light border-blue-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
              <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
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
              placeholder="Search materials..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none"
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Material</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stock</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Par Level</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Location</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(m => {
                  const status = getStockStatus(m);
                  return (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground">S${m.cost_per_unit}/kg</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[m.category] || 'bg-muted text-muted-foreground'}`}>
                          {CATEGORY_LABELS[m.category] || m.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-foreground">{m.current_stock.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground ml-1">{m.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="text-muted-foreground">{m.par_level} {m.unit}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{m.storage_location}</td>
                      <td className="px-4 py-3">
                        {status === 'low' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> Low
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#16A34A] border border-green-200">
                            <CheckCircle2 className="w-3 h-3" /> OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}