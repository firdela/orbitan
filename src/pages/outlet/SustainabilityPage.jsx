import React, { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Recycle, Leaf, TrendingDown, Award, Loader2, Trash2, Droplets, TreePine } from 'lucide-react';

const MATERIAL_COLORS = ['#16A34A', '#2563EB', '#F97316', '#8B5CF6', '#EAB308', '#06B6D4', '#EC4899'];

export default function SustainabilityPage() {
  const { user } = useAuth();
  const { tenantId } = useOutletContext() || {};

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['material-collections', tenantId],
    queryFn: () => base44.entities.MaterialCollection.filter({ tenant_id: tenantId }, '-collection_date', 200),
    enabled: !!tenantId,
  });

  const { data: complianceRecords = [] } = useQuery({
    queryKey: ['sustainability-compliance', tenantId],
    queryFn: () => base44.entities.ComplianceRecord.filter({ tenant_id: tenantId, category: 'environmental' }),
    enabled: !!tenantId,
  });

  const stats = useMemo(() => {
    const totalWeight = collections.reduce((s, c) => s + (c.net_weight_kg || 0), 0);
    const totalCO2 = collections.reduce((s, c) => s + (c.co2_saved_kg || 0), 0);
    const totalTrees = collections.reduce((s, c) => s + (c.trees_saved_equivalent || 0), 0);
    const totalWater = collections.reduce((s, c) => s + (c.water_saved_litres || 0), 0);
    const totalRevenue = collections.reduce((s, c) => s + (c.revenue_sgd || 0), 0);
    const totalCost = collections.reduce((s, c) => s + (c.cost_sgd || 0), 0);
    const netValue = totalRevenue - totalCost;
    const completed = collections.filter(c => c.processing_status === 'completed').length;
    const compliancePassed = complianceRecords.filter(c => c.status === 'approved').length;
    const complianceTotal = complianceRecords.length;

    return { totalWeight, totalCO2, totalTrees, totalWater, netValue, completed, compliancePassed, complianceTotal };
  }, [collections, complianceRecords]);

  const byMaterial = useMemo(() => {
    const map = {};
    collections.forEach(c => {
      const cat = c.material_category || 'mixed';
      map[cat] = (map[cat] || 0) + (c.net_weight_kg || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace('_', ' '), value: Math.round(value) }));
  }, [collections]);

  const trendData = useMemo(() => {
    const byDate = {};
    collections.forEach(c => {
      const month = c.collection_date?.slice(0, 7);
      if (!month) return;
      if (!byDate[month]) byDate[month] = { month, weight: 0, co2: 0 };
      byDate[month].weight += (c.net_weight_kg || 0);
      byDate[month].co2 += (c.co2_saved_kg || 0);
    });
    return Object.values(byDate).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [collections]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <PageHeader title="Sustainability Impact" subtitle="Waste reduction · Recycling progress · Eco-compliance milestones" />

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : collections.length === 0 ? (
        <EmptyState
          icon={Leaf}
          title="No sustainability data yet"
          description="Material collection records from the Recycling Pack will appear here as dashboard visualizations."
          color="green"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Recovered" value={`${stats.totalWeight.toLocaleString()} kg`} subtitle="Net weight" icon={Recycle} color="green" />
            <StatCard title="CO₂ Saved" value={`${stats.totalCO2.toLocaleString()} kg`} subtitle="Emissions avoided" icon={TrendingDown} color="blue" />
            <StatCard title="Trees Equivalent" value={Math.round(stats.totalTrees)} subtitle="Trees saved" icon={TreePine} color="green" />
            <StatCard title="Water Saved" value={`${stats.totalWater.toLocaleString()} L`} subtitle="Litres conserved" icon={Droplets} color="blue" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-heading font-semibold text-sm mb-4">Recovery Trend (6 months)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="weight" stroke="#16A34A" strokeWidth={2} name="Weight (kg)" />
                  <Line type="monotone" dataKey="co2" stroke="#2563EB" strokeWidth={2} name="CO₂ Saved (kg)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-heading font-semibold text-sm mb-4">Recovered by Material Type</h3>
              {byMaterial.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={byMaterial} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}kg`}>
                      {byMaterial.map((_, i) => <Cell key={i} fill={MATERIAL_COLORS[i % MATERIAL_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">No material breakdown available.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-heading font-semibold text-sm mb-4">Processing Status Breakdown</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={
                  ['collected', 'in_transit', 'received_at_facility', 'sorting', 'processed', 'dispatched', 'completed'].map(s => ({
                    name: s.replace(/_/g, ' '),
                    count: collections.filter(c => c.processing_status === s).length,
                  }))
                }>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#16A34A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-heading font-semibold text-sm mb-4">Eco-Compliance Milestones</h3>
              {complianceRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No environmental compliance records yet.</p>
              ) : (
                <div className="space-y-2">
                  {complianceRecords.slice(0, 6).map(rec => (
                    <div key={rec.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${rec.status === 'approved' ? 'bg-orbitan-green-light' : 'bg-orbitan-amber-light'}`}>
                        {rec.status === 'approved' ? <Award className="w-4 h-4 text-orbitan-green" /> : <Leaf className="w-4 h-4 text-orbitan-amber" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{rec.title}</p>
                        {rec.due_date && <p className="text-xs text-muted-foreground">Due: {rec.due_date}</p>}
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${rec.status === 'approved' ? 'bg-orbitan-green-light text-orbitan-green' : 'bg-orbitan-amber-light text-orbitan-amber'}`}>
                        {rec.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}