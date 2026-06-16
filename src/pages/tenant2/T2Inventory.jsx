import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Button } from '@/components/ui/button';
import { Search, Plus, AlertTriangle, CheckCircle2, TrendingDown, Package, X } from 'lucide-react';
import { T2_NAV, T2_TENANT } from '@/lib/tenant-nav';

const CATEGORY_LABELS = { paper_cardboard: 'Paper / Cardboard', plastics: 'Plastics', metals: 'Metals', e_waste: 'E-Waste', glass: 'Glass', textiles: 'Textiles', organic: 'Organic', mixed: 'Mixed' };
const CATEGORY_COLORS = { paper_cardboard: 'bg-amber-50 text-amber-700', plastics: 'bg-blue-50 text-blue-700', metals: 'bg-slate-100 text-slate-700', e_waste: 'bg-purple-50 text-purple-700', glass: 'bg-cyan-50 text-cyan-700', textiles: 'bg-pink-50 text-pink-700', organic: 'bg-green-50 text-green-700', mixed: 'bg-gray-100 text-gray-700' };

function getStockStatus(item) {
  if (item.current_stock <= item.reorder_point) return 'low';
  if (item.current_stock <= item.par_level) return 'ok';
  return 'good';
}

export default function T2Inventory() {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', category: 'mixed', unit: 'kg', current_stock: '', par_level: '', cost_per_unit: '', storage_location: '' });

  const materials = [];
  const filtered = materials.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || m.category === filterCat;
    return matchSearch && matchCat;
  });

  const totalValue = 0;
  const lowStockCount = 0;
  const totalKg = 0;

  return (
    <AppShell navigation={T2_NAV} tenant={T2_TENANT} title="" headerRight={<TenantSwitcher />}>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <PageHeader
          title="Recovered Materials"
          subtitle="Renewed Resources Pte Ltd · Facility stock levels & material registry"
          actions={
            <Button size="sm" className="gap-2" style={{ background: '#16A34A' }} onClick={() => setShowModal(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Material
            </Button>
          }
        />

        {/* Low-stock alert */}
        {lowStockCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <TrendingDown className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm font-medium text-amber-700">
              {lowStockCount} material{lowStockCount > 1 ? 's are' : ' is'} below reorder point and may need dispatch scheduling.
            </p>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Material SKUs', value: 0, color: 'text-foreground', bg: 'bg-card border-border' },
            { label: 'Low / Reorder', value: lowStockCount, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
            { label: 'Total Stock (kg)', value: totalKg.toLocaleString(), color: 'text-[#16A34A]', bg: 'bg-[#F0FDF4] border-green-200' },
            { label: 'Est. Facility Value', value: `S$${totalValue.toFixed(0)}`, color: 'text-primary', bg: 'bg-orbitan-blue-light border-blue-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
              <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Category Quick Filter */}
        <div className="flex gap-2 flex-wrap">
          {['all', ...Object.keys(CATEGORY_LABELS)].map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all capitalize ${filterCat === cat ? 'bg-[#16A34A] text-white border-[#16A34A]' : 'bg-card text-muted-foreground border-border hover:border-[#16A34A]/50'}`}>
              {cat === 'all' ? 'All Categories' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Search materials by name..." value={search} onChange={e => setSearch(e.target.value)} />
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
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Par / Reorder</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Value</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Location</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Last Collected</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(m => {
                  const status = getStockStatus(m);
                  const value = (m.current_stock * m.cost_per_unit).toFixed(2);
                  return (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedItem(m)}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground">S${m.cost_per_unit}/{m.unit}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[m.category] || 'bg-muted text-muted-foreground'}`}>
                          {CATEGORY_LABELS[m.category] || m.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${status === 'low' ? 'text-amber-600' : 'text-foreground'}`}>{m.current_stock.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground ml-1">{m.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell text-xs text-muted-foreground">
                        <span>{m.par_level}</span> / <span className="text-amber-600">{m.reorder_point}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="text-sm font-medium text-foreground">S${value}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{m.storage_location}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{m.last_collection}</td>
                      <td className="px-4 py-3">
                        {status === 'low' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> Reorder
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#16A34A] border border-green-200">
                            <CheckCircle2 className="w-3 h-3" /> {status === 'good' ? 'Good' : 'OK'}
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

        {/* Stock breakdown bar */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm font-semibold text-foreground mb-3">Stock Distribution by Category</p>
          <div className="space-y-2.5">
            {Object.keys(CATEGORY_LABELS).map(cat => {
              const items = materials.filter(m => m.category === cat);
              const totalStock = items.reduce((s, m) => s + m.current_stock, 0);
              if (totalStock === 0) return null;
              const pct = Math.round((totalStock / totalKg) * 100);
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[cat]}</span>
                    <span className="text-xs font-medium text-foreground">{totalStock.toLocaleString()} kg · {pct}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-[#16A34A]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Side Panel */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
          <div className="bg-white w-full max-w-sm h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <p className="font-heading font-semibold text-foreground">{selectedItem.name}</p>
              <button onClick={() => setSelectedItem(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Current Stock', value: `${selectedItem.current_stock} ${selectedItem.unit}` },
                  { label: 'Par Level', value: `${selectedItem.par_level} ${selectedItem.unit}` },
                  { label: 'Reorder Point', value: `${selectedItem.reorder_point} ${selectedItem.unit}` },
                  { label: 'Cost / Unit', value: `S$${selectedItem.cost_per_unit}` },
                  { label: 'Total Value', value: `S$${(selectedItem.current_stock * selectedItem.cost_per_unit).toFixed(2)}` },
                  { label: 'Location', value: selectedItem.storage_location },
                ].map(f => (
                  <div key={f.label} className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">{f.label}</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Category</p>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${CATEGORY_COLORS[selectedItem.category]}`}>{CATEGORY_LABELS[selectedItem.category]}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Last Collection Date</p>
                <p className="text-sm font-medium text-foreground">{selectedItem.last_collection}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1">Adjust Stock</Button>
                <Button size="sm" className="flex-1" style={{ background: '#16A34A' }}>Create PO</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Material Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <p className="font-heading font-semibold text-foreground">Register New Material</p>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: 'Material Name', field: 'name', type: 'text', placeholder: 'e.g. Cardboard (Grade A)' },
                { label: 'Current Stock (kg)', field: 'current_stock', type: 'number', placeholder: '0' },
                { label: 'Par Level (kg)', field: 'par_level', type: 'number', placeholder: '0' },
                { label: 'Cost per Unit (S$)', field: 'cost_per_unit', type: 'number', placeholder: '0.00' },
                { label: 'Storage Location', field: 'storage_location', type: 'text', placeholder: 'e.g. Bay A1' },
              ].map(f => (
                <div key={f.field}>
                  <label className="block text-xs font-medium text-foreground mb-1">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={newItem[f.field]} onChange={e => setNewItem(p => ({ ...p, [f.field]: e.target.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Category</label>
                <select value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" style={{ background: '#16A34A' }} onClick={() => setShowModal(false)}>
                <Package className="w-4 h-4" /> Register Material
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}