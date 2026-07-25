// ============================================================
// ORBITANOS — Feedback Centre (Tenant-Facing)
//
// The pilot user's feedback dashboard. Shows their submitted
// feedback with full lifecycle tracking (New → Released),
// AI analysis results from Orbit Nexus, and a "Submit New"
// button that opens the ReportIssueModal.
//
// Closes the continuous improvement loop:
//   Customer Feedback → Nexus Analysis → Product Backlog → Release
//
// RLS: IssueLog entity enforces tenant isolation — users only
// see feedback from their own organisation (or their own
// submissions for workers).
// ============================================================

import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/lib/use-tenant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import ReportIssueModal from '@/components/shared/ReportIssueModal';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import StatusBadge from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import {
  MessageSquare, Sparkles, TrendingUp, CheckCircle2, Loader2,
  Search, Filter, RefreshCw, Plus, Bug, Lightbulb, Shield,
  MousePointerClick, Database, Heart, Zap, Paperclip,
  CircleDot, ArrowRight, Clock, Package, Users, ShoppingCart,
  FileText, Calendar, BarChart2, AlertTriangle, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ISSUE_TYPE_ICONS = {
  bug: Bug,
  improvement: Lightbulb,
  usability: MousePointerClick,
  compliance_query: Shield,
  data_issue: Database,
};

const MODULE_ICONS = {
  general: MessageSquare, inventory: Package, procurement: ShoppingCart,
  sales_invoice: FileText, workforce: Users, scheduling: Calendar,
  reporting: BarChart2, compliance: Shield, finance: FileText,
  ai_studio: Sparkles, wallet: Zap, marketplace: Package, shield: Lock,
};

const WORKFLOW_STEPS = [
  { key: 'new', label: 'New' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'planned', label: 'Planned' },
  { key: 'in_development', label: 'In Development' },
  { key: 'testing', label: 'Testing' },
  { key: 'released', label: 'Released' },
  { key: 'closed', label: 'Closed' },
];

const WORKFLOW_FILTERS = ['all', ...WORKFLOW_STEPS.map(s => s.key)];

// Severity badges now use the shared StatusBadge component (keys: low/medium/high/critical)

const SENTIMENT_STYLES = {
  positive: { icon: '😊', color: 'text-green-600' },
  neutral: { icon: '😐', color: 'text-slate-500' },
  negative: { icon: '😟', color: 'text-amber-600' },
  frustrated: { icon: '😤', color: 'text-red-600' },
};

export default function FeedbackCentre() {
  const queryClient = useQueryClient();
  const { currentTenant: tenant } = useTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [workflowFilter, setWorkflowFilter] = useState('all');
  const [showReportModal, setShowReportModal] = useState(false);

  const { data: issues = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['feedback-centre', tenant?.id],
    queryFn: async () => {
      const results = await base44.entities.IssueLog.list('-created_date', 100);
      return results || [];
    },
    refetchInterval: 30000,
  });

  // ── DERIVED STATS ──
  const stats = useMemo(() => {
    const total = issues.length;
    const open = issues.filter(i =>
      !['closed', 'released'].includes(i.workflow_status) &&
      !['resolved', 'wont_fix', 'duplicate'].includes(i.status)
    ).length;
    const inProgress = issues.filter(i =>
      ['accepted', 'planned', 'in_development', 'testing'].includes(i.workflow_status)
    ).length;
    const released = issues.filter(i =>
      ['released', 'closed'].includes(i.workflow_status) ||
      i.status === 'resolved'
    ).length;
    const analyzed = issues.filter(i => i.ai_analyzed).length;

    return { total, open, inProgress, released, analyzed };
  }, [issues]);

  // ── FILTERED LIST ──
  const filteredIssues = useMemo(() => {
    return issues.filter(i => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches = i.title?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.ai_summary?.toLowerCase().includes(q) ||
          i.ai_tags?.some(t => t.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (workflowFilter !== 'all' && i.workflow_status !== workflowFilter) return false;
      return true;
    });
  }, [issues, searchQuery, workflowFilter]);

  // ── RELEASED ITEMS ("You asked, we delivered") ──
  const releasedItems = useMemo(() => {
    return issues.filter(i =>
      i.workflow_status === 'released' || i.status === 'resolved'
    );
  }, [issues]);

  const handleRefresh = async () => {
    await refetch();
  };

  const handleSubmitted = () => {
    queryClient.invalidateQueries({ queryKey: ['feedback-centre'] });
    setShowReportModal(false);
  };

  if (isLoading) {
    return (
      <div className="py-4">
        <LoadingState message="Loading feedback..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Feedback Centre"
        subtitle="Help us refine OrbitanOS. Your feedback is analysed by Orbit Nexus AI and routed directly to our product team."
        actions={
          <Button size="sm" onClick={() => setShowReportModal(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Submit Feedback
          </Button>
        }
      />

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-orbitan-blue" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Submitted</span>
          </div>
          <p className="text-xl font-bold font-display">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">{stats.analyzed} AI-analyzed</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Open</span>
          </div>
          <p className="text-xl font-bold font-display">{stats.open}</p>
          <p className="text-[10px] text-muted-foreground">Awaiting review</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-orbitan-purple" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">In Progress</span>
          </div>
          <p className="text-xl font-bold font-display">{stats.inProgress}</p>
          <p className="text-[10px] text-muted-foreground">Being worked on</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-orbitan-green" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Resolved</span>
          </div>
          <p className="text-xl font-bold font-display">{stats.released}</p>
          <p className="text-[10px] text-muted-foreground">Released / Closed</p>
        </Card>
      </div>

      {/* "You Asked, We Delivered" callout */}
      {releasedItems.length > 0 && (
        <Card className="p-4 border-orbitan-green/30 bg-orbitan-green-light/30">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-orbitan-green" />
            <h3 className="text-xs font-semibold text-orbitan-green uppercase tracking-wider">You Asked, We Delivered</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {releasedItems.length} feedback item{releasedItems.length !== 1 ? 's' : ''} you submitted have been addressed in a release.
          </p>
          <div className="space-y-1">
            {releasedItems.slice(0, 3).map(item => (
              <div key={item.id} className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-3 h-3 text-orbitan-green flex-shrink-0" />
                <span className="font-medium text-foreground truncate">{item.title}</span>
                {item.ai_summary && (
                  <span className="text-muted-foreground truncate hidden sm:inline">— {item.ai_summary}</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search your feedback..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 text-sm pl-8"
          />
        </div>
        <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
          <SelectTrigger className="h-9 text-sm w-40">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORKFLOW_FILTERS.map(s => (
              <SelectItem key={s} value={s} className="text-sm capitalize">
                {s === 'all' ? 'All Status' : s.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5 text-xs h-9" disabled={isFetching}>
          {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </Button>
      </div>

      {/* Feedback List */}
      {filteredIssues.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={issues.length === 0 ? "No feedback yet" : "No feedback matches your filters"}
          description={issues.length === 0
            ? "Submit your first feedback item to help us improve OrbitanOS. Bug reports, feature requests, and suggestions are all welcome."
            : "Try adjusting your search or filter to find what you're looking for."
          }
          actionLabel={issues.length === 0 ? "Submit Feedback" : undefined}
          onAction={issues.length === 0 ? () => setShowReportModal(true) : undefined}
          color="blue"
        />
      ) : (
        <div className="space-y-3">
          {filteredIssues.map(issue => (
            <FeedbackCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}

      {/* Report Issue Modal */}
      <ReportIssueModal
        hideFloatingButton
        externalOpen={showReportModal}
        onExternalClose={handleSubmitted}
      />
    </div>
  );
}

// ── Individual Feedback Card ─────────────────────────────────
function FeedbackCard({ issue }) {
  const [expanded, setExpanded] = useState(false);
  const TypeIcon = ISSUE_TYPE_ICONS[issue.issue_type] || MessageSquare;
  const ModuleIcon = MODULE_ICONS[issue.module] || MessageSquare;
  const workflowStepIdx = WORKFLOW_STEPS.findIndex(s => s.key === issue.workflow_status);
  const sentiment = issue.ai_sentiment ? SENTIMENT_STYLES[issue.ai_sentiment] : null;

  return (
    <Card className="p-4 card-elevated">
      {/* Top row: type icon + title + status */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <TypeIcon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate">{issue.title}</h3>
            {issue.severity && (
              <StatusBadge status={issue.severity} className="flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] text-muted-foreground capitalize flex items-center gap-1">
              <ModuleIcon className="w-3 h-3" />
              {issue.module?.replace(/_/g, ' ') || 'general'}
            </span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground capitalize">
              {issue.feedback_category?.replace(/_/g, ' ') || 'general feedback'}
            </span>
            {issue.attachment_urls?.length > 0 && (
              <>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Paperclip className="w-2.5 h-2.5" />
                  {issue.attachment_urls.length}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI Analysis badge */}
      {issue.ai_analyzed && issue.ai_summary && (
        <div className="mt-3 flex items-start gap-2 bg-orbitan-purple-light/30 rounded-lg px-3 py-2">
          <Sparkles className="w-3 h-3 text-orbitan-purple flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground/80">{issue.ai_summary}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {sentiment && (
                <span className={cn('text-[10px] font-medium', sentiment.color)}>
                  {sentiment.icon} {issue.ai_sentiment}
                </span>
              )}
              {issue.ai_priority && (
                <span className="text-[10px] text-muted-foreground">Priority: {issue.ai_priority}</span>
              )}
              {issue.ai_tags?.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending AI analysis indicator */}
      {!issue.ai_analyzed && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Orbit Nexus AI analysis in progress...
        </div>
      )}

      {/* Lifecycle progress bar */}
      {workflowStepIdx >= 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-0.5">
            {WORKFLOW_STEPS.map((step, idx) => {
              const isCompleted = idx < workflowStepIdx;
              const isCurrent = idx === workflowStepIdx;
              const isReleased = issue.workflow_status === 'released' || issue.status === 'resolved';
              return (
                <React.Fragment key={step.key}>
                  {idx > 0 && (
                    <div className={cn(
                      'flex-1 h-0.5 rounded-full transition-colors',
                      idx <= workflowStepIdx ? 'bg-orbitan-green' : 'bg-muted'
                    )} />
                  )}
                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                    <div className={cn(
                      'w-4 h-4 rounded-full flex items-center justify-center transition-colors',
                      isCompleted ? 'bg-orbitan-green text-white' :
                      isCurrent ? (isReleased ? 'bg-orbitan-green text-white' : 'bg-orbitan-blue text-white') :
                      'bg-muted text-muted-foreground'
                    )}>
                      {isCompleted || (isCurrent && isReleased) ? (
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      ) : isCurrent ? (
                        <CircleDot className="w-2.5 h-2.5" />
                      ) : (
                        <span className="text-[7px]">{idx + 1}</span>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">
              {WORKFLOW_STEPS[workflowStepIdx]?.label || 'New'}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {issue.workflow_status === 'released' || issue.status === 'resolved'
                ? '✓ Released'
                : `${workflowStepIdx + 1} of ${WORKFLOW_STEPS.length}`}
            </span>
          </div>
        </div>
      )}

      {/* Expandable description */}
      {issue.description && (
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls={`issue-detail-${issue.id}`}
          className="mt-3 text-xs text-orbitan-blue hover:underline flex items-center gap-1"
        >
          {expanded ? 'Hide details' : 'Show details'}
          <ArrowRight className={cn('w-3 h-3 transition-transform', expanded && 'rotate-90')} />
        </button>
      )}
      {expanded && issue.description && (
        <p id={`issue-detail-${issue.id}`} className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
          {issue.description}
        </p>
      )}

      {/* Attachments (when expanded) */}
      {expanded && issue.attachment_urls?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {issue.attachment_urls.map((url, idx) => (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-orbitan-blue hover:underline bg-muted/50 rounded-lg px-2 py-1"
            >
              <Paperclip className="w-3 h-3" />
              Attachment {idx + 1}
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}