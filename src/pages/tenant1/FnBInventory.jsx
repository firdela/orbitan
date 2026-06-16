import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, AlertTriangle, Search, Plus, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { T1_NAV, T1_TENANT } from '@/lib/tenant-nav';

function stockStatus(item) {
  if (item.current_stock <= item.reorder_point) return 'critical';
  if (item.current_stock < item.par_level) return 'low';
  return 'ok';
}

export default function FnBInventory() {
  const [search, setSearch] = useState('');
  const [filterLow, setFilterLow] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'Meat', unit: 'kg', current_stock: 0, par_level: 0, cost_per_unit: 0, is_ingredient: true });

  const items = []; // Real inventory data will populate from live operations
  const lowCount = 0;

  async function handleAddItem() {
    await base44.entities.InventoryItem.create({ ...newItem, tenant_id: 'tenant_taqueria', outlet_id: 'outlet_nbr' });
    setShowAdd(false);
  }

  return (
    <AppShell navigation={T1_NAV} tenant={T1_TENANT} title="" headerRight={<TenantSwitcher />}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Ingredient & Stock Inventory"
          subtitle="La Birria Tacos · North Bridge Rd · F&B Pack"
          actions={
            <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> Add Item
            </Button>
          }
        />

        {/* Alerts */}
        {lowCount > 0 && (
          <div className="bg-orbitan-amber-light border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orbitan-amber flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">{lowCount} items below par level</p>
              <p className="text-xs text-muted-foreground">Review stock and raise purchase orders for critical ingredients.</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto text-xs gap-1" onClick={() => setFilterLow(true)}>
              View Low Stock
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search ingredient or SKU..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button
            variant={filterLow ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5"
            onClick={() => setFilterLow(p => !p)}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Low Stock Only
          </Button>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Category</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Par Level</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Cost/Unit</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map(item => {
                  const st = stockStatus(item);
                  return (
                    <tr key={item.id} className={`hover:bg-muted/30 transition-colors ${st === 'critical' ? 'bg-orbitan-red-light/30' : st === 'low' ? 'bg-orbitan-amber-light/30' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{item.category}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${st === 'critical' ? 'text-orbitan-red' : st === 'low' ? 'text-orbitan-amber' : 'text-foreground'}`}>
                          {item.current_stock} {item.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">{item.par_level} {item.unit}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">S${item.cost_per_unit.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        {st === 'critical' && <span className="text-[11px] bg-orbitan-red-light text-orbitan-red px-2 py-0.5 rounded-full font-semibold">Critical</span>}
                        {st === 'low' && <span className="text-[11px] bg-orbitan-amber-light text-orbitan-amber px-2 py-0.5 rounded-full font-semibold">Low</span>}
                        {st === 'ok' && <span className="text-[11px] bg-orbitan-green-light text-orbitan-green px-2 py-0.5 rounded-full font-semibold">OK</span>}
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        {item.is_ingredient
                          ? <span className="text-[11px] bg-orbitan-amber-light text-orbitan-amber px-2 py-0.5 rounded-full">Ingredient</span>
                          : <span className="text-[11px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">Packaging</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-display font-bold text-foreground">0</p>
            <p className="text-xs text-muted-foreground">Total Items</p>
          </div>
          <div className="bg-orbitan-amber-light border border-amber-200 rounded-xl p-4">
            <p className="text-2xl font-display font-bold text-orbitan-amber">{lowCount}</p>
            <p className="text-xs text-muted-foreground">Below Par</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-display font-bold text-orbitan-green">
              S$0
            </p>
            <p className="text-xs text-muted-foreground">Stock Value</p>
          </div>
        </div>

        {/* Add Item Modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h3 className="font-heading font-bold text-lg mb-4">Add Inventory Item</h3>
              <div className="space-y-3">
                <div><label className="text-xs font-medium text-muted-foreground">Item Name</label><Input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="mt-1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-muted-foreground">Unit</label><Input value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} className="mt-1" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Cost/Unit (S$)</label><Input type="number" value={newItem.cost_per_unit} onChange={e => setNewItem({ ...newItem, cost_per_unit: parseFloat(e.target.value) })} className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-muted-foreground">Current Stock</label><Input type="number" value={newItem.current_stock} onChange={e => setNewItem({ ...newItem, current_stock: parseFloat(e.target.value) })} className="mt-1" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground">Par Level</label><Input type="number" value={newItem.par_level} onChange={e => setNewItem({ ...newItem, par_level: parseFloat(e.target.value) })} className="mt-1" /></div>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleAddItem}>Save Item</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}