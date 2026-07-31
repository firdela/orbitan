import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import BackBar from '@/components/shared/BackBar';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Package, Truck, CheckCircle2, Clock, AlertCircle, Plus } from 'lucide-react';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
  requested: { label: 'Requested', color: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approved', color: 'bg-purple-100 text-purple-700' },
  preparing: { label: 'Preparing', color: 'bg-amber-100 text-amber-700' },
  dispatched: { label: 'Dispatched', color: 'bg-orange-100 text-orange-700' },
  partially_received: { label: 'Partial', color: 'bg-yellow-100 text-yellow-700' },
  received: { label: 'Received', color: 'bg-green-100 text-green-700' },
  reconciled: { label: 'Reconciled', color: 'bg-teal-100 text-teal-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

export default function InventoryTransfersPage() {
  const [statusFilter, setStatusFilter] = useState('all');

  const filter = useMemo(() => {
    const f = {};
    if (statusFilter !== 'all') f.status = statusFilter;
    return f;
  }, [statusFilter]);

  const { data: transfers, isLoading } = useQuery({
    queryKey: ['inventory-transfers', filter],
    queryFn: async () => base44.entities.InventoryTransfer.filter(filter, '-created_date', 100),
  });

  const stats = useMemo(() => {
    const list = transfers || [];
    return {
      total: list.length,
      inTransit: list.filter((t) => ['dispatched', 'preparing'].includes(t.status)).length,
      received: list.filter((t) => ['received', 'reconciled'].includes(t.status)).length,
      pending: list.filter((t) => ['draft', 'requested', 'approved'].includes(t.status)).length,
    };
  }, [transfers]);

  return (
    <div className="min-h-screen bg-background">
      <BackBar to="/leader-org" label="Platform Console" title="Inventory Transfers" />
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <PageHeader
          title="Inventory Transfers"
          subtitle="Inter-outlet stock movements with full lifecycle tracking, discrepancy recording, and audit trail."
        />

        {isLoading ? (
          <LoadingState message="Loading transfers…" />
        ) : stats.total === 0 ? (
          <EmptyState icon={Package} title="No inventory transfers yet" color="blue"
            description="Inter-outlet stock transfers will appear here once created. Each transfer tracks the full lifecycle from request to reconciliation."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard title="Total Transfers" value={stats.total} icon={Package} color="blue" compact />
              <StatCard title="Pending" value={stats.pending} icon={Clock} color="amber" compact />
              <StatCard title="In Transit" value={stats.inTransit} icon={Truck} color="purple" compact />
              <StatCard title="Received" value={stats.received} icon={CheckCircle2} color="green" compact />
            </div>

            <div className="space-y-3">
              {(transfers || []).map((t) => {
                const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.draft;
                return (
                  <Card key={t.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 text-sm min-w-0">
                          <span className="font-medium truncate">{t.source_outlet_name || 'Source Outlet'}</span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">{t.destination_outlet_name || 'Destination Outlet'}</span>
                        </div>
                        <Badge className={cfg.color}>{cfg.label}</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span>{t.transfer_number || '—'}</span>
                        <span>{t.items?.length || 0} item(s)</span>
                        {t.required_date && <span>Required: {new Date(t.required_date).toLocaleDateString()}</span>}
                        {t.requester_name && <span>By: {t.requester_name}</span>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}