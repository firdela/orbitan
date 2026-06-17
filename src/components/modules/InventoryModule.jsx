// ============================================================
// ORBITANOS — UNIVERSAL INVENTORY MODULE
// One component. Every industry. Zero duplication.
//
// Props:
//   packKey   — 'fnb' | 'recycling' | 'retail'
//   tenant    — { tenant_id, outlet_id, name, pack }
//   base44    — Pre-initialized SDK client
//   outlets   — Available outlets for filtering
//
// EXIT-READY: The adapter layer (lib/adapters/InventoryAdapter)
// handles all industry-specific mapping. This component only
// deals with the universal InventoryItem shape.
// ============================================================

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Package, Search, Plus, AlertTriangle, CheckCircle2,
  TrendingDown, ChevronRight, X, Filter, DollarSign,
  Layers, Archive
} from 'lucide-react';

import { adaptInventoryBatch, getInventoryEntityName } from '@/lib/adapters/InventoryAdapter';
import { resolveModuleConfig } from '@/lib/identity/pack-registry';
import { PACK_BRAND } from '@/lib/orbitan-identity';

// ── Stat Card ────────────────────────────────────────────
function StatCard({ label, value, accent, icon: Icon, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-4 transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
      style={{ borderColor: `${accent}30`, backgroundColor: `${accent}08` }}
    >
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-4 h-4" style={{ color: accent }} />}
        <p className="text-2xl font-display font-bold" style={{ color: accent }}>{value}</p>
      </div>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────
function StockBadge({ alert, alertLabel }) {
  if (!alert || alert === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
        <CheckCircle2 className="w-3 h-3" /> OK
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      <AlertTriangle className="w-3 h-3" /> {alertLabel || 'Alert'}
    </span>
  );
}

// ── Add Item Modal ───────────────────────────────────────
function AddItemModal({ packKey, tenant, sdk, onClose, onSaved }) {
  const config = resolveModuleConfig(packKey, 'inventory');
  const accent = PACK_BRAND[packKey]?.color || '#2563EB';
  const entityName = getInventoryEntityName(packKey);

  // Different default fields per pack
  const defaults = {
    fnb:    { name: '', category: 'Meat', unit: 'kg', current_stock: 0, par_level: 0, cost_per_unit: 0, tenant_id: tenant?.tenant_id, outlet_id: tenant?.outlet_id },
    recycling: { material_name: '', material_type: 'mixed', total_weight_kg: 0, max_capacity_kg: 0, market_rate_per_kg: 0, tenant_id: tenant?.tenant_id, outlet_id: tenant?.outlet_id },
    retail:  { name: '', category: 'General', unit: 'piece', current_stock: 0, par_level: 0, cost_per_unit: 0, tenant_id: tenant?.tenant_id, outlet_id: tenant?.outlet_id },
  };

  const [form, setForm] = useState(defaults[packKey] || defaults.fnb);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => sdk?.entities?.[entityName]?.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', packKey] });
      onSaved?.();
      onClose();
    },
  });

  const fields = packKey === 'fnb' ? [
    { label: 'Item Name', key: 'name', type: 'text' },
    { label: 'Category', key: 'category', type: 'text' },
    { label: 'Unit', key: 'unit', type: 'text' },
    { label: 'Current Stock', key: 'current_stock', type: 'number' },
    { label: 'Par Level', key: 'par_level', type: 'number' },
    { label: 'Cost/Unit (S$)', key: 'cost_per_unit', type: 'number' },
  ] : packKey === 'recycling' ? [
    { label: 'Material Name', key: 'material_name', type: 'text' },
    { label: 'Material Type', key: 'material_type', type: 'text' },
    { label: 'Current Weight (kg)', key: 'total_weight_kg', type: 'number' },
    { label: 'Max Capacity (kg)', key: 'max_capacity_kg', type: 'number' },
    { label: 'Market Rate/kg (S$)', key: 'market_rate_per_kg', type: 'number' },
  ] : [
    { label: 'Product Name', key: 'name', type: 'text' },
    { label: 'Category', key: 'category', type: 'text' },
    { label: 'Unit', key: 'unit', type: 'text' },
    { label: 'Current Stock', key: 'current_stock', type: 'number' },
    { label: 'Par Level', key: 'par_level', type: 'number' },
    { label: 'Cost/Unit (S$)', key: 'cost_per_unit', type: 'number' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-lg text-slate-900">
            {packKey === 'recycling' ? 'Register Material' : 'Add Inventory Item'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium text-slate-600">{f.label}</label>
              <Input
                type={f.type}
                value={form[f.key] ?? ''}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                className="mt-1"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" style={{ backgroundColor: accent }} onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Detail Panel ─────────────────────────────────────────
function DetailPanel({ item, packKey, onClose }) {
  const accent = PACK_BRAND[packKey]?.color || '#2563EB';
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-sm h-full overflow-y-auto shadow-2xl animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <p className="font-heading font-semibold text-slate-900 truncate">{item.name}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Current Stock', value: `${item.currentStock} ${item.unit}` },
              { label: 'Par Level', value: `${item.parLevel} ${item.unit}` },
              { label: 'Cost / Unit', value: `S$${item.costPerUnit.toFixed(2)}` },
              { label: 'Total Value', value: `S$${item.totalValue.toFixed(2)}` },
              { label: 'Category', value: item.category },
              { label: 'Location', value: item.storageLocation || '—' },
            ].map(f => (
              <div key={f.label} className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500">{f.label}</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{f.value}</p>
              </div>
            ))}
          </div>
          {item.sku && (
            <div>
              <p className="text-xs text-slate-500">SKU</p>
              <p className="text-sm font-medium text-slate-900 font-mono">{item.sku}</p>
            </div>
          )}
          {item.supplierName && (
            <div>
              <p className="text-xs text-slate-500">Supplier</p>
              <p className="text-sm font-medium text-slate-900">{item.supplierName}</p>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" className="flex-1">Adjust Stock</Button>
            <Button size="sm" className="flex-1" style={{ backgroundColor: accent }}>Create PO</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────
export default function InventoryModule({ packKey = 'fnb', tenant = {}, base44: sdk }) {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterAlert, setFilterAlert] = useState(false);

  const accent = PACK_BRAND[packKey]?.color || '#2563EB';
  const config = resolveModuleConfig(packKey, 'inventory');
  const entityName = getInventoryEntityName(packKey);
  const label = config?.label || 'Inventory';

  // Fetch raw records
  const { data: rawItems = [], isLoading } = useQuery({
    queryKey: ['inventory', packKey, tenant?.tenant_id, tenant?.outlet_id],
    queryFn: async () => {
      if (!sdk) return [];
      const entity = sdk.entities?.[entityName];
      if (!entity) return [];
      const query = {};
      if (tenant?.tenant_id) query.tenant_id = tenant.tenant_id;
      if (tenant?.outlet_id) query.outlet_id = tenant.outlet_id;
      return entity.filter(query, config?.sortField || '-updated_date', 100);
    },
    enabled: !!sdk,
  });

  // Adapt to universal shape
  const items = useMemo(() => adaptInventoryBatch(rawItems, packKey), [rawItems, packKey]);

  // Filter
  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.name?.toLowerCase().includes(q) ||
        i.sku?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q) ||
        i.supplierName?.toLowerCase().includes(q)
      );
    }
    if (filterAlert) {
      result = result.filter(i => i.alert !== 'ok');
    }
    return result;
  }, [items, search, filterAlert]);

  // Stats
  const stats = useMemo(() => ({
    total: items.length,
    totalValue: items.reduce((s, i) => s + i.totalValue, 0),
    alerts: items.filter(i => i.alert !== 'ok').length,
    totalStock: items.reduce((s, i) => s + i.currentStock, 0),
  }), [items]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Items" value={stats.total} accent={accent} icon={Package} />
        <StatCard
          label="Low Stock Alerts"
          value={stats.alerts}
          accent="#F59E0B"
          icon={AlertTriangle}
          onClick={() => setFilterAlert(prev => !prev)}
        />
        <StatCard label={`Total Stock (${packKey === 'recycling' ? 'kg' : 'units'})`} value={stats.totalStock.toLocaleString()} accent="#16A34A" icon={Layers} />
        <StatCard label="Stock Value" value={`S$${stats.totalValue.toFixed(0)}`} accent="#2563EB" icon={DollarSign} />
      </div>

      {/* ── Alert Banner ── */}
      {stats.alerts > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <TrendingDown className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{stats.alerts} item{stats.alerts > 1 ? 's' : ''} need{stats.alerts === 1 ? 's' : ''} attention</p>
            <p className="text-xs text-amber-600">Review low stock and create replenishment orders.</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto text-xs" onClick={() => setFilterAlert(true)}>
            View Alerts
          </Button>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={`Search ${label.toLowerCase()}...`}
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant={filterAlert ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5"
          style={filterAlert ? { backgroundColor: '#F59E0B', borderColor: '#F59E0B' } : {}}
          onClick={() => setFilterAlert(p => !p)}
        >
          <Filter className="w-3.5 h-3.5" />
          {filterAlert ? 'Showing Alerts' : 'Low Stock Only'}
        </Button>
        <Button size="sm" className="gap-1.5" style={{ backgroundColor: accent }} onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Item</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Category</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Par Level</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Value</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Archive className="w-8 h-8 text-slate-300" />
                      <p className="text-sm text-slate-500">No items found</p>
                      <Button variant="outline" size="sm" onClick={() => { setSearch(''); setFilterAlert(false); }}>Clear filters</Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${item.alert !== 'ok' ? 'bg-amber-50/50' : ''}`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.sku || item.category}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{item.category}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${item.alert !== 'ok' ? 'text-amber-600' : 'text-slate-900'}`}>
                        {item.currentStock} {item.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 hidden md:table-cell">{item.parLevel} {item.unit}</td>
                    <td className="px-4 py-3 text-right text-slate-700 hidden md:table-cell">S${item.totalValue.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <StockBadge alert={item.alert} alertLabel={item.alertLabel} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modals ── */}
      {showAdd && (
        <AddItemModal
          packKey={packKey}
          tenant={tenant}
          sdk={sdk}
          onClose={() => setShowAdd(false)}
          onSaved={() => {}}
        />
      )}
      {selectedItem && (
        <DetailPanel
          item={selectedItem}
          packKey={packKey}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}