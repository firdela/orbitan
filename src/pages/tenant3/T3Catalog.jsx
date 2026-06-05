import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Button } from '@/components/ui/button';
import { Plus, Search, Shirt, X } from 'lucide-react';
import { T3_NAV, T3_TENANT } from '@/lib/tenant-nav';

const DEMO_PRODUCTS = [
  { id: 'P-001', name: "Vintage Levi's 501 Denim Jacket", sku: 'LV-DNM-M-001', category: 'outerwear', gender: 'unisex', size: 'M', colour: 'Indigo', brand: "Levi's", condition_grade: 'B_like_new', selling_price_sgd: 48, cost_price_sgd: 8, current_stock: 1, sourced_from: 'recycling_stream', is_pos_ready: true, co2_saved_kg: 8.4, status: 'active' },
  { id: 'P-002', name: 'Upcycled Floral Patchwork Dress', sku: 'UP-DRS-S-002', category: 'bottoms', gender: 'womens', size: 'S', colour: 'Multi', brand: 'Upcycled by RRO', condition_grade: 'E_upcycled', selling_price_sgd: 35, cost_price_sgd: 12, current_stock: 3, sourced_from: 'recycling_stream', is_pos_ready: true, co2_saved_kg: 4.2, status: 'active' },
  { id: 'P-003', name: 'H&M Striped Cotton Tee', sku: 'HM-TOP-M-003', category: 'tops', gender: 'unisex', size: 'M', colour: 'Navy/White', brand: 'H&M', condition_grade: 'C_good', selling_price_sgd: 12, cost_price_sgd: 2, current_stock: 5, sourced_from: 'donation', is_pos_ready: true, co2_saved_kg: 2.1, status: 'active' },
  { id: 'P-004', name: 'Nike Dri-FIT Running Shorts', sku: 'NK-SRT-L-004', category: 'bottoms', gender: 'mens', size: 'L', colour: 'Black', brand: 'Nike', condition_grade: 'B_like_new', selling_price_sgd: 22, cost_price_sgd: 4, current_stock: 2, sourced_from: 'trade_in', is_pos_ready: true, co2_saved_kg: 3.8, status: 'active' },
  { id: 'P-005', name: 'Zara Structured Blazer', sku: 'ZR-BLZ-S-005', category: 'outerwear', gender: 'womens', size: 'S', colour: 'Camel', brand: 'Zara', condition_grade: 'A_new_with_tags', selling_price_sgd: 65, cost_price_sgd: 15, current_stock: 1, sourced_from: 'donation', is_pos_ready: false, co2_saved_kg: 12.6, status: 'draft' },
];

const GRADE_MAP = {
  A_new_with_tags: { label: 'New w/ Tags', color: '#16A34A', bg: '#DCFCE7' },
  B_like_new:      { label: 'Like New',    color: '#2563EB', bg: '#DBEAFE' },
  C_good:          { label: 'Good',        color: '#D97706', bg: '#FEF3C7' },
  D_fair:          { label: 'Fair',        color: '#9CA3AF', bg: '#F3F4F6' },
  E_upcycled:      { label: 'Upcycled ♻', color: '#7C3AED', bg: '#EDE9FE' },
};

export default function T3Catalog() {
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);

  const filtered = DEMO_PRODUCTS.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchGrade = filterGrade === 'all' || p.condition_grade === filterGrade;
    const matchCat = filterCategory === 'all' || p.category === filterCategory;
    return matchSearch && matchGrade && matchCat;
  });

  return (
    <AppShell navigation={T3_NAV} tenant={T3_TENANT} title="" headerRight={<TenantSwitcher />}>
      <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
        <PageHeader
          title="Product Catalog"
          subtitle="Manage your upcycled and reused clothing inventory"
          actions={
            <Button size="sm" className="gap-2" style={{ background: '#22C55E' }} onClick={() => setShowModal(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Product
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Listed', value: DEMO_PRODUCTS.length },
            { label: 'POS Ready', value: DEMO_PRODUCTS.filter(p => p.is_pos_ready).length },
            { label: 'Upcycled', value: DEMO_PRODUCTS.filter(p => p.condition_grade === 'E_upcycled').length },
            { label: 'Total CO₂ Saved', value: `${DEMO_PRODUCTS.reduce((s, p) => s + p.co2_saved_kg, 0).toFixed(1)}kg` },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-display font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="px-3 py-2 text-sm border border-border rounded-lg bg-background" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
            <option value="all">All Grades</option>
            {Object.entries(GRADE_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="px-3 py-2 text-sm border border-border rounded-lg bg-background" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            <option value="tops">Tops</option>
            <option value="bottoms">Bottoms</option>
            <option value="outerwear">Outerwear</option>
            <option value="footwear">Footwear</option>
            <option value="accessories">Accessories</option>
          </select>
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(p => {
            const grade = GRADE_MAP[p.condition_grade] || GRADE_MAP.C_good;
            const margin = p.selling_price_sgd > 0 ? Math.round(((p.selling_price_sgd - p.cost_price_sgd) / p.selling_price_sgd) * 100) : 0;
            return (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: grade.bg }}>
                      <Shirt className="w-5 h-5" style={{ color: grade.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.sku} · {p.brand} · {p.size} · {p.colour}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-bold text-foreground">S${p.selling_price_sgd}</p>
                    <p className="text-[10px] text-emerald-600 font-medium">{margin}% margin</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ color: grade.color, background: grade.bg }}>{grade.label}</span>
                    {p.is_pos_ready && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">POS Ready</span>
                    )}
                    <span className="text-[11px] text-muted-foreground">Stock: {p.current_stock}</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium">🌿 {p.co2_saved_kg}kg CO₂</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-white">
              <p className="font-heading font-semibold text-foreground">Add New Product</p>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: 'Product Name', field: 'name', type: 'text', placeholder: 'e.g. Vintage Denim Jacket' },
                { label: 'Brand', field: 'brand', type: 'text', placeholder: 'e.g. Levi\'s' },
                { label: 'SKU', field: 'sku', type: 'text', placeholder: 'e.g. LV-DNM-M-001' },
                { label: 'Size', field: 'size', type: 'text', placeholder: 'e.g. M, 32, UK8' },
                { label: 'Colour', field: 'colour', type: 'text', placeholder: 'e.g. Indigo' },
                { label: 'Selling Price (S$)', field: 'price', type: 'number', placeholder: '0.00' },
              ].map(f => (
                <div key={f.field}>
                  <label className="block text-xs font-medium text-foreground mb-1">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Condition Grade</label>
                <select className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background">
                  {Object.entries(GRADE_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" style={{ background: '#22C55E' }} onClick={() => setShowModal(false)}>
                <Plus className="w-4 h-4" /> Add Product
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}