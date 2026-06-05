// ============================================================
// ORBITAN AI SUITE — AI Studio Page
// Unified interface for all AI-generated documents.
// Accessible to all three tenants via their nav.
// Principle: Refine + Renew + Regulate
// ============================================================

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import AIDocumentCard from '@/components/ai/AIDocumentCard';
import GenerateModal from '@/components/ai/GenerateModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { TENANT_NAV_MANIFESTS } from '@/lib/orbitan-nav';
import { MODULES, OPERATING_CYCLE } from '@/lib/orbitan-config';
import { cn } from '@/lib/utils';
import {
  Bot, Plus, BookOpen, GraduationCap, ScrollText, ClipboardList, ShieldCheck,
  Clock, CheckCircle2, XCircle, Zap, Brain, Sparkles, TrendingUp,
  FileText, Users, Shield, RefreshCw, BarChart2, Home, Package,
  ShoppingCart, Calendar, Recycle, Shirt, Heart, CheckSquare, Link2, AlertTriangle
} from 'lucide-react';

// ── Icon map for AppShell nav ─────────────────────────────
const ICON_MAP = {
  Home, Package, ShoppingCart, FileText, Calendar, Recycle, Shirt,
  Heart, Users, CheckSquare, Clock, AlertTriangle, Shield, BarChart2,
  Link2, Bot, BookOpen, GraduationCap,
};

// ── Tenant nav configs ────────────────────────────────────
const TENANT_CONFIGS = {
  t1: {
    slug: 't1',
    name: 'Taqueria Pte Ltd',
    industry: 'food_beverage',
    tenantRecord: { id: 'tenant_taqueria', name: 'Taqueria Pte Ltd', industry: 'food_beverage', subscription_plan: 'orbitan_enterprise', enabled_modules: ['inventory', 'procurement', 'sales_invoice', 'reporting', 'workforce', 'task', 'compliance', 'finance_integration', 'scheduling'] },
  },
  t2: {
    slug: 't2',
    name: 'Renewed Resources Pte Ltd',
    industry: 'recycling_sustainability',
    tenantRecord: { id: 'tenant_renewed', name: 'Renewed Resources Pte Ltd', industry: 'recycling_sustainability', subscription_plan: 'orbitan_business', enabled_modules: ['inventory', 'procurement', 'compliance', 'reporting', 'workforce', 'task'] },
  },
  t3: {
    slug: 't3',
    name: 'Renewed Fashion',
    industry: 'retail',
    tenantRecord: { id: 'tenant_retail', name: 'Renewed Fashion', industry: 'retail', subscription_plan: 'orbitan_business', enabled_modules: ['inventory', 'sales_invoice', 'reporting', 'procurement', 'workforce', 'task', 'customer_management'] },
  },
};

const TYPE_TABS = [
  { key: 'all', label: 'All Documents' },
  { key: 'sop', label: 'SOPs' },
  { key: 'training_module', label: 'Training' },
  { key: 'policy', label: 'Policies' },
  { key: 'shift_brief', label: 'Shift Briefs' },
  { key: 'compliance_checklist', label: 'Checklists' },
];

const STATUS_FILTER = [
  { key: 'all', label: 'All' },
  { key: 'in_review', label: 'Pending Review', color: 'text-amber-600' },
  { key: 'approved', label: 'Approved', color: 'text-green-600' },
  { key: 'auto_published', label: 'Auto-Published', color: 'text-blue-600' },
  { key: 'rejected', label: 'Rejected', color: 'text-red-600' },
];

export default function AIStudio({ tenantSlug = 't1' }) {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('tenant') || tenantSlug;
  const tenantConfig = TENANT_CONFIGS[slug] || TENANT_CONFIGS.t1;

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTypeTab, setActiveTypeTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [user, setUser] = useState(null);
  const { toast } = useToast();

  // Build navigation
  const { OrbitanEngine } = { OrbitanEngine: null }; // placeholder — nav built directly
  const navManifest = TENANT_NAV_MANIFESTS[slug] || TENANT_NAV_MANIFESTS.t1;
  const navigation = navManifest.map(item => {
    if (item.type === 'section') return item;
    if (item.type === 'link') return { href: item.href, label: item.label, icon: ICON_MAP[item.iconKey] };
    return {
      href: `/${slug}${item.path}`,
      label: item.module === 'dashboard' ? 'Dashboard' : (MODULES[item.module]?.name || item.module),
      icon: ICON_MAP[
        item.module === 'dashboard' ? 'Home' :
        item.module === 'inventory' ? 'Package' :
        item.module === 'procurement' ? 'ShoppingCart' :
        item.module === 'sales' ? 'FileText' :
        item.module === 'scheduling' ? 'Calendar' :
        item.module === 'collections' ? 'Recycle' :
        item.module === 'catalog' ? 'Shirt' :
        item.module === 'customers' ? 'Heart' :
        item.module === 'workforce' ? 'Users' :
        item.module === 'tasks' ? 'CheckSquare' :
        item.module === 'clockin' ? 'Clock' :
        item.module === 'replenishment' ? 'AlertTriangle' :
        item.module === 'compliance' ? 'Shield' :
        item.module === 'reporting' ? 'BarChart2' :
        item.module === 'xero' ? 'Link2' : 'Home'
      ],
    };
  }).concat([
    { type: 'section', label: 'AI Suite' },
    { href: `/${slug}/ai-studio`, label: 'AI Studio', icon: Bot },
  ]);

  useEffect(() => {
    loadUser();
    loadDocuments();
  }, [slug]);

  const loadUser = async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);
    } catch (e) {}
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await base44.entities.AIDocument.list('-created_date', 50);
      setDocuments(docs || []);
    } catch (e) {
      // If no documents yet, show empty state
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (doc) => {
    try {
      await base44.entities.AIDocument.update(doc.id, {
        status: 'approved',
        reviewed_by: user?.id,
        reviewed_by_name: user?.full_name,
        reviewed_date: new Date().toISOString(),
      });
      toast({ title: 'Document Approved', description: `"${doc.title}" is now active.` });
      loadDocuments();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleReject = async (doc) => {
    try {
      await base44.entities.AIDocument.update(doc.id, {
        status: 'rejected',
        reviewed_by: user?.id,
        reviewed_by_name: user?.full_name,
        reviewed_date: new Date().toISOString(),
      });
      toast({ title: 'Document Rejected', description: `"${doc.title}" has been rejected.` });
      loadDocuments();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  // Filter documents
  const filtered = documents.filter(doc => {
    const typeMatch = activeTypeTab === 'all' || doc.document_type === activeTypeTab;
    const statusMatch = statusFilter === 'all' || doc.status === statusFilter;
    return typeMatch && statusMatch;
  });

  // Stats
  const pendingCount = documents.filter(d => d.status === 'in_review').length;
  const approvedCount = documents.filter(d => d.status === 'approved').length;
  const totalCount = documents.length;

  const principleColors = {
    regulate: '#DC2626', renew: '#16A34A', respond: '#F97316',
    refine: '#7C3AED', relate: '#2563EB', reach: '#0F172A',
  };

  return (
    <AppShell
      navigation={navigation}
      tenant={tenantConfig.tenantRecord}
      title="AI Studio"
      headerRight={
        <Button size="sm" className="gap-1.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-sm"
          onClick={() => setShowGenerateModal(true)}>
          <Sparkles className="w-3.5 h-3.5" />
          Generate Document
        </Button>
      }
    >
      <div className="p-4 sm:p-6 space-y-6 animate-fade-in">

        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full text-xs font-semibold mb-3 border border-purple-200">
            <Bot className="w-3.5 h-3.5" />
            OrbitanOS AI Suite · {tenantConfig.name}
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-1">AI Studio</h2>
          <p className="text-sm text-muted-foreground">
            Generate SOPs, training modules, policies, and compliance checklists using your operational data.
            All documents are aligned with the <strong>Refine</strong> and <strong>Renew</strong> principles.
          </p>
        </div>

        {/* Operating Cycle context banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { principle: 'refine', label: 'Process Improvement', desc: 'SOPs & Checklists', icon: Brain, count: documents.filter(d => ['sop', 'compliance_checklist'].includes(d.document_type)).length },
            { principle: 'renew', label: 'Learning & Growth', desc: 'Training Modules', icon: GraduationCap, count: documents.filter(d => d.document_type === 'training_module').length },
            { principle: 'regulate', label: 'Governance', desc: 'Policies & Reviews', icon: Shield, count: documents.filter(d => ['policy', 'compliance_checklist'].includes(d.document_type)).length },
          ].map(item => {
            const Icon = item.icon;
            const color = principleColors[item.principle];
            return (
              <div key={item.principle} className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: color + '15' }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  <p className="text-xs font-bold mt-0.5" style={{ color }}>{item.count} docs</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">{totalCount}</span>
            <span className="text-muted-foreground">Total Documents</span>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-amber-600">{pendingCount}</span>
              <span className="text-muted-foreground">Pending Review</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="font-semibold text-green-600">{approvedCount}</span>
            <span className="text-muted-foreground">Approved & Active</span>
          </div>
          <Button variant="ghost" size="sm" className="ml-auto gap-1.5 text-xs" onClick={loadDocuments}>
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>

        {/* Pending review alert */}
        {pendingCount > 0 && (
          <div className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">
              <strong>{pendingCount} document{pendingCount > 1 ? 's' : ''}</strong> pending your review.
              AI-generated content must be approved by a manager before becoming active.
            </p>
          </div>
        )}

        {/* Status filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTER.map(s => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-all",
                statusFilter === s.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-muted-foreground/40"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Document type tabs */}
        <Tabs value={activeTypeTab} onValueChange={setActiveTypeTab}>
          <TabsList className="bg-muted flex-wrap h-auto gap-1">
            {TYPE_TABS.map(tab => (
              <TabsTrigger key={tab.key} value={tab.key} className="text-xs">
                {tab.label}
                {tab.key !== 'all' && documents.filter(d => d.document_type === tab.key).length > 0 && (
                  <span className="ml-1.5 text-[10px] bg-primary/10 text-primary rounded-full px-1.5">
                    {documents.filter(d => d.document_type === tab.key).length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTypeTab} className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-1">No AI documents yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                  Generate your first SOP, training module, or policy using OrbitanOS AI. Documents are grounded in your real operational data.
                </p>
                <Button size="sm" className="gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white"
                  onClick={() => setShowGenerateModal(true)}>
                  <Sparkles className="w-4 h-4" />
                  Generate Your First Document
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(doc => (
                  <AIDocumentCard
                    key={doc.id}
                    document={doc}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

      </div>

      <GenerateModal
        open={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        tenant={{ ...tenantConfig.tenantRecord, industry: tenantConfig.industry, name: tenantConfig.name }}
        onDocumentGenerated={() => {
          setShowGenerateModal(false);
          loadDocuments();
        }}
      />
    </AppShell>
  );
}