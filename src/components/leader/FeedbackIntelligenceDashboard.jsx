// OrbitanOS — Feedback Intelligence Dashboard
// Admin-only dashboard showing all pilot feedback with AI analysis,
// sentiment trends, duplicate grouping, and product backlog status.
// Powers the "Refine" principle: Customer Feedback → Nexus Analysis → Product Backlog.

import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import FeedbackListItem from './FeedbackListItem';
import {
  MessageSquare, Sparkles, TrendingUp, AlertTriangle, CheckCircle2,
  Loader2, RefreshCw, Search, Filter, Bug, Lightbulb, Frown, Meh, Smile,
  Building2, Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SEVERITY_FILTERS = ['all', 'critical', 'high', 'medium', 'low'];
const SENTIMENT_FILTERS = ['all', 'positive', 'neutral', 'negative', 'frustrated'];
const ANALYSIS_FILTERS = ['all', 'analyzed', 'pending'];
const WORKFLOW_FILTERS = [
  'all', 'new', 'under_review', 'accepted', 'planned',
  'in_development', 'testing', 'released', 'closed',
];

export default function FeedbackIntelligenceDashboard() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [analysisFilter, setAnalysisFilter] = useState('all');
  const [workflowFilter, setWorkflowFilter] = useState('all');
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);

  const { data: issues = [], isLoading, refetch } = useQuery({
    queryKey: ['feedback-intelligence'],
    queryFn: async () => {
      const results = await base44.entities.IssueLog.list('-created_date', 200);
      return results || [];
    },
    refetchInterval: 30000,
  });

  // ── DERIVED STATS ──
  const stats = useMemo(() => {
    const total = issues.length;
    const analyzed = issues.filter(i => i.ai_analyzed).length;
    const pending = total - analyzed;
    const critical = issues.filter(i => i.ai_priority === 'critical' || i.severity === 'critical').length;
    const duplicates = issues.filter(i => i.status === 'duplicate').length;
    const bugs = issues.filter(i => i.issue_type === 'bug' || i.feedback_category === 'bug_report').length;
    const features = issues.filter(i => i.feedback_category === 'feature_request' || i.feedback_category === 'improvement_suggestion').length;
    const open = issues.filter(i => !['closed', 'released', 'resolved'].includes(i.workflow_status) && !['resolved', 'wont_fix', 'duplicate'].includes(i.status)).length;

    // Sentiment distribution
    const sentiment = {
      positive: issues.filter(i => i.ai_sentiment === 'positive').length,
      neutral: issues.filter(i => i.ai_sentiment === 'neutral').length,
      negative: issues.filter(i => i.ai_sentiment === 'negative').length,
      frustrated: issues.filter(i => i.ai_sentiment === 'frustrated').length,
    };

    // Module distribution
    const moduleCounts = {};
    issues.forEach(i => {
      const m = i.module || 'general';
      moduleCounts[m] = (moduleCounts[m] || 0) + 1;
    });
    const topModules = Object.entries(moduleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Duplicate groups
    const dupGroups = {};
    issues.forEach(i => {
      if (i.ai_duplicate_group_id) {
        dupGroups[i.ai_duplicate_group_id] = (dupGroups[i.ai_duplicate_group_id] || 0) + 1;
      }
    });
    const topDupGroups = Object.entries(dupGroups)
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { total, analyzed, pending, critical, duplicates, bugs, features, open, sentiment, topModules, topDupGroups };
  }, [issues]);

  // ── FILTERED LIST ──
  const filteredIssues = useMemo(() => {
    return issues.filter(i => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches = (i.title?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.ai_summary?.toLowerCase().includes(q) ||
          i.ai_tags?.some(t => t.includes(q)));
        if (!matches) return false;
      }
      if (severityFilter !== 'all' && i.severity !== severityFilter && i.ai_priority !== severityFilter) return false;
      if (sentimentFilter !== 'all' && i.ai_sentiment !== sentimentFilter) return false;
      if (analysisFilter === 'analyzed' && !i.ai_analyzed) return false;
      if (analysisFilter === 'pending' && i.ai_analyzed) return false;
      if (workflowFilter !== 'all' && i.workflow_status !== workflowFilter) return false;
      return true;
    });
  }, [issues, searchQuery, severityFilter, sentimentFilter, analysisFilter, workflowFilter]);

  // ── BATCH RE-ANALYZE PENDING ──
  const handleBatchAnalyze = async () => {
    const pending = issues.filter(i => !i.ai_analyzed);
    if (pending.length === 0) return;

    setBatchAnalyzing(true);
    try {
      // Process sequentially to avoid rate limits
      for (const issue of pending) {
        await base44.functions.invoke('nexusFeedbackAnalyst', { issue_id: issue.id });
      }
      await refetch();
    } catch (err) {
      console.error('Batch analyze failed:', err);
    } finally {
      setBatchAnalyzing(false);
    }
  };

  const handleRefresh = async () => {
    await refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orbitan-purple" />
            Feedback Intelligence
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pilot feedback analysed by Orbit Nexus AI · Refine & Regulate principle · Auto-refreshes every 30s
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats.pending > 0 && (
            <Button variant="outline" size="sm" onClick={handleBatchAnalyze} disabled={batchAnalyzing} className="gap-1.5 text-xs">
              {batchAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {batchAnalyzing ? 'Analyzing...' : `Analyze ${stats.pending} Pending`}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-orbitan-blue" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Feedback</span>
          </div>
          <p className="text-xl font-bold font-display">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">{stats.open} open · {stats.analyzed} analyzed</p>
        </div>
        <div className={cn('bg-card border rounded-xl p-4', stats.critical > 0 ? 'border-red-200' : 'border-border')}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={cn('w-3.5 h-3.5', stats.critical > 0 ? 'text-red-500' : 'text-muted-foreground')} />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Critical / High</span>
          </div>
          <p className={cn('text-xl font-bold font-display', stats.critical > 0 ? 'text-red-500' : '')}>{stats.critical}</p>
          <p className="text-[10px] text-muted-foreground">AI-flagged priorities</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Bug className="w-3.5 h-3.5 text-orbitan-red" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Bugs vs Features</span>
          </div>
          <p className="text-xl font-bold font-display">{stats.bugs}<span className="text-sm text-muted-foreground"> / {stats.features}</span></p>
          <p className="text-[10px] text-muted-foreground">Bugs / Feature requests</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-orbitan-purple" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Duplicates</span>
          </div>
          <p className="text-xl font-bold font-display">{stats.duplicates}</p>
          <p className="text-[10px] text-muted-foreground">AI-grouped reports</p>
        </div>
      </div>

      {/* Sentiment + Top Modules row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sentiment distribution */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Sentiment Distribution
          </h3>
          <div className="space-y-2">
            {[
              { key: 'positive', label: 'Positive', icon: Smile, color: 'text-green-500', bg: 'bg-green-400' },
              { key: 'neutral', label: 'Neutral', icon: Meh, color: 'text-slate-500', bg: 'bg-slate-400' },
              { key: 'negative', label: 'Negative', icon: Frown, color: 'text-amber-500', bg: 'bg-amber-400' },
              { key: 'frustrated', label: 'Frustrated', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500' },
            ].map(s => {
              const count = stats.sentiment[s.key];
              const pct = stats.analyzed > 0 ? Math.round((count / stats.analyzed) * 100) : 0;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <s.icon className={cn('w-4 h-4 flex-shrink-0', s.color)} />
                  <span className="text-xs w-20">{s.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', s.bg)} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top modules + dup groups */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" /> Top Reported Modules
          </h3>
          {stats.topModules.length === 0 ? (
            <p className="text-xs text-muted-foreground">No feedback yet.</p>
          ) : (
            <div className="space-y-1.5">
              {stats.topModules.map(([mod, count]) => (
                <div key={mod} className="flex items-center justify-between text-xs">
                  <span className="capitalize">{mod.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-orbitan-blue rounded-full" style={{ width: `${(count / stats.total) * 100}%` }} />
                    </div>
                    <span className="font-medium w-4 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {stats.topDupGroups.length > 0 && (
            <>
              <div className="border-t border-border mt-3 pt-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Duplicate Clusters</p>
                <div className="space-y-1">
                  {stats.topDupGroups.map(([group, count]) => (
                    <div key={group} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[11px] truncate">{group}</span>
                      <span className="bg-orbitan-purple-light text-orbitan-purple px-1.5 py-0.5 rounded text-[10px] font-medium">{count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search feedback title, description, AI summary, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs pl-8"
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="h-8 text-xs w-28">
            <Filter className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEVERITY_FILTERS.map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
          <SelectTrigger className="h-8 text-xs w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SENTIMENT_FILTERS.map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={analysisFilter} onValueChange={setAnalysisFilter}>
          <SelectTrigger className="h-8 text-xs w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANALYSIS_FILTERS.map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
          <SelectTrigger className="h-8 text-xs w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORKFLOW_FILTERS.map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Feedback list */}
      {filteredIssues.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {issues.length === 0
              ? 'No feedback received yet. Pilot tenants can submit feedback via the floating "Feedback" button.'
              : 'No feedback matches your current filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredIssues.map(issue => (
            <FeedbackListItem
              key={issue.id}
              issue={issue}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['feedback-intelligence'] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}