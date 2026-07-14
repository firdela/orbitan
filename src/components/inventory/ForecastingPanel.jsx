import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, Package, Calendar, Loader2, AlertTriangle } from 'lucide-react';

export default function ForecastingPanel() {
  const { user } = useAuth();
  const tenantId = user?.data?.tenant_id || user?.tenant_id;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory-forecast', tenantId],
    queryFn: () => base44.entities.InventoryItem.list('-created_date', 100),
    enabled: !!tenantId,
  });

  const { data: reconciliations = [] } = useQuery({
    queryKey: ['reconciliations-for-forecast', tenantId],
    queryFn: () => base44.entities.DailyReconciliation.list('-date', 30),
    enabled: !!tenantId,
  });

  const forecastData = useMemo(() => {
    const dailyCogsAvg = reconciliations.length > 0
      ? reconciliations.reduce((s, r) => s + (r.total_cogs || 0), 0) / reconciliations.length
      : 0;

    return items
      .filter(item => item.par_level && item.par_level > 0)
      .map(item => {
        const stock = item.current_stock || 0;
        const par = item.par_level || 0;
        const reorder = item.reorder_point || par * 0.5;
        const costPerUnit = item.cost_per_unit || 0;

        const dailyUsage = costPerUnit > 0 && dailyCogsAvg > 0
          ? Math.max(0.1, (dailyCogsAvg * 0.15) / (items.length * costPerUnit))
          : Math.max(0.1, (par * 0.1));

        const daysUntilDepletion = stock > 0 ? Math.floor(stock / dailyUsage) : 0;
        const daysUntilReorder = reorder > 0 ? Math.floor((stock - reorder) / Math.max(dailyUsage, 0.01)) : daysUntilDepletion;

        const reorderDate = new Date();
        reorderDate.setDate(reorderDate.getDate() + Math.max(0, daysUntilReorder));

        const depletionDate = new Date();
        depletionDate.setDate(depletionDate.getDate() + Math.max(0, daysUntilDepletion));

        let urgency = 'ok';
        if (daysUntilReorder <= 2) urgency = 'critical';
        else if (daysUntilReorder <= 5) urgency = 'warning';
        else if (daysUntilReorder <= 10) urgency = 'soon';

        return {
          ...item,
          dailyUsage: Math.round(dailyUsage * 10) / 10,
          daysUntilReorder: Math.max(0, daysUntilReorder),
          daysUntilDepletion: Math.max(0, daysUntilDepletion),
          reorderDate: reorderDate.toISOString().split('T')[0],
          depletionDate: depletionDate.toISOString().split('T')[0],
          urgency,
        };
      })
      .sort((a, b) => a.daysUntilReorder - b.daysUntilReorder);
  }, [items, reconciliations]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (forecastData.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-sm text-muted-foreground">Add par levels to inventory items to see replenishment forecasts.</p>
      </div>
    );
  }

  const urgencyConfig = {
    critical: { label: 'Reorder Now', classes: 'bg-orbitan-red-light text-orbitan-red border-red-100', icon: AlertTriangle },
    warning: { label: 'Reorder Soon', classes: 'bg-orbitan-amber-light text-orbitan-amber border-amber-100', icon: AlertTriangle },
    soon: { label: 'Monitor', classes: 'bg-orbitan-blue-light text-orbitan-blue border-blue-100', icon: Calendar },
    ok: { label: 'Healthy', classes: 'bg-orbitan-green-light text-orbitan-green border-green-100', icon: Package },
  };

  return (
    <div className="space-y-3">
      <div className="bg-muted/50 rounded-lg p-3 mb-4 flex items-start gap-2.5">
        <TrendingDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Forecasts are calculated from recent COGS data and current stock levels. Daily usage is estimated from daily reconciliation averages. Replenishment triggers when stock falls to the reorder point.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden card-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Item</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Current Stock</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Daily Usage</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Days to Reorder</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Reorder Date</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {forecastData.slice(0, 15).map(item => {
                const cfg = urgencyConfig[item.urgency];
                const UrgIcon = cfg.icon;
                return (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-orbitan-blue-light flex items-center justify-center flex-shrink-0">
                          <Package className="w-3.5 h-3.5 text-orbitan-blue" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground">{item.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold tabular-nums ${item.current_stock < item.par_level ? 'text-orbitan-amber' : 'text-foreground'}`}>
                        {item.current_stock}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell tabular-nums">
                      {item.dailyUsage} {item.unit}/day
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold tabular-nums ${item.urgency === 'critical' ? 'text-orbitan-red' : item.urgency === 'warning' ? 'text-orbitan-amber' : 'text-foreground'}`}>
                        {item.daysUntilReorder}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">{item.reorderDate}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.classes}`}>
                        <UrgIcon className="w-2.5 h-2.5" />{cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}