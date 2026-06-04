import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import {
  LayoutDashboard, Package, ShoppingCart, BarChart2,
  ClipboardList, Users, CheckSquare, Shield, DollarSign,
  Clock, AlertTriangle, RefreshCw, CheckCircle2, Zap,
  TrendingDown, Timer, ChevronRight, FileText
} from 'lucide-react';
import { format } from 'date-fns';

const NAV = [
  { type: 'section', label: 'F&B Operations' },
  { label: 'Dashboard', href: '/t1/dashboard', icon: LayoutDashboard },
  { label: 'Inventory', href: '/t1/inventory', icon: Package },
  { label: 'Procurement', href: '/t1/procurement', icon: ShoppingCart },
  { label: 'Sales & Invoicing', href: '/t1/sales', icon: DollarSign },
  { type: 'section', label: 'Intelligence' },
  { label: 'Replenishment', href: '/t1/replenishment', icon: RefreshCw },
  { label: 'Reporting', href: '/t1/reporting', icon: BarChart2 },
  { label: 'Xero Sync', href: '/t1/xero', icon: DollarSign },
  { type: 'section', label: 'People' },
  { label: 'Workforce', href: '/t1/workforce', icon: Users },
  { label: 'Scheduling', href: '/t1/scheduling', icon: Clock },
  { label: 'Clock In / Out', href: '/t1/clockin', icon: Timer },
  { label: 'Tasks', href: '/t1/tasks', icon: CheckSquare },
  { type: 'section', label: 'Governance' },
  { label: 'Compliance', href: '/t1/compliance', icon: Shield },
];

const URGENCY_CONFIG = {
  critical: { label: 'Critical', bg: 'bg-orbitan-red-light', text: 'text-orbitan-red', border: 'border-red-100', dot: 'bg-orbitan-red' },
  high:     { label: 'High',     bg: 'bg-orbitan-amber-light', text: 'text-orbitan-amber', border: 'border-amber-100', dot: 'bg-orbitan-amber' },
  medium:   { label: 'Medium',   bg: 'bg-orbitan-blue-light', text: 'text-orbitan-blue', border: 'border-blue-100', dot: 'bg-orbitan-blue' },
  low:      { label: 'Low',      bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', dot: 'bg-muted-foreground' },
};

export default function FnBReplenishment() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [engineResult, setEngineResult] = useState(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    const data = await base44.entities.ReplenishmentAlert.list('-created_date', 100);
    setAlerts(data);
    setLoading(false);
  };

  const runEngine = async () => {
    setRunning(true);
    setEngineResult(null);
    const res = await base44.functions.invoke('replenishmentEngine', {});
    setEngineResult(res.data.summary);
    setLastRun(new Date());
    await loadAlerts();
    setRunning(false);
  };

  const handleDismiss = async (alertId) => {
    await base44.entities.ReplenishmentAlert.update(alertId, { status: 'dismissed' });
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const openAlerts = alerts.filter(a => a.status === 'open' || a.status === 'po_created');
  const filtered = filterUrgency === 'all' ? openAlerts : openAlerts.filter(a => a.urgency === filterUrgency);

  const criticalCount = openAlerts.filter(a => a.urgency === 'critical').length;
  const highCount = openAlerts.filter(a => a.urgency === 'high').length;
  const poCreated = openAlerts.filter(a => a.status === 'po_created').length;
  const totalEstCost = openAlerts.reduce((sum, a) => sum + (a.estimated_cost || 0), 0);

  return (
    <AppShell navigation={NAV} title="Replenishment">
      <div className="p-4 sm:p-6 space-y-6">

        <PageHeader
          title="Replenishment Intelligence"
          subtitle="Predicted stock-outs and auto-drafted purchase orders"
          actions={
            <Button
              onClick={runEngine}
              disabled={running}
              className="orbitan-gradient text-white gap-2"
            >
              <Zap className={`w-4 h-4 ${running ? 'animate-pulse' : ''}`} />
              {running ? 'Analysing...' : 'Run Engine'}
            </Button>
          }
        />

        {/* Engine Result Banner */}
        {engineResult && (
          <div className="rounded-xl border border-orbitan-green/30 bg-orbitan-green-light p-4 flex items-start gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-orbitan-green mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orbitan-green">Engine Complete</p>
              <p className="text-xs text-orbitan-green/80 mt-0.5">
                {engineResult.alerts_processed} alerts processed · {engineResult.pos_auto_drafted} POs auto-drafted
              </p>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Critical Items', value: criticalCount, icon: AlertTriangle, color: 'text-orbitan-red', bg: 'bg-orbitan-red-light' },
            { label: 'High Priority', value: highCount, icon: TrendingDown, color: 'text-orbitan-amber', bg: 'bg-orbitan-amber-light' },
            { label: 'POs Drafted', value: poCreated, icon: FileText, color: 'text-orbitan-blue', bg: 'bg-orbitan-blue-light' },
            { label: 'Est. Restock Cost', value: `S$${totalEstCost.toFixed(0)}`, icon: DollarSign, color: 'text-orbitan-green', bg: 'bg-orbitan-green-light' },
          ].map(card => (
            <div key={card.label} className="rounded-xl border border-border bg-card p-4">
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className="text-xl font-bold font-heading text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'critical', 'high', 'medium', 'low'].map(u => (
            <button
              key={u}
              onClick={() => setFilterUrgency(u)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                filterUrgency === u
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {u === 'all' ? `All (${openAlerts.length})` : `${u} (${openAlerts.filter(a => a.urgency === u).length})`}
            </button>
          ))}
        </div>

        {/* Alert List */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-orbitan-green mx-auto mb-3" />
            <p className="font-heading font-semibold text-foreground">All stock levels are healthy</p>
            <p className="text-sm text-muted-foreground mt-1">Run the engine to check for new alerts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(alert => {
              const cfg = URGENCY_CONFIG[alert.urgency] || URGENCY_CONFIG.low;
              return (
                <div key={alert.id} className={`rounded-xl border ${cfg.border} bg-card overflow-hidden`}>
                  <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
                    {/* Urgency dot */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot} ${alert.urgency === 'critical' ? 'animate-pulse' : ''}`} />

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-foreground">{alert.inventory_item_name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                        {alert.status === 'po_created' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-orbitan-green-light text-orbitan-green">
                            PO Drafted
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                        <span>Stock: <strong className="text-foreground">{alert.current_stock}</strong></span>
                        <span>Reorder pt: <strong className="text-foreground">{alert.reorder_point}</strong></span>
                        <span>Days left: <strong className={alert.days_until_stockout <= 1 ? 'text-orbitan-red' : 'text-foreground'}>~{Math.round(alert.days_until_stockout)}d</strong></span>
                        <span>Order qty: <strong className="text-foreground">{alert.suggested_order_qty}</strong></span>
                        <span>Est. cost: <strong className="text-foreground">S${(alert.estimated_cost || 0).toFixed(2)}</strong></span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-muted-foreground h-8"
                        onClick={() => handleDismiss(alert.id)}
                      >
                        Dismiss
                      </Button>
                      {alert.status !== 'po_created' && (
                        <Button size="sm" className="text-xs h-8 gap-1 orbitan-gradient text-white">
                          <FileText className="w-3 h-3" />
                          Create PO
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {lastRun && (
          <p className="text-xs text-muted-foreground text-center">
            Last analysis: {format(lastRun, 'h:mm a, d MMM yyyy')}
          </p>
        )}
      </div>
    </AppShell>
  );
}