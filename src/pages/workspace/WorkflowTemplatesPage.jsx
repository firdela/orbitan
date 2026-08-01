import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import BackBar from '@/components/shared/BackBar';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  AlertCircle, RefreshCw,
  Workflow, CheckCircle2, FileText, Archive, Plus, Clock, ListChecks,
  Copy, Eye, Loader2, Filter, X, RotateCcw, Pencil,
} from 'lucide-react';
import TemplateFormDialog from '@/components/workflow/TemplateFormDialog';

const CATEGORY_LABELS = {
  opening: 'Opening', closing: 'Closing', onboarding: 'Onboarding',
  inventory_count: 'Inventory Count', procurement: 'Procurement',
  compliance_inspection: 'Compliance Inspection', incident_response: 'Incident Response',
  food_safety: 'Food Safety', cleaning: 'Cleaning', maintenance: 'Maintenance',
  audit_preparation: 'Audit Preparation', custom: 'Custom',
};

// ── Service error parser ──────────────────────────────────────────
function parseServiceError(err) {
  const raw = err?.message || err?.response?.data?.error || err;
  if (raw && typeof raw === 'object' && raw.message) return raw.message;
  if (typeof raw === 'string') return raw;
  return 'An unexpected error occurred.';
}

export default function WorkflowTemplatesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin';
  const backTo = isAdmin ? '/leader-org' : '/workspace';
  const canManage = ['admin', 'tenant_admin', 'outlet_manager'].includes(user?.role);

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);

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

  const refresh = () => qc.invalidateQueries({ queryKey: ['workflow-templates'] });

  // ── Lifecycle action handler — delegates to workflowTemplateService ──
  const handleAction = async () => {
    if (!confirmAction) return;
    const { type, template } = confirmAction;
    setActionLoading(true);
    setErrorInfo(null);
    try {
      const payload = {
        tenant_id: user?.data?.tenant_id,
        template_id: template.id,
      };

      if (type === 'publish') payload.action = 'publish';
      else if (type === 'archive') payload.action = 'archive';
      else if (type === 'restore') payload.action = 'restore';
      else if (type === 'duplicate') payload.action = 'duplicate';
      else if (type === 'newVersion') payload.action = 'newVersion';

      const res = await base44.functions.invoke('workflowTemplateService', payload);
      const result = res?.data || res;
      if (result?.error) {
        const errMsg = typeof result.error === 'object' ? result.error.message : result.error;
        setErrorInfo(errMsg || 'Action failed.');
        return;
      }

      refresh();
      setConfirmAction(null);
      setSelectedTemplate(null);
    } catch (e) {
      setErrorInfo(parseServiceError(e));
    } finally {
      setActionLoading(false);
    }
  };

  const confirmConfig = {
    publish: { title: 'Publish Template', desc: 'Published versions are immutable. To make changes, create a new version.', label: 'Publish' },
    archive: { title: 'Archive Template', desc: 'Archived templates are hidden from active workflows but retained for audit.', label: 'Archive' },
    restore: { title: 'Restore Template', desc: 'Restore as a draft so you can edit it again.', label: 'Restore' },
    duplicate: { title: 'Duplicate Template', desc: 'Creates a new draft copy of this template.', label: 'Duplicate' },
    newVersion: { title: 'Create New Version', desc: 'Creates a new draft version linked to this template.', label: 'Create Version' },
  };

  // Hide page header "New Template" when showing empty state (consolidation)
  const showEmptyState = !isLoading && stats.total === 0 && categoryFilter === 'all';

  return (
    <div className="min-h-screen bg-background">
      <BackBar to={backTo} label={isAdmin ? 'Platform Console' : 'Workspace'} title="Workflow Templates" />
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <PageHeader
          title="Workflow Templates"
          subtitle="Reusable, versioned operational workflow definitions. Published templates are immutable and traceable."
          actions={canManage && !showEmptyState && (
            <Button size="sm" onClick={() => { setEditTemplate(null); setFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-1.5" /> New Template
            </Button>
          )}
        />

        {isLoading ? (
          <LoadingState message="Loading templates…" />
        ) : showEmptyState ? (
          <EmptyState icon={Workflow} title="No workflow templates yet" color="purple"
            description="Create reusable templates for opening, closing, onboarding, compliance inspections, and more."
            actionLabel={canManage ? 'Create Template' : undefined}
            onAction={canManage ? () => setFormOpen(true) : undefined} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard title="Total Templates" value={stats.total} icon={Workflow} color="purple" compact />
              <StatCard title="Published" value={stats.published} icon={CheckCircle2} color="green" compact />
              <StatCard title="Drafts" value={stats.drafts} icon={FileText} color="amber" compact />
              <StatCard title="Archived" value={stats.archived} icon={Archive} color="slate" compact />
            </div>

            <div className="mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-56 text-xs"><SelectValue placeholder="Filter by category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              {categoryFilter !== 'all' && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCategoryFilter('all')}>
                  <X className="w-3 h-3 mr-1" /> Clear
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(templates || []).map((t) => (
                <Card key={t.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedTemplate(t)}>
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
                      {t.expected_duration_mins > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.expected_duration_mins}m</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Detail Sheet */}
      <Sheet open={!!selectedTemplate} onOpenChange={(v) => !v && setSelectedTemplate(null)}>
        <SheetContent side="right" className="sm:max-w-xl overflow-y-auto">
          {selectedTemplate && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between gap-2">
                  <SheetTitle className="text-lg">{selectedTemplate.name}</SheetTitle>
                  <Badge className={selectedTemplate.status === 'published' ? 'bg-green-100 text-green-700' : selectedTemplate.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}>
                    {selectedTemplate.status}
                  </Badge>
                </div>
                <SheetDescription>
                  {CATEGORY_LABELS[selectedTemplate.category] || selectedTemplate.category} · v{selectedTemplate.version || 1}
                </SheetDescription>
              </SheetHeader>

              {selectedTemplate.description && (
                <p className="text-sm text-muted-foreground mt-2">{selectedTemplate.description}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                <span className="flex items-center gap-1"><ListChecks className="w-3 h-3" />{selectedTemplate.steps?.length || 0} steps</span>
                {selectedTemplate.expected_duration_mins > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{selectedTemplate.expected_duration_mins} mins total</span>}
                {selectedTemplate.recurrence && selectedTemplate.recurrence !== 'none' && <span>Recurs: {selectedTemplate.recurrence}</span>}
              </div>

              {/* Steps */}
              <div className="mt-4 space-y-2">
                <Label className="text-xs font-medium">Workflow Steps</Label>
                {(selectedTemplate.steps || []).map((step, i) => (
                  <div key={i} className="border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">{step.order || i + 1}</span>
                      <span className="text-sm font-medium">{step.title}</span>
                    </div>
                    {step.description && <p className="text-xs text-muted-foreground mt-1 ml-7">{step.description}</p>}
                    <div className="flex items-center gap-2 mt-2 ml-7 flex-wrap">
                      {step.assignee_role && <Badge variant="secondary" className="text-[10px]">{step.assignee_role}</Badge>}
                      {step.expected_duration_mins > 0 && <span className="text-[10px] text-muted-foreground">{step.expected_duration_mins}m</span>}
                      {step.required_evidence && <Badge variant="outline" className="text-[10px]">Evidence Required</Badge>}
                      {step.approval_required && <Badge variant="outline" className="text-[10px]">Approval Required</Badge>}
                    </div>
                  </div>
                ))}
              </div>

              {selectedTemplate.notes && (
                <div className="mt-4 pt-3 border-t border-border">
                  <Label className="text-xs">Notes</Label>
                  <p className="text-xs text-muted-foreground mt-1">{selectedTemplate.notes}</p>
                </div>
              )}

              {/* Audit info */}
              <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground space-y-0.5">
                {selectedTemplate.published_by_name && <div>Published by: {selectedTemplate.published_by_name}</div>}
                {selectedTemplate.published_date && <div>Published: {new Date(selectedTemplate.published_date).toLocaleString()}</div>}
                {selectedTemplate.parent_template_id && <div>Previous version linked</div>}
              </div>

              {/* Inline error display */}
              {errorInfo && (
                <div role="alert" aria-live="assertive" className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{errorInfo}</p>
                </div>
              )}

              {/* Actions */}
              {canManage && (
                <>
                  <Separator className="my-4" />
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.status === 'draft' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => { setEditTemplate(selectedTemplate); setSelectedTemplate(null); setFormOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button size="sm" onClick={() => setConfirmAction({ type: 'publish', template: selectedTemplate })} disabled={actionLoading}>
                          {actionLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />} Publish
                        </Button>
                      </>
                    )}
                    {selectedTemplate.status === 'published' && (
                      <Button size="sm" variant="outline" onClick={() => setConfirmAction({ type: 'newVersion', template: selectedTemplate })} disabled={actionLoading}>
                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Copy className="w-3.5 h-3.5 mr-1" />} New Version
                      </Button>
                    )}
                    {selectedTemplate.status !== 'archived' && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmAction({ type: 'archive', template: selectedTemplate })} disabled={actionLoading}>
                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Archive className="w-3.5 h-3.5 mr-1" />} Archive
                      </Button>
                    )}
                    {selectedTemplate.status === 'archived' && (
                      <Button size="sm" variant="outline" onClick={() => setConfirmAction({ type: 'restore', template: selectedTemplate })} disabled={actionLoading}>
                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-1" />} Restore
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setConfirmAction({ type: 'duplicate', template: selectedTemplate })} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Copy className="w-3.5 h-3.5 mr-1" />} Duplicate
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={(v) => !v && setConfirmAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmAction && confirmConfig[confirmAction.type]?.title}</DialogTitle>
            <DialogDescription>{confirmAction && confirmConfig[confirmAction.type]?.desc}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button size="sm" onClick={handleAction} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (confirmAction && confirmConfig[confirmAction.type]?.label)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TemplateFormDialog open={formOpen} onOpenChange={setFormOpen} editTemplate={editTemplate} />
    </div>
  );
}