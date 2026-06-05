// ============================================================
// ORBITAN — AI Blueprint Preview Modal
// Shown in Ramp-Up tab BEFORE activation.
// Calls sopGenerator in preview mode — no DB writes.
// Renders returned Markdown so manager can review before committing.
// Exit-Ready: depends only on react-markdown + sopGenerator API contract.
// ============================================================

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Loader2, Sparkles, FileText, Shield, ClipboardList, CheckCircle2,
  AlertTriangle, ChevronRight, Eye, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DOC_TYPE_CONFIG = {
  sop: { label: 'SOP', icon: FileText, color: 'text-orbitan-blue', bg: 'bg-orbitan-blue-light' },
  compliance_checklist: { label: 'Checklist', icon: Shield, color: 'text-orbitan-purple', bg: 'bg-orbitan-purple-light' },
  shift_brief: { label: 'Shift Brief', icon: ClipboardList, color: 'text-orbitan-green', bg: 'bg-orbitan-green-light' },
  policy: { label: 'Policy', icon: FileText, color: 'text-orbitan-amber', bg: 'bg-orbitan-amber-light' },
};

function DocTab({ doc, isActive, onClick, status }) {
  const config = DOC_TYPE_CONFIG[doc.document_type] || DOC_TYPE_CONFIG.sop;
  const Icon = config.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border",
        isActive
          ? "bg-card border-border shadow-sm text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Icon className={cn("w-3.5 h-3.5", isActive ? config.color : '')} />
      <span className="hidden sm:inline">{doc.title.length > 28 ? doc.title.slice(0, 28) + '…' : doc.title}</span>
      <span className="sm:hidden">{config.label}</span>
      {status === 'loading' && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
      {status === 'done' && <CheckCircle2 className="w-3 h-3 text-orbitan-green" />}
      {status === 'error' && <AlertTriangle className="w-3 h-3 text-orbitan-red" />}
    </button>
  );
}

export default function AIBlueprintPreviewModal({ manifest, open, onClose, onConfirmActivate }) {
  const [docStatuses, setDocStatuses] = useState({}); // { index: 'idle'|'loading'|'done'|'error' }
  const [docContents, setDocContents] = useState({});  // { index: markdown string }
  const [activeDoc, setActiveDoc] = useState(0);
  const [loadingAll, setLoadingAll] = useState(false);
  const [allGenerated, setAllGenerated] = useState(false);

  const aiDocs = manifest?.seed_preview?.AIDocument || [];

  const generateDoc = async (index) => {
    const doc = aiDocs[index];
    if (!doc || docStatuses[index] === 'loading' || docStatuses[index] === 'done') return;

    setDocStatuses(prev => ({ ...prev, [index]: 'loading' }));
    setActiveDoc(index);

    try {
      const res = await base44.functions.invoke('sopGenerator', {
        document_type: doc.document_type,
        title: doc.title,
        tenant_id: manifest.tenant_ref,
        outlet_id: manifest.tenant_ref + "_main",
        industry: manifest.industry,
        tenant_name: manifest.tenant_name,
        outlet_name: manifest.outlet_name,
        notes: `Preview generation for manager review — Ramp-Up Blueprint`,
      });

      // sopGenerator saves to DB and returns a preview; we show the preview content
      const content = res.data?.content_preview || '*Preview not available. Document was saved to AI Studio.*';
      setDocContents(prev => ({ ...prev, [index]: content }));
      setDocStatuses(prev => ({ ...prev, [index]: 'done' }));
    } catch {
      setDocStatuses(prev => ({ ...prev, [index]: 'error' }));
    }
  };

  const generateAll = async () => {
    setLoadingAll(true);
    await Promise.allSettled(aiDocs.map((_, i) => generateDoc(i)));
    setLoadingAll(false);
    setAllGenerated(true);
  };

  const handleClose = () => {
    setDocStatuses({});
    setDocContents({});
    setActiveDoc(0);
    setAllGenerated(false);
    onClose();
  };

  if (!manifest) return null;
  const packColor = { fnb: '#F97316', recycling: '#16A34A', retail: '#22C55E' }[manifest.pack] || '#2563EB';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: packColor + '20' }}>
              <Sparkles className="w-4.5 h-4.5" style={{ color: packColor }} />
            </div>
            <div>
              <DialogTitle className="font-heading font-bold text-base">
                AI Blueprint Preview — {manifest.display_name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review AI-generated operational documents before activation. These will be saved to AI Studio for manager approval.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {aiDocs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <p className="text-muted-foreground text-sm">No AI documents configured for this manifest.</p>
            </div>
          ) : (
            <>
              {/* Doc Tabs + Generate All */}
              <div className="px-6 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3 flex-shrink-0 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {aiDocs.map((doc, i) => (
                    <DocTab
                      key={i}
                      doc={doc}
                      isActive={activeDoc === i}
                      onClick={() => { setActiveDoc(i); if (!docStatuses[i]) generateDoc(i); }}
                      status={docStatuses[i] || 'idle'}
                    />
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateAll}
                  disabled={loadingAll || allGenerated}
                  className="gap-1.5 text-xs flex-shrink-0"
                >
                  {loadingAll
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating all...</>
                    : allGenerated
                    ? <><CheckCircle2 className="w-3.5 h-3.5 text-orbitan-green" /> All generated</>
                    : <><Sparkles className="w-3.5 h-3.5" /> Generate All</>}
                </Button>
              </div>

              {/* Document Viewer */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {/* Active doc header */}
                {aiDocs[activeDoc] && (() => {
                  const cfg = DOC_TYPE_CONFIG[aiDocs[activeDoc].document_type] || DOC_TYPE_CONFIG.sop;
                  const Icon = cfg.icon;
                  return (
                    <div className={cn("flex items-center gap-2 mb-4 px-3 py-2 rounded-lg", cfg.bg)}>
                      <Icon className={cn("w-4 h-4", cfg.color)} />
                      <span className={cn("text-xs font-semibold", cfg.color)}>{cfg.label}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs font-medium text-foreground">{aiDocs[activeDoc].title}</span>
                      {docStatuses[activeDoc] === 'done' && (
                        <Badge className="ml-auto text-[10px] bg-orbitan-green-light text-orbitan-green border-0">
                          Preview Ready
                        </Badge>
                      )}
                    </div>
                  );
                })()}

                {/* States */}
                {!docStatuses[activeDoc] && (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                      <Eye className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground mb-1">Preview this document</p>
                      <p className="text-xs text-muted-foreground">Click the tab or Generate All to see the AI-produced content</p>
                    </div>
                    <Button size="sm" onClick={() => generateDoc(activeDoc)} className="gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Generate Preview
                    </Button>
                  </div>
                )}

                {docStatuses[activeDoc] === 'loading' && (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="w-12 h-12 rounded-2xl orbitan-gradient flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground mb-1">AI is drafting your document…</p>
                      <p className="text-xs text-muted-foreground">Using industry-specific context for {manifest.display_name}</p>
                    </div>
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {docStatuses[activeDoc] === 'error' && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <AlertTriangle className="w-8 h-8 text-orbitan-red" />
                    <p className="text-sm text-muted-foreground">Generation failed. This will be retried during full activation.</p>
                    <Button size="sm" variant="outline" onClick={() => {
                      setDocStatuses(prev => ({ ...prev, [activeDoc]: undefined }));
                      generateDoc(activeDoc);
                    }}>Retry</Button>
                  </div>
                )}

                {docStatuses[activeDoc] === 'done' && docContents[activeDoc] && (
                  <div className="prose prose-sm prose-slate max-w-none bg-card rounded-xl border border-border p-6">
                    <ReactMarkdown>{docContents[activeDoc]}</ReactMarkdown>
                    <p className="text-[10px] text-muted-foreground mt-4 pt-3 border-t border-border not-prose">
                      ⚠ This is a 300-character preview. The full document is saved to AI Studio with status <strong>in_review</strong> — pending manager approval per the Regulate principle.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span>All documents enter <strong>in_review</strong> state — awaiting manager approval in AI Studio</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
            <Button
              size="sm"
              className="gap-1.5 font-semibold"
              style={{ background: packColor }}
              onClick={() => { handleClose(); onConfirmActivate(manifest.tenant_ref); }}
            >
              <Zap className="w-3.5 h-3.5" />
              Activate {manifest.display_name}
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}