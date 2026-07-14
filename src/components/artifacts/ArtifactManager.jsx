import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { auditFrontend, ACTION_TYPES } from '@/lib/audit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  Upload, FileText, ShieldCheck, Loader2, X, CheckCircle2, XCircle, Clock,
  AlertTriangle, FileCheck, Receipt, BookOpen, Scale, Building2, FileWarning
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Artifact type configuration ────────────────────────────────
const ARTIFACT_TYPES = [
  { key: 'compliance_permit', label: 'Compliance Permit', icon: ShieldCheck, color: 'text-orbitan-green' },
  { key: 'operational_sop', label: 'Operational SOP', icon: FileText, color: 'text-orbitan-blue' },
  { key: 'financial_receipt', label: 'Financial Receipt', icon: Receipt, color: 'text-orbitan-amber' },
  { key: 'legal_contract', label: 'Legal Contract', icon: Scale, color: 'text-orbitan-purple' },
  { key: 'training_material', label: 'Training Material', icon: BookOpen, color: 'text-orbitan-blue' },
  { key: 'incident_evidence', label: 'Incident Evidence', icon: FileWarning, color: 'text-orbitan-red' },
  { key: 'facility_document', label: 'Facility Document', icon: Building2, color: 'text-muted-foreground' },
];

const STATUS_ICONS = {
  approved: <CheckCircle2 className="w-4 h-4 text-orbitan-green" />,
  in_review: <Clock className="w-4 h-4 text-orbitan-amber" />,
  pending_upload: <Clock className="w-4 h-4 text-muted-foreground" />,
  rejected: <XCircle className="w-4 h-4 text-orbitan-red" />,
  archived: <FileText className="w-4 h-4 text-muted-foreground" />,
  expired: <AlertTriangle className="w-4 h-4 text-orbitan-red" />,
};

const detectFileType = (fileName) => {
  const ext = fileName?.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'spreadsheet';
  if (['doc', 'docx', 'txt', 'md'].includes(ext)) return 'document';
  return 'other';
};

export default function ArtifactManager({ filterType, onLinked }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reviewRecord, setReviewRecord] = useState(null);
  const [reviewDecision, setReviewDecision] = useState({ approved: true, reason: '' });
  const [newArtifact, setNewArtifact] = useState({
    artifact_type: filterType || 'compliance_permit',
    title: '',
    description: '',
    expiry_date: '',
    file: null,
  });

  const tenantId = user?.tenant_id || user?.data?.tenant_id;
  const outletId = user?.outlet_id || user?.data?.outlet_id;
  const canReview = ['admin', 'tenant_admin', 'client_manager', 'outlet_manager'].includes(user?.role);

  const { data: artifacts = [], isLoading } = useQuery({
    queryKey: ['artifact-records', filterType],
    queryFn: () => {
      const query = filterType
        ? base44.entities.ArtifactRecord.filter({ artifact_type: filterType })
        : base44.entities.ArtifactRecord.list('-created_date', 100);
      return query;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const created = await base44.entities.ArtifactRecord.create(data);
      await auditFrontend({
        tenant_id: tenantId,
        outlet_id: outletId,
        actor_id: user?.id,
        actor_name: user?.full_name,
        actor_role: user?.role,
        action_type: 'ARTIFACT_UPLOADED',
        module: 'compliance',
        target_entity: 'ArtifactRecord',
        target_record_id: created.id,
        new_state: { artifact_type: data.artifact_type, title: data.title, status: data.status },
        details: `Artifact uploaded: ${data.title} (${data.artifact_type})`,
      });
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artifact-records'] });
      setShowUpload(false);
      setNewArtifact({
        artifact_type: filterType || 'compliance_permit',
        title: '', description: '', expiry_date: '', file: null,
      });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ record, decision }) => {
      const newStatus = decision.approved ? 'approved' : 'rejected';
      const updated = await base44.entities.ArtifactRecord.update(record.id, {
        status: newStatus,
        reviewed_by: user?.id,
        reviewed_by_name: user?.full_name,
        reviewed_date: new Date().toISOString(),
        rejection_reason: decision.approved ? null : decision.reason,
      });
      await auditFrontend({
        tenant_id: tenantId,
        outlet_id: outletId,
        actor_id: user?.id,
        actor_name: user?.full_name,
        actor_role: user?.role,
        action_type: decision.approved ? 'ARTIFACT_APPROVED' : 'ARTIFACT_REJECTED',
        module: 'compliance',
        target_entity: 'ArtifactRecord',
        target_record_id: record.id,
        previous_state: { status: record.status },
        new_state: { status: newStatus },
        details: `Artifact ${decision.approved ? 'approved' : 'rejected'}: ${record.title}`,
      });
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artifact-records'] });
      setReviewRecord(null);
      setReviewDecision({ approved: true, reason: '' });
    },
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewArtifact((p) => ({ ...p, file, title: p.title || file.name.replace(/\.[^/.]+$/, '') }));
  };

  const handleUpload = async () => {
    if (!newArtifact.file || !newArtifact.title) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: newArtifact.file });
      await createMutation.mutateAsync({
        tenant_id: tenantId,
        outlet_id: outletId,
        artifact_type: newArtifact.artifact_type,
        title: newArtifact.title,
        description: newArtifact.description,
        status: 'in_review',
        storage_url: file_url,
        file_name: newArtifact.file.name,
        file_type: detectFileType(newArtifact.file.name),
        file_size_kb: Math.round(newArtifact.file.size / 1024),
        expiry_date: newArtifact.expiry_date || null,
        uploaded_by: user?.id,
        uploaded_by_name: user?.full_name,
        uploaded_date: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[ArtifactManager] Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const typeConfig = (typeKey) => ARTIFACT_TYPES.find((t) => t.key === typeKey) || ARTIFACT_TYPES[0];

  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-orbitan-blue" />
            <h3 className="font-heading font-semibold text-sm">
              {filterType ? typeConfig(filterType).label + 's' : 'All Artifacts'}
            </h3>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setShowUpload(true)}>
            <Upload className="w-3.5 h-3.5" />
            Upload Artifact
          </Button>
        </div>

        {isLoading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading artifacts...
          </div>
        ) : artifacts.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No artifacts yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Upload your first document to start the audit trail.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {artifacts.map((art) => {
              const TypeIcon = typeConfig(art.artifact_type).icon;
              return (
                <div key={art.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="flex-shrink-0 mt-0.5">
                    {art.audit_log_id ? (
                      <ShieldCheck className="w-4 h-4 text-orbitan-green" />
                    ) : (
                      <TypeIcon className={cn('w-4 h-4', typeConfig(art.artifact_type).color)} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground truncate">{art.title}</p>
                      {art.audit_log_id && (
                        <span className="text-[10px] font-semibold text-orbitan-green bg-orbitan-green-light px-1.5 py-0.5 rounded-full flex items-center gap-0.5 flex-shrink-0">
                          <ShieldCheck className="w-2.5 h-2.5" /> Audit-Linked
                        </span>
                      )}
                      {art.is_ai_generated && (
                        <span className="text-[10px] font-semibold text-orbitan-purple bg-orbitan-purple-light px-1.5 py-0.5 rounded-full flex-shrink-0">
                          AI-Generated
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {typeConfig(art.artifact_type).label}
                      {art.file_name && ` · ${art.file_name}`}
                      {art.uploaded_by_name && ` · by ${art.uploaded_by_name}`}
                    </p>
                    {art.expiry_date && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Expires: {art.expiry_date}
                      </p>
                    )}
                    {art.rejection_reason && (
                      <p className="text-[11px] text-orbitan-red mt-0.5">
                        Rejected: {art.rejection_reason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={art.status} size="sm" />
                    {canReview && art.status === 'in_review' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs h-7"
                        onClick={() => { setReviewRecord(art); setReviewDecision({ approved: true, reason: '' }); }}
                      >
                        Review
                      </Button>
                    )}
                    {art.storage_url && (
                      <a href={art.storage_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="text-xs h-7 px-2">
                          View
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Artifact</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1 block">Artifact Type</Label>
              <Select
                value={newArtifact.artifact_type}
                onValueChange={(v) => setNewArtifact((p) => ({ ...p, artifact_type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ARTIFACT_TYPES.map((t) => (
                    <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Title</Label>
              <Input
                value={newArtifact.title}
                onChange={(e) => setNewArtifact((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. SFA Food License 2026"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Description (optional)</Label>
              <Textarea
                value={newArtifact.description}
                onChange={(e) => setNewArtifact((p) => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of this artifact"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Expiry Date (optional)</Label>
              <Input
                type="date"
                value={newArtifact.expiry_date}
                onChange={(e) => setNewArtifact((p) => ({ ...p, expiry_date: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">File</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileSelect}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              />
              {newArtifact.file && (
                <p className="text-xs text-muted-foreground mt-1">
                  {newArtifact.file.name} · {Math.round(newArtifact.file.size / 1024)} KB
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button
              onClick={handleUpload}
              disabled={!newArtifact.file || !newArtifact.title || uploading || createMutation.isPending}
            >
              {uploading || createMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Uploading...</>
              ) : (
                <><Upload className="w-4 h-4 mr-1" /> Upload & Submit for Review</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={!!reviewRecord} onOpenChange={(v) => !v && setReviewRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Artifact</DialogTitle>
          </DialogHeader>
          {reviewRecord && (
            <div className="space-y-3 py-2">
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-sm font-medium text-foreground">{reviewRecord.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {typeConfig(reviewRecord.artifact_type).label}
                  {reviewRecord.uploaded_by_name && ` · uploaded by ${reviewRecord.uploaded_by_name}`}
                </p>
                {reviewRecord.storage_url && (
                  <a href={reviewRecord.storage_url} target="_blank" rel="noopener noreferrer" className="text-xs text-orbitan-blue hover:underline mt-1 inline-block">
                    View file →
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant={reviewDecision.approved ? 'default' : 'outline'}
                  className="flex-1 gap-1.5"
                  onClick={() => setReviewDecision((p) => ({ ...p, approved: true }))}
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </Button>
                <Button
                  variant={!reviewDecision.approved ? 'destructive' : 'outline'}
                  className="flex-1 gap-1.5"
                  onClick={() => setReviewDecision((p) => ({ ...p, approved: false }))}
                >
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
              </div>
              {!reviewDecision.approved && (
                <div>
                  <Label className="text-xs mb-1 block">Rejection Reason</Label>
                  <Textarea
                    value={reviewDecision.reason}
                    onChange={(e) => setReviewDecision((p) => ({ ...p, reason: e.target.value }))}
                    placeholder="Explain why this artifact is rejected..."
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewRecord(null)}>Cancel</Button>
            <Button
              onClick={() => reviewMutation.mutate({ record: reviewRecord, decision: reviewDecision })}
              disabled={reviewMutation.isPending || (!reviewDecision.approved && !reviewDecision.reason)}
            >
              {reviewMutation.isPending ? 'Saving...' : 'Confirm Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}