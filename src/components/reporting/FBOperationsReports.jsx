// ============================================================
// ORBITANOS — F&B Operations Reports
// Completes the F&B Industry Pack reporting capability (Build Pkg #10, Part F).
//
// Computes operational reports from real entity data (no fabrication):
//   • Inventory Valuation (total + by category)
//   • Purchase Summary (PO counts + value by status)
//   • Supplier Spend (received spend grouped by supplier)
//   • Food / Recipe Cost (COGS, margin per recipe)
//   • Stock Variance (items below par level)
//
// All reads are tenant-scoped. Zero is shown when no data exists.
// EXIT-READY: pure React + base44 SDK; no fabricated metrics.
// ============================================================
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrency } from '@/lib/CurrencyContext';
import { Loader2, Package, ShoppingCart, Truck, ChefHat, AlertTriangle, DollarSign, Layers } from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-muted text-muted-foreground',
  pending_approval: 'bg-orbitan-amber-light text-orbitan-amber',
  approved: 'bg-orbitan-blue-light text-orbitan-blue',
  received: 'bg-orbitan-green-light text-orbitan-green',
  cancelled: 'bg-orbitan-red-light text-orbitan-red',
};

export default function FBOperationsReports({ tenantId }) {
  const { formatAmount } = useCurrency();

  const { data: inventory = [], isLoading: invLoading } = useQuery({
    queryKey: ['fb-rep-inventory', tenantId],
    queryFn: () => base44.entities.InventoryItem.filter({ tenant_id: tenantId }, '-created_date', 200),
    enabled: !!tenantId,
  });
  const { data: pos = [], isLoading: poLoading } = useQuery({
    queryKey: ['fb-rep-pos', tenantId],
    queryFn: () => base44.entities.PurchaseOrder.filter({ tenant_id: tenantId }, '-created_date', 200),
    enabled: !!tenantId,
  });
  const { data: recipes = [], isLoading: recipeLoading } = useQuery({
    queryKey: ['fb-rep-recipes', tenantId],
    queryFn: () => base44.entities.Recipe.filter({ tenant_id: tenantId }, '-updated_date', 200),
    enabled: !!tenantId,
  });
  const { data: batches = [], isLoading: batchLoading } = useQuery({
    queryKey: ['fb-rep-production', tenantId],
    queryFn: () => base44.entities.ProductionBatch.filter({ tenant_id: tenantId }, '-production_date', 100),
    enabled: !!tenantId,
  });

  const loading = invLoading || poLoading || recipeLoading || batchLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2.5">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading F&B operations reports…</span>
      </div>
    );
  }

  // ── Inventory Valuation ──
  const totalInventoryValue = inventory.reduce((s, i) => s + (i.current_stock || 0) * (i.cost_per_unit || 0), 0);
  const byCategory = {};
  inventory.forEach(i => {
    const cat = i.category || 'Uncategorised';
    byCategory[cat] = (byCategory[cat] || 0) + (i.current_stock || 0) * (i.cost_per_unit || 0);
  });
  const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ── Purchase Summary ──
  const poByStatus = {};
  pos.forEach(p => { poByStatus[p.status] = (poByStatus[p.status] || 0) + 1; });
  const poValueByStatus = {};
  pos.forEach(p => { poValueByStatus[p.status] = (poValueByStatus[p.status] || 0) + (p.total_amount || 0); });
  const totalPOSpend = pos.filter(p => p.status === 'received').reduce((s, p) => s + (p.total_amount || 0), 0);

  // ── Supplier Spend (received POs grouped by supplier) ──
  const supplierSpend = {};
  pos.filter(p => p.status === 'received').forEach(p => {
    const name = p.supplier_name || 'Unknown';
    supplierSpend[name] = (supplierSpend[name] || 0) + (p.total_amount || 0);
  });
  const topSuppliers = Object.entries(supplierSpend).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ── Production ──
  const completedBatches = batches.filter(b => b.status === 'completed');
  const itemsProduced = completedBatches.reduce((s, b) => s + (b.quantity_produced || 0), 0);
  const productionCost = completedBatches.reduce((s, b) => s + (b.production_cost || 0), 0);

  // ── Food / Recipe Cost ──
  const totalCOGS = recipes.reduce((s, r) => s + (r.total_cogs || 0), 0);
  const avgMargin = recipes.length
    ? recipes.reduce((s, r) => s + (r.gross_margin_pct || 0), 0) / recipes.length
    : 0;
  const topRecipeCosts = [...recipes]
    .sort((a, b) => (b.total_cogs || 0) - (a.total_cogs || 0))
    .slice(0, 5);

  // ── Stock Variance (items below par) ──
  const belowPar = inventory.filter(i => i.par_level && i.current_stock < i.par_level);

  const noData = inventory.length === 0 && pos.length === 0 && recipes.length === 0;

  if (noData) {
    return (
      <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
        <Package className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm font-medium text-foreground">No F&B operations data yet</p>
        <p className="text-xs text-muted-foreground mt-1">Add inventory items, raise purchase orders, and create recipes to populate these reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ChefHat className="w-4 h-4 text-orbitan-blue" />
        <h3 className="font-heading font-semibold text-sm">F&B Operations Reports</h3>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Live</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inventory Valuation */}
        <ReportCard icon={Package} title="Inventory Valuation" color="blue">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-2xl font-display font-bold text-foreground">{formatAmount(totalInventoryValue, { decimals: 0 })}</span>
            <span className="text-xs text-muted-foreground">{inventory.length} items</span>
          </div>
          {topCategories.length > 0 ? (
            <div className="space-y-1.5">
              {topCategories.map(([cat, val]) => {
                const pct = totalInventoryValue > 0 ? (val / totalInventoryValue) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-muted-foreground truncate">{cat}</span>
                      <span className="font-medium tabular-nums">{formatAmount(val, { decimals: 0 })}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-orbitan-blue rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-xs text-muted-foreground">No costed items yet.</p>}
        </ReportCard>

        {/* Purchase Summary */}
        <ReportCard icon={ShoppingCart} title="Purchase Summary" color="amber">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-2xl font-display font-bold text-foreground">{formatAmount(totalPOSpend, { decimals: 0 })}</span>
            <span className="text-xs text-muted-foreground">{pos.length} orders</span>
          </div>
          {Object.keys(poByStatus).length > 0 ? (
            <div className="space-y-1.5">
              {Object.entries(poByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] || 'bg-muted'}`}>
                    {status?.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-medium">{count}</span>
                    <span className="text-muted-foreground tabular-nums">{formatAmount(poValueByStatus[status] || 0, { decimals: 0 })}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground">No purchase orders yet.</p>}
        </ReportCard>

        {/* Supplier Spend */}
        <ReportCard icon={Truck} title="Supplier Spend" color="green">
          {topSuppliers.length > 0 ? (
            <div className="space-y-2">
              {topSuppliers.map(([name, spend]) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate flex-1">{name}</span>
                  <span className="font-semibold tabular-nums ml-2">{formatAmount(spend, { decimals: 0 })}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground">No received purchase orders yet.</p>}
        </ReportCard>

        {/* Production */}
        <ReportCard icon={Layers} title="Production (Batch Output)" color="blue">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-2xl font-display font-bold text-foreground">{itemsProduced}</span>
            <span className="text-xs text-muted-foreground">{completedBatches.length} batches</span>
          </div>
          {completedBatches.length > 0 ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Production Cost</span>
                <span className="font-medium tabular-nums">{formatAmount(productionCost, { decimals: 0 })}</span>
              </div>
              {Object.entries(completedBatches.reduce((acc, b) => {
                acc[b.recipe_name] = (acc[b.recipe_name] || 0) + (b.quantity_produced || 0);
                return acc;
              }, {})).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, qty]) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate flex-1">{name}</span>
                  <span className="font-medium tabular-nums ml-2">{qty}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground">No production batches yet.</p>}
        </ReportCard>

        {/* Food / Recipe Cost */}
        <ReportCard icon={ChefHat} title="Food & Recipe Cost" color="purple">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-2xl font-display font-bold text-foreground">{formatAmount(totalCOGS, { decimals: 0 })}</span>
            <span className="text-xs text-muted-foreground">Avg margin {avgMargin.toFixed(1)}%</span>
          </div>
          {topRecipeCosts.length > 0 ? (
            <div className="space-y-1.5">
              {topRecipeCosts.map(r => (
                <div key={r.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate flex-1">{r.menu_item_name}</span>
                  <span className="font-medium tabular-nums ml-2">{formatAmount(r.total_cogs || 0, { decimals: 2 })}</span>
                  <span className={`ml-2 tabular-nums ${(r.gross_margin_pct || 0) >= 65 ? 'text-orbitan-green' : 'text-orbitan-amber'}`}>
                    {r.gross_margin_pct?.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground">No recipes costed yet.</p>}
        </ReportCard>
      </div>

      {/* Stock Variance / Low Stock */}
      <ReportCard icon={AlertTriangle} title="Stock Variance — Below Par" color={belowPar.length > 0 ? 'amber' : 'green'}>
        {belowPar.length > 0 ? (
          <div className="space-y-1.5">
            {belowPar.slice(0, 8).map(i => {
              const gap = i.par_level - i.current_stock;
              return (
                <div key={i.id} className="flex items-center justify-between text-xs">
                  <span className="text-foreground truncate flex-1">{i.name}</span>
                  <span className="text-muted-foreground tabular-nums ml-2">{i.current_stock} / {i.par_level} {i.unit}</span>
                  <span className="ml-2 text-orbitan-amber font-medium tabular-nums">−{gap} {i.unit}</span>
                </div>
              );
            })}
            {belowPar.length > 8 && <p className="text-[10px] text-muted-foreground pt-1">+{belowPar.length - 8} more below par</p>}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">All items at or above par level — no variance.</p>
        )}
      </ReportCard>
    </div>
  );
}

function ReportCard({ icon: Icon, title, color, children }) {
  const colorMap = {
    blue: 'text-orbitan-blue bg-orbitan-blue-light',
    amber: 'text-orbitan-amber bg-orbitan-amber-light',
    green: 'text-orbitan-green bg-orbitan-green-light',
    purple: 'text-orbitan-purple bg-orbitan-purple-light',
  };
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.blue}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <h4 className="font-heading font-semibold text-sm text-foreground">{title}</h4>
      </div>
      {children}
    </div>
  );
}