import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ArtifactManager from '@/components/artifacts/ArtifactManager';
import {
  ShieldCheck, FileText, Receipt, BookOpen, Scale, Building2, FileWarning, Archive
} from 'lucide-react';

const TAB_CONFIG = [
  { key: 'all', label: 'All', icon: Archive, filterType: null },
  { key: 'compliance_permit', label: 'Permits', icon: ShieldCheck, filterType: 'compliance_permit' },
  { key: 'operational_sop', label: 'SOPs', icon: FileText, filterType: 'operational_sop' },
  { key: 'financial_receipt', label: 'Receipts', icon: Receipt, filterType: 'financial_receipt' },
  { key: 'legal_contract', label: 'Contracts', icon: Scale, filterType: 'legal_contract' },
  { key: 'training_material', label: 'Training', icon: BookOpen, filterType: 'training_material' },
  { key: 'incident_evidence', label: 'Incidents', icon: FileWarning, filterType: 'incident_evidence' },
  { key: 'facility_document', label: 'Facility', icon: Building2, filterType: 'facility_document' },
];

export default function ArtifactRegistry() {
  const [activeTab, setActiveTab] = useState('all');

  const { data: allArtifacts = [], isLoading } = useQuery({
    queryKey: ['artifact-records-all'],
    queryFn: () => base44.entities.ArtifactRecord.list('-created_date', 200),
  });

  const approved = allArtifacts.filter((a) => a.status === 'approved').length;
  const inReview = allArtifacts.filter((a) => a.status === 'in_review').length;
  const auditLinked = allArtifacts.filter((a) => a.audit_log_id).length;
  const expiringSoon = allArtifacts.filter((a) => {
    if (!a.expiry_date) return false;
    const days = (new Date(a.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 30;
  }).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <PageHeader
        title="Artifact Registry"
        subtitle="Unified document & compliance repository · Powered by Regulate"
      />

      {/* Stats Banner */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-display font-bold text-orbitan-green">{approved}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Approved</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-display font-bold text-orbitan-amber">{inReview}</p>
          <p className="text-xs text-muted-foreground mt-0.5">In Review</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-display font-bold text-orbitan-blue">{auditLinked}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Audit-Linked</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-display font-bold text-orbitan-red">{expiringSoon}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Expiring (30d)</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-5 flex-wrap h-auto">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5">
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {TAB_CONFIG.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            {isLoading ? (
              <div className="bg-card border border-border rounded-xl py-12 text-center text-sm text-muted-foreground">
                Loading artifacts...
              </div>
            ) : allArtifacts.length === 0 ? (
              <EmptyState
                icon={Archive}
                title="No artifacts in the registry"
                description="Upload compliance permits, receipts, SOPs, and contracts. Every artifact is audit-logged automatically."
                color="blue"
              />
            ) : (
              <ArtifactManager filterType={tab.filterType} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}