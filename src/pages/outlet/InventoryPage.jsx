import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Package, Plus, Search, AlertTriangle, CheckCircle2, MoreHorizontal,
  Filter, ShoppingCart, Home, Users, Calendar, FileText,
  CheckSquare, BarChart2, Shield, Layers, Building2, Pencil
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import QuickStockDialog from '@/components/inventory/QuickStockDialog';
import { auditFrontend, ACTION_TYPES } from '@/lib/audit';
import { useAuth } from '@/lib/AuthContext';

const NAV = [
  { type: 'section', label: 'Outlet' },
  { href: '/outlet', icon: Home, label: 'Dashboard' },
  { href: '/outlet/inventory', icon: Package, label: 'Inventory' },
  { href: '/outlet/procurement', icon: ShoppingCart, label: 'Purchase Orders' },
  { href: '/outlet/sales', icon: FileText, label: 'Sales & Reconciliation' },
  { type: 'section', label: 'Team' },
  { href: '/outlet/workforce', icon: Users, label: 'My Team' },
  { href: '/outlet/scheduling', icon: Calendar, label: 'Shift Schedule' },
  { href: '/outlet/tasks', icon: CheckSquare, label: 'Tasks' },
  { type: 'section', label: 'Reports' },
  { href: '/outlet/reports', icon: BarChart2, label: 'Reports' },
  { href: '/outlet/compliance', icon: Shield, label: 'Compliance' },
  { type: 'section', label: 'Navigation' },
  { href: '/company', icon: Building2, label: 'Company Dashboard' },
  { href: '/leader-org', icon: Layers, label: 'OrbitanOS Console' },
];

const DEMO_ITEMS = [
  { id: '1', name: 'Beef Brisket', category: 'Meat', unit: 'kg', current_stock: 5.5, par_level: 10, cost_per_unit: 22, is_ingredient: true, status: 'active' },
  { id: '2', name: 'Corn Tortilla (Pack of 50)', category: 'Dry Goods', unit: 'pack', current_stock: 12, par_level: 20, cost_per_unit: 8.5, is_ingredient: true, status: 'active' },
  { id: '3', name: 'Guajillo Chilli', category: 'Spices', unit: 'kg', current_stock: 2.1, par_level: 3, cost_per_unit: 35, is_ingredient: true, status: 'active' },
  { id: '4', name: 'Cilantro (Bunch)', category: 'Produce', unit: 'bunch', current_stock: 8, par_level: 15, cost_per_unit: 1.2, is_ingredient: true, status: 'active' },
  { id: '5', name: 'White Onion', category: 'Produce', unit: 'kg', current_stock: 6, par_level: 8, cost_per_unit: 2.5, is_ingredient: true, status: 'active' },
  { id: '6', name: 'Cooking Oil (5L)', category: 'Oils', unit: 'bottle', current_stock: 3, par_level: 6, cost_per_unit: 12, is_ingredient: true, status: 'active' },
  { id: '7', name: 'Takeaway Boxes (Small)', category: 'Packaging', unit: 'box/100', current_stock: 2, par_level: 5, cost_per_unit: 18, is_ingredient: false, status: 'active' },
  { id: '8', name: 'Napkins (Pack of 200)', category: 'Packaging', unit: 'pack', current_stock: 6, par_level: 10, cost_per_unit: 4.5, is_ingredient: false, status: 'active' },
];

export default function InventoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [filterLow, setFilterLow] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', category: '', unit: '', current_stock: '', par_level: '', cost_per_unit: '' });
  const [adjustItem, setAdjustItem] = useState(null);
  const [showAdjust, setShowAdjust] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.InventoryItem.list('-created_date', 100)
      .then(data => setItems(data || DEMO_ITEMS))
      .catch(() => setItems(DEMO_ITEMS))
      .finally(() => setLoading(false));
  }, []);

  const lowStock = items.filter(i => i.par_level && i.current_stock < i.par_level);
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
      actor_id: user?.id,
      actor_name: user?.full_name || user?.email,
      actor_role: user?.role,
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
    <AppShell navigation={NAV} title="">
      <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
        <PageHeader
          title="Inventory"
          subtitle={`${items.length} items · ${lowStock.length} below par level`}
          actions={
            <Button size="sm" className="gap-1.5" onClick={() => { setFormMode('add'); setShowForm(true); }}>
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          }
        />

        {/* Low Stock Banner */}
        {lowStock.length > 0 && (
          <div className="bg-orbitan-amber-light border border-amber-200 rounded-xl p-3 mb-5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orbitan-amber flex-shrink-0" />
            <p className="text-xs font-medium text-amber-800">{lowStock.length} item(s) below par level: {lowStock.map(i => i.name).join(', ')}</p>
          </div>
        )}

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
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
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
                        <span className={`font-semibold ${isLow ? 'text-orbitan-amber' : 'text-foreground'}`}>
                          {item.current_stock}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-muted-foreground hidden md:table-cell">{item.par_level} {item.unit}</td>
                      <td className="px-4 py-3.5 text-right text-muted-foreground hidden md:table-cell">S${item.cost_per_unit?.toFixed(2)}</td>
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
          </div>
        </div>
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
              { key: 'cost_per_unit', label: 'Cost per Unit (S$)', type: 'number' },
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
    </AppShell>
  );
}