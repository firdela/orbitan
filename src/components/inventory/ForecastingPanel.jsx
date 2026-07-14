import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, Package, Calendar, Loader2, AlertTriangle, RefreshCw, Zap, Clock } from 'lucide-react';

const URGENCY_CONFIG = {
  critical: { label: 'Reorder Now', classes: 'bg-orbitan-red-light text-orbitan-red border-red-200', icon: AlertTriangle },
  high: { label: 'Urgent', classes: 'bg-orbitan-red-light text-orbitan-red border-red-200', icon: AlertTriangle },
  medium: { label: 'Reorder Soon', classes: 'bg-orbitan-amber-light text-orbitan-amber border-amber-200', icon: Clock },
  low: { label: 'Monitor', classes: 'bg-orbitan-blue-light text-orbitan-blue border-blue-200', icon: Calendar },
};

export default function ForecastingPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = user?.data?.tenant_id || user?.tenant_id;
  const outletId = user?.data?.outlet_id || user?.outlet_id;
  const [runningEngine, setRunningEngine] = useState(false);

  // Primary: ReplenishmentAlert records from the backend engine
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['replenishment-alerts', tenantId, outletId],
    queryFn: () => base44.entities.ReplenishmentAlert.list('-alert_date', 100),
    enabled: !!tenantId,
  });

  // All inventory items (for items without alerts)
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['inventory-items-forecast', tenantId],
    queryFn: () => base44.entities.InventoryItem.list('-created_date', 200),
    enabled: !!tenantId,
  });

  const isLoading = alertsLoading || itemsLoading;

  // Merge alerts with inventory items
  const forecastData = useMemo(() => {
    const alertMap = {};
    alerts.forEach(a => {
      if (a.status === 'open' || a.status === 'po_created') {
        alertMap[a.inventory_item_id] = a;
      }
    });

    // Items that have alerts — show backend-computed forecast
    const withAlerts = items
      .filter(item => alertMap[item.id])
      .map(item => {
        const alert = alertMap[item.id];
        const reorderDate = new Date();
        reorderDate.setDate(reorderDate.getDate() + Math.max(0, Math.floor(alert.days_until_stockout || 0)));
        return {
          ...item,
          avgDailyUsage: Math.round((alert.avg_daily_usage || 0) * 10) / 10,
          daysUntilStockout: Math.max(0, Math.floor(alert.days_until_stockout || 0)),
          suggestedOrderQty: Math.round(alert.suggested_order_qty || 0),
          estimatedCost: alert.estimated_cost || 0,
          urgency: alert.urgency || 'low',
          reorderDate: reorderDate.toISOString().split('T')[0],
          predictedStock3d: Math.round(alert.predicted_stock_3days || 0),
          hasAlert: true,
          linkedPoId: alert.linked_po_id,
        };
      });

    // Items without alerts — show as healthy / no forecast needed
    const withoutAlerts = items
      .filter(item => !alertMap[item.id] && item.status === 'active')
      .map(item => ({
        ...item,
        avgDailyUsage: null,
        daysUntilStockout: null,
        suggestedOrderQty: null,
        estimatedCost: 0,
        urgency: 'healthy',
        hasAlert: false,
      }));

    // Sort: alerts first (by urgency), then healthy items
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3, healthy: 4 };
    return [...withAlerts, ...withoutAlerts].sort((a, b) => {
      const orderDiff = (urgencyOrder[a.urgency] ?? 5) - (urgencyOrder[b.urgency] ?? 5);
      if (orderDiff !== 0) return orderDiff;
      return (a.daysUntilStockout ?? 999) - (b.daysUntilStockout ?? 999);
    });
  }, [items, alerts]);

  const handleRunEngine = async () => {
    if (!tenantId || !outletId) {
      toast({ title: 'Missing context', description: 'Tenant and outlet are required to run the forecast engine.', variant: 'destructive' });
      return;
    }
    setRunningEngine(true);
    try {
      const res = await base44.functions.invoke('replenishmentEngine', {
        tenantId,
        outletId,
      });
      const data = res?.data || res;
      toast({
        title: 'Forecast engine complete',
        description: `${data?.summary?.alerts_processed ?? 0} alerts processed · ${data?.summary?.pos_auto_drafted ?? 0} POs auto-drafted`,
      });
      queryClient.invalidateQueries({ queryKey: ['replenishment-alerts'] });
    } catch (err) {
      toast({ title: 'Engine error', description: err.message || 'Failed to run forecast engine', variant: 'destructive' });
    } finally {
      setRunningEngine(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeAlerts = forecastData.filter(f => f.hasAlert);

  return (
    <div className="space-y-4">
      {/* Info banner + Run button */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 bg-muted/50 rounded-lg p-3.5">
        <div className="flex items-start gap-2.5 flex-1">
          <TrendingDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Forecasts are computed by the <span className="font-medium text-foreground">Replenishment Engine</span> — it analyses sales invoices against recipe BOMs to calculate real ingredient usage rates, then predicts stockout dates and auto-drafts purchase orders for critical items.
          </p>
        </div>
        <Button
          size="sm"
          variant="default"
          className="gap-1.5 flex-shrink-0"
          onClick={handleRunEngine}
          disabled={runningEngine}
        >
          {runningEngine ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          {runningEngine ? 'Running...' : 'Run Forecast'}
        </Button>
      </div>

      {/* Summary KPIs */}
      {activeAlerts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orbitan-red-light flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-orbitan-red" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Critical</p>
              <p className="text-lg font-bold">{activeAlerts.filter(a => a.urgency === 'critical').length}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orbitan-amber-light flex items-center justify-center">
              <Clock className="w-4 h-4 text-orbitan-amber" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Soon</p>
              <p className="text-lg font-bold">{activeAlerts.filter(a => a.urgency === 'medium' || a.urgency === 'high').length}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orbitan-green-light flex items-center justify-center">
              <Package className="w-4 h-4 text-orbitan-green" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Healthy</p>
              <p className="text-lg font-bold">{forecastData.filter(f => !f.hasAlert).length}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orbitan-blue-light flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-orbitan-blue" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Est. Reorder Cost</p>
              <p className="text-lg font-bold">S${activeAlerts.reduce((s, a) => s + (a.estimatedCost || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {forecastData.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground mb-4">No inventory items yet. Add items and run the forecast engine to see replenishment predictions.</p>
        </div>
      ) : (
        /* Forecast table */
        <div className="bg-card border border-border rounded-xl overflow-hidden card-elevated">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Item</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Daily Usage</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Days Left</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Suggest Qty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Reorder By</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {forecastData.slice(0, 30).map(item => {
                  const cfg = item.hasAlert
                    ? URGENCY_CONFIG[item.urgency] || URGENCY_CONFIG.low
                    : { label: 'Healthy', classes: 'bg-orbitan-green-light text-orbitan-green border-green-200', icon: Package };
                  const UrgIcon = cfg.icon;
                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${item.hasAlert ? 'bg-orbitan-red-light' : 'bg-orbitan-blue-light'}`}>
                            <Package className={`w-3.5 h-3.5 ${item.hasAlert ? 'text-orbitan-red' : 'text-orbitan-blue'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">{item.category || 'Uncategorised'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold tabular-nums ${item.hasAlert && item.current_stock < (item.par_level || 0) ? 'text-orbitan-red' : 'text-foreground'}`}>
                          {item.current_stock}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell tabular-nums">
                        {item.avgDailyUsage !== null ? `${item.avgDailyUsage} ${item.unit}/day` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.daysUntilStockout !== null ? (
                          <span className={`font-semibold tabular-nums ${
                            item.daysUntilStockout <= 1 ? 'text-orbitan-red' :
                            item.daysUntilStockout <= 3 ? 'text-orbitan-amber' : 'text-foreground'
                          }`}>
                            {item.daysUntilStockout}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">∞</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell tabular-nums">
                        {item.suggestedOrderQty !== null ? `${item.suggestedOrderQty} ${item.unit}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">
                        {item.reorderDate || '—'}
                      </td>
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
      )}
    </div>
  );
}