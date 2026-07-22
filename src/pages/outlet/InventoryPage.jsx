import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/workspace';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import StatCard from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Package, Plus, Search, AlertTriangle, CheckCircle2, MoreHorizontal,
  Filter, ShoppingCart, Home, Users, Calendar, FileText,
  CheckSquare, BarChart2, Shield, Layers, Building2, Pencil,
  Loader2, Boxes, DollarSign, Tags
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import QuickStockDialog from '@/components/inventory/QuickStockDialog';
import ReconciliationDialog from '@/components/inventory/ReconciliationDialog';
import ForecastingPanel from '@/components/inventory/ForecastingPanel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { auditFrontend, ACTION_TYPES } from '@/lib/audit';
import { useCurrency } from '@/lib/CurrencyContext';
import { TrendingUp, ClipboardCheck } from 'lucide-react';



export default function InventoryPage() {
  const { identity, activeTenantId: tenantId, activeRole } = useWorkspace();
  const { formatAmount, currencyConfig } = useCurrency();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [filterLow, setFilterLow] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', category: '', unit: '', current_stock: '', par_level: '', cost_per_unit: '' });
  const [adjustItem, setAdjustItem] = useState(null);
  const [showAdjust, setShowAdjust] = useState(false);
  const [reconcileItem, setReconcileItem] = useState(null);
  const [showReconcile, setShowReconcile] = useState(false);
  const [activeTab, setActiveTab] = useState('items');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) { setItems([]); setLoading(false); return; }
    base44.entities.InventoryItem.filter({ tenant_id: tenantId }, '-created_date', 100)
      .then(data => setItems(data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const lowStock = items.filter(i => i.par_level && i.current_stock < i.par_level);
  const totalValue = items.reduce((s, i) => s + (i.current_stock || 0) * (i.cost_per_unit || 0), 0);
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
  const filtered = items.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.category?.toLowerCase().includes(search.toLowerCase());
    const matchLow = !filterLow || (i.par_level && i.current_stock < i.par_level);
    return matchSearch && matchLow;
  });

  const handleSaveItem = async () => {
    const itemData = {
      name: newItem.name,
      category: newItem.category,
      unit: newItem.unit,
      current_stock: parseFloat(newItem.current_stock) || 0,
      par_level: parseFloat(newItem.par_level) || 0,
      cost_per_unit: parseFloat(newItem.cost_per_unit) || 0,
      status: "active",
      is_ingredient: true,
    };

    if (formMode === 'edit' && editingItem) {
      const updated = await base44.entities.InventoryItem.update(editingItem.id, itemData);
      setItems(prev => prev.map(i => i.id === editingItem.id ? updated : i));
    } else {
      const created = await base44.entities.InventoryItem.create(itemData);
      setItems(prev => [created, ...prev]);
    }

    resetForm();
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setNewItem({
      name: item.name || '',
      category: item.category || '',
      unit: item.unit || '',
      current_stock: item.current_stock?.toString() || '',
      par_level: item.par_level?.toString() || '',
      cost_per_unit: item.cost_per_unit?.toString() || '',
    });
    setFormMode('edit');
    setShowForm(true);
  };

  const handleStockAdjust = async (item, newStock, reason) => {
    const oldStock = item.current_stock;
    const updated = await base44.entities.InventoryItem.update(item.id, { current_stock: newStock });
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));

    auditFrontend({
      tenant_id: item.tenant_id,
      outlet_id: item.outlet_id,
      actor_id: identity?.id,
      actor_name: identity?.full_name || identity?.email,
      actor_role: activeRole || identity?.platform_role,
      action_type: ACTION_TYPES.STOCK_ADJUSTED,
      module: 'inventory',
      target_entity: 'InventoryItem',
      target_record_id: item.id,
      previous_state: { current_stock: oldStock },
      new_state: { current_stock: newStock },
      details: `Stock adjusted from ${oldStock} to ${newStock} ${item.unit}. Reason: ${reason || 'Manual adjustment'}`,
    });
  };

  const openAdjustDialog = (item) => {
    setAdjustItem(item);
    setShowAdjust(true);
  };

  const resetForm = () => {
    setNewItem({ name: '', category: '', unit: '', current_stock: '', par_level: '', cost_per_unit: '' });
    setEditingItem(null);
    setFormMode('add');
    setShowForm(false);
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
        <PageHeader
          title="Inventory"
          subtitle={`${items.length} items · ${lowStock.length} below par level`}
          help={{
            title: 'Inventory',
            content: 'Track every ingredient and supply item in your outlet — current stock, par (minimum) levels, unit cost, and total stock value.',
            tips: [
              'Set a par level on each item to get low-stock alerts.',
              'Use Reconciliation to log physical counts — discrepancies are audit-logged.',
              'Forecasting predicts when items will hit par level based on usage.',
            ],
          }}
          actions={
            <Button size="sm" className="gap-1.5" onClick={() => { setFormMode('add'); setShowForm(true); }}>
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="items" className="gap-1.5"><Package className="w-3.5 h-3.5" /> Items</TabsTrigger>
            <TabsTrigger value="reconcile" className="gap-1.5"><ClipboardCheck className="w-3.5 h-3.5" /> Reconciliation</TabsTrigger>
            <TabsTrigger value="forecast" className="gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Forecasting</TabsTrigger>
          </TabsList>

          <TabsContent value="reconcile" className="mt-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-heading font-semibold text-sm mb-2">Stock Reconciliation</h3>
              <p className="text-xs text-muted-foreground mb-4">Count physical stock and log discrepancies to the audit trail for SOC 2 traceability.</p>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No inventory items to reconcile.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(item => {
                    const isLow = item.par_level && item.current_stock < item.par_level;
                    return (
                      <div key={item.id} className="border border-border rounded-lg p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLow ? 'bg-orbitan-amber-light' : 'bg-orbitan-blue-light'}`}>
                            <Package className={`w-4 h-4 ${isLow ? 'text-orbitan-amber' : 'text-orbitan-blue'}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.current_stock} {item.unit} in system</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => { setReconcileItem(item); setShowReconcile(true); }}>
                          Count
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="forecast" className="mt-4">
            <ForecastingPanel />
          </TabsContent>
        </Tabs>

        {activeTab === 'items' && (
        <>

        {/* KPI Stats */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <StatCard title="Total Items" value={items.length} subtitle="In catalog" icon={Boxes} color="blue" help={{ content: 'Every active inventory item recorded for this outlet, including ingredients and supplies.' }} />
            <StatCard title="Low Stock" value={lowStock.length} subtitle="Below par level" icon={AlertTriangle} color={lowStock.length > 0 ? 'amber' : 'green'} help={lowStock.length > 0 ? { content: 'Items at or below their par level. Click to view only these items and raise purchase orders.', tips: ['Raise a purchase order from the Procurement module to replenish.'] } : { content: 'No items are below par level — your stock is healthy.' }} onClick={lowStock.length > 0 ? () => { setActiveTab('items'); setFilterLow(true); } : undefined} />
            <StatCard title="Categories" value={categories.length} subtitle="Item groupings" icon={Tags} color="purple" help={{ content: 'Distinct categories you have assigned to items (e.g. Proteins, Produce, Dry Goods).' }} />
            <StatCard title="Stock Value" value={formatAmount(totalValue, { decimals: 0 })} subtitle="Total inventory cost" icon={DollarSign} color="green" help={{ content: 'Sum of (current stock × cost per unit) across all items — the capital currently tied up in inventory.' }} />
          </div>
        )}

        {/* Low Stock Banner */}
        {lowStock.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3.5 mb-5 flex items-start gap-2.5 card-elevated">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-orbitan-amber" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-900">{lowStock.length} item(s) below par level</p>
              <p className="text-xs text-amber-700 mt-0.5 truncate">{lowStock.map(i => i.name).join(', ')}</p>
            </div>
          </div>
        )}

        {!loading && items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Your inventory is empty"
            description="Add your first item to start tracking stock levels, par levels, and costs."
            actionLabel="Add First Item"
            onAction={() => { setFormMode('add'); setShowForm(true); }}
            color="blue"
            size="large"
          />
        ) : (
        <>
        {/* Filters */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={filterLow ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterLow(!filterLow)}
            className="gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock
          </Button>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden card-elevated">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20 gap-2.5">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading inventory…</span>
              </div>
            ) : (
            <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Item</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Category</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Par Level</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Cost/Unit</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(item => {
                  const isLow = item.par_level && item.current_stock < item.par_level;
                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isLow ? 'bg-orbitan-amber-light' : 'bg-orbitan-blue-light'}`}>
                            <Package className={`w-4 h-4 ${isLow ? 'text-orbitan-amber' : 'text-orbitan-blue'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{item.name}</p>
                            {item.is_ingredient && <span className="text-[10px] text-muted-foreground">Ingredient</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{item.category}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`font-semibold tabular-nums ${isLow ? 'text-orbitan-amber' : 'text-foreground'}`}>
                          {item.current_stock}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                        {item.par_level > 0 && (
                          <div className="mt-1 h-1 w-16 ml-auto rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isLow ? 'bg-orbitan-amber' : 'bg-orbitan-green'}`}
                              style={{ width: `${Math.min(100, (item.current_stock / item.par_level) * 100)}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right text-muted-foreground hidden md:table-cell tabular-nums">{item.par_level} {item.unit}</td>
                      <td className="px-4 py-3.5 text-right text-muted-foreground hidden md:table-cell">{formatAmount(item.cost_per_unit)}</td>
                      <td className="px-4 py-3.5 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-orbitan-amber-light text-orbitan-amber px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-2.5 h-2.5" />Low
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-orbitan-green-light text-orbitan-green px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-2.5 h-2.5" />OK
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAdjustDialog(item)}>
                              <Package className="w-4 h-4 mr-2" />
                              Adjust Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setReconcileItem(item); setShowReconcile(true); }}>
                              <ClipboardCheck className="w-4 h-4 mr-2" />
                              Reconcile
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <EmptyState icon={Package} title="No items found" description="Try adjusting your search or add a new item." />
            )}
            </>
            )}
          </div>
        </div>
        </>
        )}
        </>
        )}
      </div>

      {/* Add / Edit Item Dialog */}
      <Dialog open={showForm} onOpenChange={resetForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formMode === 'edit' ? 'Edit Inventory Item' : 'Add Inventory Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { key: 'name', label: 'Item Name', type: 'text' },
              { key: 'category', label: 'Category', type: 'text' },
              { key: 'unit', label: 'Unit (e.g. kg, pack)', type: 'text' },
              { key: 'current_stock', label: 'Current Stock', type: 'number' },
              { key: 'par_level', label: 'Par Level (min stock)', type: 'number' },
              { key: 'cost_per_unit', label: `Cost per Unit (${currencyConfig.symbol})`, type: 'number' },
            ].map(field => (
              <div key={field.key}>
                <Label className="text-xs mb-1 block">{field.label}</Label>
                <Input
                  type={field.type}
                  value={newItem[field.key]}
                  onChange={e => setNewItem(prev => ({ ...prev, [field.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSaveItem} disabled={!newItem.name}>
              {formMode === 'edit' ? 'Save Changes' : 'Add Item'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Stock Adjustment Dialog */}
      <QuickStockDialog
        open={showAdjust}
        onOpenChange={setShowAdjust}
        item={adjustItem}
        onSave={handleStockAdjust}
      />

      {/* Reconciliation Dialog */}
      <ReconciliationDialog
        open={showReconcile}
        onOpenChange={setShowReconcile}
        item={reconcileItem}
        onReconciled={(itemId, newStock, flagged) => {
          if (!flagged) {
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, current_stock: newStock } : i));
          }
        }}
      />
    </>
  );
}