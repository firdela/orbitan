import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Truck, TrendingUp, AlertTriangle, CheckCircle2, XCircle,
  Package, Clock, Star
} from 'lucide-react';

const RELIABILITY_TIERS = {
  excellent: { label: 'Excellent', color: 'text-orbitan-green', bg: 'bg-orbitan-green-light', min: 90 },
  good: { label: 'Good', color: 'text-orbitan-blue', bg: 'bg-orbitan-blue-light', min: 75 },
  fair: { label: 'Fair', color: 'text-orbitan-amber', bg: 'bg-orbitan-amber-light', min: 50 },
  poor: { label: 'Poor', color: 'text-orbitan-red', bg: 'bg-orbitan-red-light', min: 0 },
};

function getTier(score) {
  if (score >= RELIABILITY_TIERS.excellent.min) return RELIABILITY_TIERS.excellent;
  if (score >= RELIABILITY_TIERS.good.min) return RELIABILITY_TIERS.good;
  if (score >= RELIABILITY_TIERS.fair.min) return RELIABILITY_TIERS.fair;
  return RELIABILITY_TIERS.poor;
}

export default function SupplierPerformancePanel({ suppliers }) {
  const { data: purchaseOrders = [], isLoading: loadingPOs } = useQuery({
    queryKey: ['supplier-performance-pos'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date', 500),
  });

  const { data: issues = [], isLoading: loadingIssues } = useQuery({
    queryKey: ['supplier-performance-issues'],
    queryFn: () => base44.entities.IssueLog.filter({ module: 'procurement' }, '-created_date', 100),
  });

  const isLoading = loadingPOs || loadingIssues;

  const performanceData = useMemo(() => {
    if (!suppliers.length) return [];

    return suppliers.map(supplier => {
      const supplierPOs = purchaseOrders.filter(po => po.supplier_id === supplier.id);
      const total = supplierPOs.length;
      const received = supplierPOs.filter(po => po.status === 'received').length;
      const cancelled = supplierPOs.filter(po => po.status === 'cancelled').length;
      const inProgress = supplierPOs.filter(po =>
        ['draft', 'pending_approval', 'approved', 'sent', 'partially_received'].includes(po.status)
      ).length;

      const completed = received + cancelled;
      const reliabilityScore = completed > 0
        ? Math.round((received / completed) * 100)
        : null;

      // Count related issues (by supplier name match in title/description)
      const supplierIssues = issues.filter(i =>
        i.title?.toLowerCase().includes(supplier.name?.toLowerCase()) ||
        i.description?.toLowerCase().includes(supplier.name?.toLowerCase())
      );

      const openIssues = supplierIssues.filter(i =>
        !['resolved', 'closed', 'wont_fix', 'duplicate'].includes(i.status) &&
        !['released', 'closed'].includes(i.workflow_status)
      ).length;

      // On-time analysis (comparing expected_delivery_date to today for received POs)
      const onTimeDeliveries = supplierPOs.filter(po =>
        po.status === 'received' &&
        po.expected_delivery_date &&
        new Date(po.created_date || po.expected_delivery_date) <= new Date(po.expected_delivery_date)
      ).length;

      return {
        supplier,
        totalPOs: total,
        received,
        cancelled,
        inProgress,
        reliabilityScore,
        tier: reliabilityScore !== null ? getTier(reliabilityScore) : null,
        totalIssues: supplierIssues.length,
        openIssues,
        onTimeDeliveries,
        hasData: total > 0
      };
    }).sort((a, b) => {
      // Sort by reliability score (nulls last), then by total POs
      if (a.reliabilityScore === null && b.reliabilityScore === null) return b.totalPOs - a.totalPOs;
      if (a.reliabilityScore === null) return 1;
      if (b.reliabilityScore === null) return -1;
      return b.reliabilityScore - a.reliabilityScore;
    });
  }, [suppliers, purchaseOrders, issues]);

  // Aggregate stats
  const aggregate = useMemo(() => {
    const suppliersWithData = performanceData.filter(p => p.hasData);
    const avgReliability = suppliersWithData.length > 0
      ? Math.round(
        suppliersWithData.reduce((acc, p) => acc + (p.reliabilityScore || 0), 0) / suppliersWithData.length
      )
      : null;
    const totalReceived = performanceData.reduce((acc, p) => acc + p.received, 0);
    const totalCancelled = performanceData.reduce((acc, p) => acc + p.cancelled, 0);
    const totalOpenIssues = performanceData.reduce((acc, p) => acc + p.openIssues, 0);

    return { avgReliability, totalReceived, totalCancelled, totalOpenIssues, suppliersWithData: suppliersWithData.length };
  }, [performanceData]);

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading supplier performance data…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-orbitan-blue" />
            <p className="text-xs text-muted-foreground">Avg Reliability</p>
          </div>
          <p className="text-2xl font-display font-bold">
            {aggregate.avgReliability !== null ? `${aggregate.avgReliability}%` : '—'}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-orbitan-green" />
            <p className="text-xs text-muted-foreground">Deliveries Received</p>
          </div>
          <p className="text-2xl font-display font-bold">{aggregate.totalReceived}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-orbitan-red" />
            <p className="text-xs text-muted-foreground">Cancelled POs</p>
          </div>
          <p className="text-2xl font-display font-bold">{aggregate.totalCancelled}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-orbitan-amber" />
            <p className="text-xs text-muted-foreground">Open Issues</p>
          </div>
          <p className="text-2xl font-display font-bold">{aggregate.totalOpenIssues}</p>
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Package className="w-4 h-4 text-orbitan-blue" />
          <h3 className="font-heading font-semibold text-sm">Vendor Performance Breakdown</h3>
        </div>
        {performanceData.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            No suppliers to analyse. Add suppliers to track their delivery performance.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Supplier</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground">Total POs</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground">Received</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground">Cancelled</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground">In Progress</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground">Open Issues</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-muted-foreground">Reliability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {performanceData.map(({ supplier, totalPOs, received, cancelled, inProgress, openIssues, reliabilityScore, tier, hasData }) => (
                  <tr key={supplier.id} className="hover:bg-accent/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${supplier.is_preferred ? 'bg-orbitan-amber-light' : 'bg-muted'}`}>
                          {supplier.is_preferred
                            ? <Star className="w-3.5 h-3.5 text-orbitan-amber" />
                            : <Truck className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{supplier.name}</p>
                          {supplier.lead_time_days != null && (
                            <p className="text-[10px] text-muted-foreground">{supplier.lead_time_days}d lead</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-center px-3 py-3 text-xs font-medium text-foreground">{totalPOs}</td>
                    <td className="text-center px-3 py-3">
                      <span className="text-xs font-medium text-orbitan-green">{received}</span>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className="text-xs font-medium text-orbitan-red">{cancelled}</span>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className="text-xs font-medium text-orbitan-amber">{inProgress}</span>
                    </td>
                    <td className="text-center px-3 py-3">
                      {openIssues > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-orbitan-red">
                          <AlertTriangle className="w-3 h-3" /> {openIssues}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="text-center px-5 py-3">
                      {reliabilityScore !== null ? (
                        <div className="flex items-center justify-center gap-2">
                          <span className={`text-xs font-bold ${tier.color}`}>{reliabilityScore}%</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tier.bg} ${tier.color}`}>
                            {tier.label}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">
                          {hasData ? 'Pending' : 'No POs'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Insight Note */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground px-1">
        <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <p>
          Reliability is calculated from completed Purchase Orders (received vs cancelled).
          Issues are matched from procurement-related feedback logs.
          Metrics update automatically as new POs and issues are recorded.
        </p>
      </div>
    </div>
  );
}