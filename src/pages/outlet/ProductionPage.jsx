// ============================================================
// ProductionPage — F&B Production module (Build Package #11, Part A/C/G)
// Tabs: New Batch | History | Finished Goods
// ============================================================
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/workspace';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { ChefHat, Package, DollarSign, Layers } from 'lucide-react';
import ProductionBatchForm from '@/components/production/ProductionBatchForm';
import ProductionHistory from '@/components/production/ProductionHistory';
import { useCurrency } from '@/lib/CurrencyContext';

export default function ProductionPage() {
  const { identity, activeTenantId: tenantId, activeMembership } = useWorkspace();
  const { formatAmount } = useCurrency();
  const { toast } = useToast();
  const outletId = activeMembership?.role_assignments?.[0]?.scope?.outlet_id || identity?.data?.outlet_id || null;

  const [recipes, setRecipes] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [activeTab, setActiveTab] = useState('new');

  const loadRecipes = async () => {
    if (!tenantId) { setRecipes([]); setLoadingRecipes(false); return; }
    try {
      const data = await base44.entities.Recipe.filter({ tenant_id: tenantId }, '-updated_date', 200);
      setRecipes(data || []);
    } catch { setRecipes([]); } finally { setLoadingRecipes(false); }
  };

  const loadBatches = async () => {
    if (!tenantId || !outletId) { setBatches([]); setLoadingBatches(false); return; }
    try {
      const data = await base44.entities.ProductionBatch.filter({ tenant_id: tenantId, outlet_id: outletId }, '-production_date', 100);
      setBatches(data || []);
    } catch { setBatches([]); } finally { setLoadingBatches(false); }
  };

  useEffect(() => { loadRecipes(); loadBatches(); }, [tenantId, outletId]);

  const completed = batches.filter(b => b.status === 'completed');
  const totalProduced = completed.reduce((s, b) => s + (b.quantity_produced || 0), 0);
  const totalCost = completed.reduce((s, b) => s + (b.production_cost || 0), 0);

  // Finished goods = completed batches grouped by recipe
  const finishedGoods = {};
  completed.forEach(b => {
    const key = b.recipe_name;
    if (!finishedGoods[key]) finishedGoods[key] = { recipe_name: key, produced: 0, unit: b.yield_unit, batches: 0, cost: 0 };
    finishedGoods[key].produced += b.quantity_produced || 0;
    finishedGoods[key].batches += 1;
    finishedGoods[key].cost += b.production_cost || 0;
  });
  const fgList = Object.values(finishedGoods);

  const handleConfirmed = (result) => {
    toast({
      title: 'Production Completed',
      description: `${result.batch?.batch_number} — ${result.batch?.quantity_produced} ${result.batch?.recipe_name}. Cost ${formatAmount(result.batch?.production_cost || 0, { decimals: 2 })}. ${result.finance_queued ? 'Finance sync queued.' : ''}`,
    });
    loadBatches();
    setActiveTab('history');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <PageHeader
        title="Production"
        subtitle="Turn recipes into finished goods — ingredients auto-deduct from inventory"
        help={{
          title: 'Production',
          content: 'Create production batches from approved recipes. Confirming a batch validates ingredient stock, auto-deducts it (never negative), records the finished goods, and queues the production cost for finance sync.',
          tips: [
            'Preview ingredient consumption before confirming — insufficient stock blocks production.',
            'Each batch is audit-logged and enqueued to the Finance Sync Queue for Xero.',
            'Finished Goods shows total produced quantities per recipe.',
          ],
        }}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard title="Batches" value={batches.length} subtitle="All time" icon={Layers} color="blue" />
        <StatCard title="Completed" value={completed.length} subtitle="Finished goods" icon={ChefHat} color="green" />
        <StatCard title="Items Produced" value={totalProduced} subtitle="Units" icon={Package} color="amber" />
        <StatCard title="Production Cost" value={formatAmount(totalCost, { decimals: 0 })} subtitle="Ingredient cost" icon={DollarSign} color="purple" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-5">
          <TabsTrigger value="new" className="gap-1.5"><ChefHat className="w-3.5 h-3.5" /> New Batch</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><Layers className="w-3.5 h-3.5" /> History</TabsTrigger>
          <TabsTrigger value="finished" className="gap-1.5"><Package className="w-3.5 h-3.5" /> Finished Goods</TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          {loadingRecipes ? (
            <div className="flex items-center justify-center py-16 gap-2.5 text-sm text-muted-foreground">
              <ChefHat className="w-4 h-4 animate-spin" /> Loading recipes…
            </div>
          ) : recipes.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
              <p className="text-sm font-medium text-foreground">No recipes available</p>
              <p className="text-xs text-muted-foreground mt-1">Create recipes with linked ingredients in the Recipe Manager first.</p>
            </div>
          ) : (
            <ProductionBatchForm
              recipes={recipes}
              tenantId={tenantId}
              outletId={outletId}
              onConfirmed={handleConfirmed}
            />
          )}
        </TabsContent>

        <TabsContent value="history">
          <ProductionHistory batches={batches} loading={loadingBatches} />
        </TabsContent>

        <TabsContent value="finished">
          {fgList.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
              No finished goods produced yet. Complete a production batch to see inventory here.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Recipe</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Produced</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Batches</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fgList.map(fg => (
                    <tr key={fg.recipe_name} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{fg.recipe_name}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">{fg.produced} {fg.unit}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{fg.batches}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatAmount(fg.cost, { decimals: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}