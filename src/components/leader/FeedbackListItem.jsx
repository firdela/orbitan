// OrbitanOS — Feedback Intelligence Dashboard: Individual Feedback Row
// Displays a single IssueLog record with AI analysis overlay.

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  ChevronDown, ChevronUp, Sparkles, Loader2,
  Paperclip, CheckSquare, ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

const SEVERITY_STYLES = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const SENTIMENT_STYLES = {
  positive: 'bg-green-50 text-green-600 border-green-200',
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  negative: 'bg-amber-50 text-amber-600 border-amber-200',
  frustrated: 'bg-red-50 text-red-600 border-red-200',
};

const WORKFLOW_STATUSES = [
  'new', 'under_review', 'accepted', 'planned',
  'in_development', 'testing', 'released', 'closed',
];

const WORKFLOW_LABELS = {
  new: 'New',
  under_review: 'Under Review',
  accepted: 'Accepted',
  planned: 'Planned',
  in_development: 'In Development',
  testing: 'Testing',
  released: 'Released',
  closed: 'Closed',
};

export default function FeedbackListItem({ issue, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleReanalyze = async () => {
    setAnalyzing(true);
    try {
      await base44.functions.invoke('nexusFeedbackAnalyst', {
        issue_id: issue.id,
        action: 'force_reanalyze',
      });
      await onUpdate();
    } catch (err) {
      console.error('Reanalyze failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await base44.entities.IssueLog.update(issue.id, { workflow_status: newStatus });
      await onUpdate();
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const [converting, setConverting] = useState(false);

  const handleConvertToTask = async () => {
    setConverting(true);
    try {
      const priorityMap = { critical: 'urgent', high: 'high', medium: 'medium', low: 'low' };
      const task = await base44.entities.Task.create({
        tenant_id: issue.tenant_id,
        title: `[Feedback] ${issue.title}`,
        description: `Converted from pilot feedback.\n\nOriginal:\n${issue.description || 'N/A'}\n\nSource: ${issue.feedback_category || issue.issue_type} — Module: ${issue.module}\nReported by: ${issue.reported_by_name || 'Unknown'}`,
        priority: priorityMap[issue.severity] || priorityMap[issue.ai_priority] || 'medium',
        status: 'pending',
        module_context: issue.module || 'general',
        category: issue.feedback_category || issue.issue_type,
      });
      await base44.entities.IssueLog.update(issue.id, {
        backlog_task_id: task.id,
        workflow_status: 'accepted',
      });
      await onUpdate();
    } catch (err) {
      console.error('Convert to task failed:', err);
    } finally {
      setConverting(false);
    }
  };

  const sevStyle = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.medium;
  const sentimentStyle = SENTIMENT_STYLES[issue.ai_sentiment] || SENTIMENT_STYLES.neutral;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
      >
        {/* AI indicator */}
        <div className="mt-0.5 flex-shrink-0">
          {issue.ai_analyzed ? (
            <Sparkles className="w-4 h-4 text-orbitan-purple" />
          ) : (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin opacity-50" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded', sevStyle)}>
              {issue.severity}
            </span>
            {issue.ai_priority && (
              <span className="text-[10px] font-medium text-orbitan-purple bg-orbitan-purple-light px-1.5 py-0.5 rounded">
                AI: {issue.ai_priority}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {issue.feedback_category?.replace(/_/g, ' ')}
            </span>
            {issue.status === 'duplicate' && (
              <Badge variant="outline" className="text-[9px] h-4">Duplicate</Badge>
            )}
          </div>
          <p className="text-sm font-medium text-foreground mt-1 truncate">{issue.title}</p>
          {issue.ai_summary ? (
            <p className="text-xs text-muted-foreground mt-0.5 truncate italic">"{issue.ai_summary}"</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{issue.description?.substring(0, 100)}</p>
          )}
        </div>

        <div className="flex-shrink-0 text-right">
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border bg-muted/30 p-3 space-y-3">
          {/* Full description */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{issue.description}</p>
          </div>

          {/* Context */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Module</p>
              <p className="capitalize">{issue.module?.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Page URL</p>
              <p className="font-mono text-[11px] truncate">{issue.page_url || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Reported By</p>
              <p>{issue.reported_by_name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tenant</p>
              <p className="font-mono text-[11px] truncate">{issue.tenant_id}</p>
            </div>
          </div>

          {/* AI Analysis */}
          {issue.ai_analyzed && (
            <div className="bg-orbitan-purple-light/30 border border-orbitan-purple/20 rounded-lg p-2.5 space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orbitan-purple" />
                <p className="text-[10px] font-semibold text-orbitan-purple uppercase tracking-wider">Orbit Nexus Analysis</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Sentiment: </span>
                  <span className={cn('px-1.5 py-0.5 rounded border text-[10px] font-medium', sentimentStyle)}>
                    {issue.ai_sentiment}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority: </span>
                  <span className="font-medium">{issue.ai_priority}</span>
                </div>
              </div>
              {issue.ai_tags && issue.ai_tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">Tags:</span>
                  {issue.ai_tags.map((tag, i) => (
                    <span key={i} className="text-[10px] bg-card border border-border px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {issue.ai_duplicate_group_id && (
                <p className="text-[10px] text-muted-foreground">
                  Duplicate group: <span className="font-mono">{issue.ai_duplicate_group_id}</span>
                </p>
              )}
            </div>
          )}

          {/* Attachments */}
          {issue.attachment_urls && issue.attachment_urls.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                <Paperclip className="w-3 h-3" /> Attachments
              </p>
              <div className="flex flex-wrap gap-1.5">
                {issue.attachment_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-orbitan-blue hover:underline bg-orbitan-blue-light px-2 py-1 rounded">
                    Attachment {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Workflow status + actions */}
          <div className="flex items-center gap-2 pt-1">
            <Select value={issue.workflow_status || 'new'} onValueChange={handleStatusChange} disabled={updatingStatus}>
              <SelectTrigger className="h-7 text-xs w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORKFLOW_STATUSES.map(s => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {WORKFLOW_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleReanalyze} disabled={analyzing}>
              {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {analyzing ? 'Analyzing...' : 'Re-analyze'}
            </Button>
            {issue.backlog_task_id ? (
              <Link to={`/workspace/${issue.tenant_id}/tasks`}>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-orbitan-green border-orbitan-green/30 hover:bg-orbitan-green-light">
                  <ExternalLink className="w-3 h-3" />
                  Task Linked
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-orbitan-blue border-orbitan-blue/30 hover:bg-orbitan-blue-light" onClick={handleConvertToTask} disabled={converting}>
                {converting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckSquare className="w-3 h-3" />}
                {converting ? 'Converting...' : 'Convert to Task'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}