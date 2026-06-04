import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import {
  ShoppingBag, Package, FileText, Users, CheckSquare,
  BarChart2, ShoppingCart, Leaf, Heart, Search, Plus,
  AlertTriangle, CheckCircle2, Shirt
} from 'lucide-react';

const NAV = [
  { type: 'section', label: 'Retail Ops' },
  { href: '/t3/dashboard', icon: ShoppingBag, label: 'Dashboard' },
  { href: '/t3/catalog', icon: Shirt, label: 'Product Catalog' },
  { href: '/t3/inventory', icon: Package, label: 'Inventory' },
  { href: '/t3/sales', icon: FileText, label: 'Sales & POS' },
  { href: '/t3/customers', icon: Heart, label: 'Customers' },
  { type: 'section', label: 'People & Tasks' },
  { href: '/t3/workforce', icon: Users, label: 'Workforce' },
  { href: '/t3/tasks', icon: CheckSquare, label: 'Tasks' },
  { type: 'section', label: 'Intelligence' },
  { href: '/t3/reporting', icon: BarChart2, label: 'Reporting' },
];

const DEMO_ITEMS = [
  { id: 'i1', name: 'Uniqlo Linen Shirt (M)', sku: 'SKU-0091', category: 'tops', current_stock: 4, par_level: 3, cost_per_unit: 5, selling_price: 28, location: 'Rack A3', status: 'active' },
  { id: 'i2', name: 'Levi\'s 501 Jeans (32x30)', sku: 'SKU-0092', category: 'bottoms', current_stock: 2, par_level: 3, cost_per_unit: 12, selling_price: 55, location: 'Rack B1', status: 'active' },
  { id: 'i3', name: 'North Face Fleece Jacket (L)', sku: 'SKU-0093', category: 'outerwear', current_stock: 1, par_level: 2, cost_per_unit: 20, selling_price: 75, location: 'Rack C2', status: 'active' },
  { id: 'i4', name: 'Vintage Adidas Track Pants (M)', sku: 'SKU-0094', category: 'bottoms', current_stock: 6, par_level: 3, cost_per_unit: 8, selling_price: 32, location: 'Rack B2', status: 'active' },
  { id: 'i5', name: 'H&M Floral Midi Dress (S)', sku: 'SKU-0095', category: 'tops', current_stock: 3, par_level: 2, cost_per_unit: 6, selling_price: 24, location: 'Rack A1', status: 'active' },
  { id: 'i6', name: 'Nike Air Max 90 (US9)', sku: 'SKU-0096', category: 'footwear', current_stock: 0, par_level: 2, cost_per_unit: 30, selling_price: 88, location: 'Shelf S1', status: 'active' },
  { id: 'i7', name: 'Leather Tote Bag (Brown)', sku: 'SKU-0097', category: 'bags', current_stock: 5, par_level: 3, cost_per_unit: 15, selling_price: 48, location: 'Shelf A4', status: 'active' },
  { id: 'i8', name: 'Upcycled Patchwork Tee (M)', sku: 'SKU-0098', category: 'tops', current_stock: 8, par_level: 5, cost_per_unit: 3, selling_price: 18, location: 'Rack A2', status: 'active' },
];

const CAT_LABELS = { tops: 'Tops', bottoms: 'Bottoms', outerwear: 'Outerwear', footwear: 'Footwear', accessories: 'Accessories', bags: 'Bags', home_goods: 'Home Goods', other: 'Other' };
const CAT_COLORS = { tops: 'bg-pink-50 text-pink-700', bottoms: 'bg-blue-50 text-blue-700', outerwear: 'bg-amber-50 text-amber-700', footwear: 'bg-purple-50 text-purple-700', bags: 'bg-teal-50 text-teal-700', accessories: 'bg-orange-50 text-orange-700', other: 'bg-muted text-muted-foreground' };

function getStockStatus(item) {
  if (item.current_stock === 0) return 'out';
  if (item.current_stock < item.par_level) return 'low';
  return 'ok';
}

export default function T3Inventory() {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');

  const filtered = DEMO_ITEMS.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || i.category === filterCat;
    return matchSearch && matchCat;
  });

  const totalValue = DEMO_ITEMS.reduce((s, i) => s + i.current_stock * i.selling_price, 0);
  const lowCount = DEMO_ITEMS.filter(i => getStockStatus(i) === 'low').length;
  const outCount = DEMO_ITEMS.filter(i => getStockStatus(i) === 'out').length;

  return (
    <AppShell navigation={NAV} title="Inventory — Retail Ops">
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <PageHeader
          title="Inventory"
          subtitle="Retail Operations · Stock & warehouse visibility"
          actions={
            <Button size="sm" className="gap-2" style={{ background: '#22C55E' }}>
              <Plus className="w-3.5 h-3.5" /> Add Item
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total SKUs', value: DEMO_ITEMS.length, color: 'text-foreground', bg: 'bg-card border-border' },
            { label: 'Out of Stock', value: outCount, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
            { label: 'Low Stock', value: lowCount, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
            { label: 'Inventory Value', value: `S$${totalValue.toLocaleString()}`, color: 'text-[#22C55E]', bg: 'bg-[#F0FDF4] border-green-200' },
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
            <input className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Search by name or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="all">All Categories</option>
            {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
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
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Price</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Location</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(item => {
                  const ss = getStockStatus(item);
                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.sku}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CAT_COLORS[item.category] || 'bg-muted text-muted-foreground'}`}>
                          {CAT_LABELS[item.category] || item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${ss === 'out' ? 'text-red-600' : 'text-foreground'}`}>{item.current_stock}</span>
                        <span className="text-xs text-muted-foreground ml-1">pcs</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="font-medium text-foreground">S${item.selling_price}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{item.location}</td>
                      <td className="px-4 py-3">
                        {ss === 'out' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Out of Stock</span>
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
      </div>
    </AppShell>
  );
}