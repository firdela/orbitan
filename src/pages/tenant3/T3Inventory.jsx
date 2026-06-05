import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Button } from '@/components/ui/button';
import { Search, Plus, AlertTriangle, CheckCircle2, X, Package } from 'lucide-react';
import { T3_NAV, T3_TENANT } from '@/lib/tenant-nav';

const DEMO_ITEMS = [
  { id: 'i1', name: 'Uniqlo Linen Shirt (M)', sku: 'SKU-0091', category: 'tops', current_stock: 4, par_level: 3, cost_per_unit: 5, selling_price: 28, location: 'Rack A3', sourced: 'donation', co2_saved: 2.1 },
  { id: 'i2', name: "Levi's 501 Jeans (32x30)", sku: 'SKU-0092', category: 'bottoms', current_stock: 2, par_level: 3, cost_per_unit: 12, selling_price: 55, location: 'Rack B1', sourced: 'recycling_stream', co2_saved: 8.4 },
  { id: 'i3', name: 'North Face Fleece Jacket (L)', sku: 'SKU-0093', category: 'outerwear', current_stock: 1, par_level: 2, cost_per_unit: 20, selling_price: 75, location: 'Rack C2', sourced: 'trade_in', co2_saved: 12.6 },
  { id: 'i4', name: 'Vintage Adidas Track Pants (M)', sku: 'SKU-0094', category: 'bottoms', current_stock: 6, par_level: 3, cost_per_unit: 8, selling_price: 32, location: 'Rack B2', sourced: 'recycling_stream', co2_saved: 4.2 },
  { id: 'i5', name: 'H&M Floral Midi Dress (S)', sku: 'SKU-0095', category: 'tops', current_stock: 3, par_level: 2, cost_per_unit: 6, selling_price: 24, location: 'Rack A1', sourced: 'donation', co2_saved: 3.8 },
  { id: 'i6', name: 'Nike Air Max 90 (US9)', sku: 'SKU-0096', category: 'footwear', current_stock: 0, par_level: 2, cost_per_unit: 30, selling_price: 88, location: 'Shelf S1', sourced: 'trade_in', co2_saved: 5.2 },
  { id: 'i7', name: 'Leather Tote Bag (Brown)', sku: 'SKU-0097', category: 'bags', current_stock: 5, par_level: 3, cost_per_unit: 15, selling_price: 48, location: 'Shelf A4', sourced: 'recycling_stream', co2_saved: 4.8 },
  { id: 'i8', name: 'Upcycled Patchwork Tee (M)', sku: 'SKU-0098', category: 'tops', current_stock: 8, par_level: 5, cost_per_unit: 3, selling_price: 18, location: 'Rack A2', sourced: 'recycling_stream', co2_saved: 1.2 },
];

const CAT_LABELS = { tops: 'Tops', bottoms: 'Bottoms', outerwear: 'Outerwear', footwear: 'Footwear', accessories: 'Accessories', bags: 'Bags', home_goods: 'Home Goods', other: 'Other' };
const CAT_COLORS = { tops: 'bg-pink-50 text-pink-700', bottoms: 'bg-blue-50 text-blue-700', outerwear: 'bg-amber-50 text-amber-700', footwear: 'bg-purple-50 text-purple-700', bags: 'bg-teal-50 text-teal-700', accessories: 'bg-orange-50 text-orange-700', other: 'bg-muted text-muted-foreground' };
const SOURCE_LABELS = { recycling_stream: '♻ Recycling', donation: '🎁 Donation', trade_in: '🔄 Trade-In', direct_purchase: '🛍 Purchase', partner: '🤝 Partner' };

function getStockStatus(item) {
  if (item.current_stock === 0) return 'out';
  if (item.current_stock < item.par_level) return 'low';
  return 'ok';
}

export default function T3Inventory() {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = DEMO_ITEMS.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || i.category === filterCat;
    return matchSearch && matchCat;
  });

  const totalValue = DEMO_ITEMS.reduce((s, i) => s + i.current_stock * i.selling_price, 0);
  const totalCO2 = DEMO_ITEMS.reduce((s, i) => s + i.co2_saved, 0).toFixed(1);
  const lowCount = DEMO_ITEMS.filter(i => getStockStatus(i) === 'low').length;
  const outCount = DEMO_ITEMS.filter(i => getStockStatus(i) === 'out').length;

  return (
    <AppShell navigation={T3_NAV} tenant={T3_TENANT} title="" headerRight={<TenantSwitcher />}>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <PageHeader
          title="Inventory"
          subtitle="Renewed Fashion · Floor stock & stockroom visibility"
          actions={
            <Button size="sm" className="gap-2" style={{ background: '#22C55E' }} onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Item
            </Button>
          }
        />

        {(outCount > 0 || lowCount > 0) && (
          <div className={`rounded-xl border p-4 flex items-center gap-3 ${outCount > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${outCount > 0 ? 'text-red-500' : 'text-amber-500'}`} />
            <p className={`text-sm font-medium ${outCount > 0 ? 'text-red-700' : 'text-amber-700'}`}>
              {outCount > 0 ? `${outCount} item${outCount > 1 ? 's are' : ' is'} out of stock.` : ''}{outCount > 0 && lowCount > 0 ? ' ' : ''}{lowCount > 0 ? `${lowCount} item${lowCount > 1 ? 's are' : ' is'} running low.` : ''}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total SKUs', value: DEMO_ITEMS.length, color: 'text-foreground', bg: 'bg-card border-border' },
            { label: 'Out of Stock', value: outCount, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
            { label: 'Inventory Value', value: `S$${totalValue.toLocaleString()}`, color: 'text-[#22C55E]', bg: 'bg-[#F0FDF4] border-green-200' },
            { label: 'Total CO₂ Saved', value: `${totalCO2}kg`, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
              <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Category filter pills */}
        <div className="flex gap-2 flex-wrap">
          {['all', ...Object.keys(CAT_LABELS)].map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${filterCat === cat ? 'bg-[#22C55E] text-white border-[#22C55E]' : 'bg-card text-muted-foreground border-border hover:border-[#22C55E]/50'}`}>
              {cat === 'all' ? 'All Categories' : CAT_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Search by name or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Item</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stock</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Sell Price</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Margin</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Location</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(item => {
                  const ss = getStockStatus(item);
                  const margin = Math.round(((item.selling_price - item.cost_per_unit) / item.selling_price) * 100);
                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedItem(item)}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.sku}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CAT_COLORS[item.category] || 'bg-muted text-muted-foreground'}`}>{CAT_LABELS[item.category] || item.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${ss === 'out' ? 'text-red-600' : ss === 'low' ? 'text-amber-600' : 'text-foreground'}`}>{item.current_stock}</span>
                        <span className="text-xs text-muted-foreground ml-1">pcs</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="font-medium text-foreground">S${item.selling_price}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="text-sm font-medium text-emerald-600">{margin}%</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{item.location}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{SOURCE_LABELS[item.sourced] || item.sourced}</td>
                      <td className="px-4 py-3">
                        {ss === 'out' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Out</span>
                        ) : ss === 'low' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"><AlertTriangle className="w-3 h-3" />Low</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#22C55E] border border-green-200"><CheckCircle2 className="w-3 h-3" />OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* CO2 / Sustainability summary */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-emerald-800 mb-3">🌿 Sustainability Impact — Current Stock</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'CO₂ Diverted', value: `${totalCO2} kg` },
              { label: 'Items Diverted', value: `${DEMO_ITEMS.reduce((s, i) => s + i.current_stock, 0)} pcs` },
              { label: 'Avg Margin', value: `${Math.round(DEMO_ITEMS.reduce((s, i) => s + ((i.selling_price - i.cost_per_unit) / i.selling_price) * 100, 0) / DEMO_ITEMS.length)}%` },
              { label: 'Potential Revenue', value: `S$${totalValue.toLocaleString()}` },
            ].map(s => (
              <div key={s.label} className="bg-white/70 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-emerald-800">{s.value}</p>
                <p className="text-[11px] text-emerald-600">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Item Detail Drawer */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
          <div className="bg-white w-full max-w-sm h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <p className="font-heading font-semibold text-foreground">Item Detail</p>
              <button onClick={() => setSelectedItem(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm font-semibold text-foreground">{selectedItem.name}</p>
              <p className="text-xs text-muted-foreground">{selectedItem.sku}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Current Stock', value: `${selectedItem.current_stock} pcs` },
                  { label: 'Par Level', value: `${selectedItem.par_level} pcs` },
                  { label: 'Cost Price', value: `S$${selectedItem.cost_per_unit}` },
                  { label: 'Selling Price', value: `S$${selectedItem.selling_price}` },
                  { label: 'Gross Margin', value: `${Math.round(((selectedItem.selling_price - selectedItem.cost_per_unit) / selectedItem.selling_price) * 100)}%` },
                  { label: 'CO₂ Saved', value: `${selectedItem.co2_saved} kg` },
                ].map(f => (
                  <div key={f.label} className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">{f.label}</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Source</p>
                <p className="text-sm font-medium text-foreground">{SOURCE_LABELS[selectedItem.sourced]}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Location</p>
                <p className="text-sm font-medium text-foreground">{selectedItem.location}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1">Adjust Stock</Button>
                <Button size="sm" className="flex-1" style={{ background: '#22C55E' }}>Move to POS</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <p className="font-heading font-semibold">Add New Item</p>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: 'Item Name', type: 'text', placeholder: 'e.g. Vintage Denim Jacket (M)' },
                { label: 'SKU', type: 'text', placeholder: 'e.g. SKU-0099' },
                { label: 'Selling Price (S$)', type: 'number', placeholder: '0.00' },
                { label: 'Cost Price (S$)', type: 'number', placeholder: '0.00' },
                { label: 'Stock Location', type: 'text', placeholder: 'e.g. Rack A3' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-medium text-foreground mb-1">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Category</label>
                <select className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background">
                  {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" style={{ background: '#22C55E' }} onClick={() => setShowAdd(false)}>
                <Package className="w-4 h-4" /> Add Item
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}