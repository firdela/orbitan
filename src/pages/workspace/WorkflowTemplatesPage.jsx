import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import BackBar from '@/components/shared/BackBar';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Workflow, CheckCircle2, FileText, Archive, Plus, Clock, ListChecks } from 'lucide-react';

const CATEGORY_LABELS = {
  opening: 'Opening', closing: 'Closing', onboarding: 'Onboarding',
  inventory_count: 'Inventory Count', procurement: 'Procurement',
  compliance_inspection: 'Compliance Inspection', incident_response: 'Incident Response',
  food_safety: 'Food Safety', cleaning: 'Cleaning', maintenance: 'Maintenance',
  audit_preparation: 'Audit Preparation', custom: 'Custom',
};

export default function WorkflowTemplatesPage() {
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filter = useMemo(() => {
    const f = {};
    if (categoryFilter !== 'all') f.category = categoryFilter;
    return f;
  }, [categoryFilter]);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['workflow-templates', filter],
    queryFn: async () => base44.entities.WorkflowTemplate.filter(filter, '-created_date', 100),
  });

  const stats = useMemo(() => {
    const list = templates || [];
    return {
      total: list.length,
      published: list.filter((t) => t.status === 'published').length,
      drafts: list.filter((t) => t.status === 'draft').length,
      archived: list.filter((t) => t.status === 'archived').length,
    };
  }, [templates]);

  return (
    <div className="min-h-screen bg-background">
      <BackBar to="/leader-org" label="Platform Console" title="Workflow Templates" />
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <PageHeader
          title="Workflow Templates"
          subtitle="Reusable, versioned operational workflow definitions. Published versions are immutable and traceable."
        />

        {isLoading ? (
          <LoadingState message="Loading templates…" />
        ) : stats.total === 0 ? (
          <EmptyState icon={Workflow} title="No workflow templates yet" color="purple"
            description="Create reusable templates for opening, closing, onboarding, compliance inspections, and more. Published templates generate operational tasks with versioned traceability."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard title="Total Templates" value={stats.total} icon={Workflow} color="purple" compact />
              <StatCard title="Published" value={stats.published} icon={CheckCircle2} color="green" compact />
              <StatCard title="Drafts" value={stats.drafts} icon={FileText} color="amber" compact />
              <StatCard title="Archived" value={stats.archived} icon={Archive} color="slate" compact />
            </div>

            <div className="mb-4">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Filter by category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(templates || []).map((t) => (
                <Card key={t.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{t.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">{CATEGORY_LABELS[t.category] || t.category}</p>
                      </div>
                      <Badge className={t.status === 'published' ? 'bg-green-100 text-green-700' : t.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}>
                        {t.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {t.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{t.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>v{t.version || 1}</span>
                      <span className="flex items-center gap-1"><ListChecks className="w-3 h-3" />{t.steps?.length || 0} steps</span>
                      {t.expected_duration_mins && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.expected_duration_mins}m</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}