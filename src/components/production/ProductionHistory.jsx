// ============================================================
// ProductionHistory — list of production batches (Part A: history view)
// ============================================================
import React from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { Loader2, ChefHat, Calendar, DollarSign, Package } from 'lucide-react';
import { useCurrency } from '@/lib/CurrencyContext';

const STATUS_OK = ['completed', 'planned', 'in_progress', 'cancelled'];

export default function ProductionHistory({ batches, loading }) {
  const { formatAmount } = useCurrency();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2.5">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading production history…</span>
      </div>
    );
  }
  if (!batches || batches.length === 0) {
    return (
      <EmptyState icon={ChefHat} title="No production batches yet"
        description="Create your first batch to start producing finished goods from recipes." color="blue" />
    );
  }

  return (
    <div className="space-y-3">
      {batches.map(b => (
        <div key={b.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-heading font-semibold text-sm text-foreground">{b.batch_number}</span>
                <StatusBadge status={STATUS_OK.includes(b.status) ? b.status : 'completed'} />
                {b.finance_sync_queued && (
                  <span className="text-[10px] bg-orbitan-purple-light text-orbitan-purple px-2 py-0.5 rounded-full">Finance queued</span>
                )}
              </div>
              <p className="text-sm font-medium text-foreground truncate">{b.recipe_name}</p>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Package className="w-3 h-3" />{b.quantity_produced} {b.yield_unit}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.production_date}</span>
                {b.expiry_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />exp {b.expiry_date}</span>}
                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatAmount(b.production_cost, { decimals: 2 })}</span>
              </div>
            </div>
          </div>
          {b.ingredient_consumption && b.ingredient_consumption.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1.5">
              {b.ingredient_consumption.map((c, i) => (
                <span key={i} className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                  {c.inventory_item_name} −{c.total_consumed} {c.unit}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}