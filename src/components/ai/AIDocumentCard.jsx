// ============================================================
// ORBITAN AI SUITE — AI Document Card Component
// Displays a single AIDocument with status, type, principle badge
// and expand/review actions.
// ============================================================

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import {
  BookOpen, GraduationCap, ScrollText, ClipboardList, ShieldCheck,
  ChevronDown, ChevronUp, CheckCircle2, Clock, XCircle, Zap,
  Bot, Eye, Calendar
} from 'lucide-react';

const TYPE_CONFIG = {
  sop: { label: 'SOP', icon: BookOpen, color: '#DC2626', bg: '#FEF2F2', principle: 'Regulate' },
  training_module: { label: 'Training Module', icon: GraduationCap, color: '#16A34A', bg: '#F0FDF4', principle: 'Renew' },
  policy: { label: 'Policy', icon: ScrollText, color: '#7C3AED', bg: '#F5F3FF', principle: 'Regulate' },
  shift_brief: { label: 'Shift Brief', icon: ClipboardList, color: '#F97316', bg: '#FFF7ED', principle: 'Respond' },
  compliance_checklist: { label: 'Compliance Checklist', icon: ShieldCheck, color: '#DC2626', bg: '#FEF2F2', principle: 'Regulate' },
};

const STATUS_CONFIG = {
  in_review: { label: 'Pending Review', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  approved: { label: 'Approved', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  auto_published: { label: 'Auto-Published', icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  generating: { label: 'Generating...', icon: Bot, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  archived: { label: 'Archived', icon: Eye, color: 'text-muted-foreground', bg: 'bg-muted border-border' },
};

export default function AIDocumentCard({ document, onApprove, onReject, onView, compact = false }) {
  const [expanded, setExpanded] = useState(false);

  const typeConfig = TYPE_CONFIG[document.document_type] || TYPE_CONFIG.sop;
  const statusConfig = STATUS_CONFIG[document.status] || STATUS_CONFIG.in_review;
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;

  return (
    <div className={cn(
      "bg-card border border-border rounded-xl transition-all duration-200",
      document.status === 'in_review' && "border-amber-200 shadow-sm shadow-amber-100",
      document.status === 'approved' && "border-green-200",
    )}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Type icon */}
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: typeConfig.bg }}>
            <TypeIcon className="w-4 h-4" style={{ color: typeConfig.color }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="font-heading font-semibold text-foreground text-sm leading-tight">{document.title}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ color: typeConfig.color, background: typeConfig.bg }}>
                    {typeConfig.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {typeConfig.principle} Principle
                  </span>
                  {document.model_used && (
                    <span className="text-[10px] flex items-center gap-0.5 text-muted-foreground">
                      <Bot className="w-2.5 h-2.5" />
                      {document.model_used === 'claude_sonnet_4_6' ? 'Deep AI' :
                       document.model_used === 'gemini_3_flash' ? 'Fast AI' : 'Standard AI'}
                    </span>
                  )}
                </div>
              </div>

              {/* Status badge */}
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium flex-shrink-0",
                statusConfig.bg, statusConfig.color
              )}>
                <StatusIcon className="w-3 h-3" />
                {statusConfig.label}
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
              {document.ai_confidence_score && (
                <span>AI Confidence: {document.ai_confidence_score}%</span>
              )}
              {document.created_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(document.created_date).toLocaleDateString('en-SG')}
                </span>
              )}
              {document.reviewed_by_name && (
                <span>Reviewed by: {document.reviewed_by_name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {!compact && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 h-7"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Collapse' : 'View Document'}
            </Button>

            {document.status === 'in_review' && (
              <>
                <Button
                  size="sm"
                  className="text-xs gap-1 h-7 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => onApprove?.(document)}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1 h-7 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => onReject?.(document)}
                >
                  <XCircle className="w-3 h-3" />
                  Reject
                </Button>
              </>
            )}

            {onView && (
              <Button variant="outline" size="sm" className="text-xs gap-1 h-7 ml-auto"
                onClick={() => onView(document)}>
                <Eye className="w-3 h-3" />
                Full View
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Expanded content */}
      {expanded && document.content_markdown && (
        <div className="border-t border-border px-4 py-4">
          <div className="prose prose-sm max-w-none text-foreground prose-headings:font-heading prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground max-h-[500px] overflow-y-auto">
            <ReactMarkdown>{document.content_markdown}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}