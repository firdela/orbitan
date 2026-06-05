// ============================================================
// ORBITAN AI SUITE — Generate Modal
// Model selector, context injection, and generation trigger.
// Handles both SOP/Policy (Regulate) and Training (Renew) flows.
// ============================================================

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Bot, BookOpen, GraduationCap, ScrollText, ClipboardList, ShieldCheck,
  Zap, Brain, Cpu, Loader2, CheckCircle2, AlertCircle, ChevronRight
} from 'lucide-react';

const DOCUMENT_TYPES = [
  { key: 'sop', label: 'Standard Operating Procedure', icon: BookOpen, principle: 'Regulate', color: '#DC2626', description: 'Step-by-step procedure for a specific operational task' },
  { key: 'training_module', label: 'Training Module', icon: GraduationCap, principle: 'Renew', color: '#16A34A', description: 'Personalised training derived from operational performance data' },
  { key: 'policy', label: 'Organisational Policy', icon: ScrollText, principle: 'Regulate', color: '#7C3AED', description: 'Formal policy document for governance and compliance' },
  { key: 'shift_brief', label: 'Shift Brief', icon: ClipboardList, principle: 'Respond', color: '#F97316', description: 'Quick operational brief for an upcoming shift' },
  { key: 'compliance_checklist', label: 'Compliance Checklist', icon: ShieldCheck, principle: 'Regulate', color: '#DC2626', description: 'Structured audit or compliance verification checklist' },
];

const MODELS = [
  { key: null, label: 'Auto-Select (Recommended)', icon: Bot, description: 'OrbitanOS selects the optimal model for your document type' },
  { key: 'claude_sonnet_4_6', label: 'Deep Reasoning', icon: Brain, description: 'Best for complex SOPs, policies & compliance docs', badge: 'Premium Credits' },
  { key: 'automatic', label: 'Standard', icon: Cpu, description: 'Balanced speed and quality for most documents' },
  { key: 'gemini_3_flash', label: 'Fast', icon: Zap, description: 'Ultra-fast for shift briefs and simple training tips', badge: 'Low Credits' },
];

export default function GenerateModal({ open, onClose, tenant, onDocumentGenerated }) {
  const [step, setStep] = useState(1); // 1: type, 2: config, 3: generating, 4: done
  const [selectedType, setSelectedType] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1); setSelectedType(null); setSelectedModel(null);
        setTitle(''); setNotes(''); setError(null); setResult(null);
      }, 300);
    }
  }, [open]);

  const isTraining = selectedType?.key === 'training_module';
  const functionName = isTraining ? 'trainingGenerator' : 'sopGenerator';

  const handleGenerate = async () => {
    if (!title.trim()) { setError('Please provide a document title.'); return; }
    setError(null);
    setStep(3);

    try {
      const payload = {
        document_type: selectedType.key,
        title: title.trim(),
        tenant_id: tenant?.id || tenant?.tenant_id,
        outlet_id: tenant?.outlet_id || null,
        industry: tenant?.industry || 'other',
        tenant_name: tenant?.name,
        model_preference: selectedModel,
        notes: notes.trim(),
        days_lookback: 14,
      };

      const response = await base44.functions.invoke(functionName, payload);
      setResult(response.data);
      setStep(4);
      onDocumentGenerated?.();
    } catch (err) {
      setError(err.message || 'Generation failed. Please try again.');
      setStep(2);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            OrbitanOS AI Suite — Generate Document
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Select Document Type */}
        {step === 1 && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">What would you like to generate?</p>
            <div className="space-y-2">
              {DOCUMENT_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.key}
                    onClick={() => { setSelectedType(type); setStep(2); }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all hover:border-primary hover:shadow-sm",
                      "bg-card"
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: type.color + '15' }}>
                      <Icon className="w-4 h-4" style={{ color: type.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{type.label}</p>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ color: type.color, background: type.color + '15' }}>
                          {type.principle}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Configuration */}
        {step === 2 && selectedType && (
          <div className="space-y-4 py-2">
            {/* Selected type header */}
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: selectedType.color + '10' }}>
              <selectedType.icon className="w-4 h-4" style={{ color: selectedType.color }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: selectedType.color }}>{selectedType.label}</p>
                <p className="text-xs text-muted-foreground">{selectedType.principle} Principle · {tenant?.name}</p>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Document Title *</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={
                  selectedType.key === 'sop' ? 'e.g. Food Temperature Check SOP' :
                  selectedType.key === 'training_module' ? 'e.g. Food Safety Refresher — Kitchen Staff' :
                  selectedType.key === 'policy' ? 'e.g. Attendance & Punctuality Policy' :
                  selectedType.key === 'shift_brief' ? 'e.g. Friday Evening Shift Brief' :
                  'e.g. Monthly Hygiene Compliance Checklist'
                }
                className="text-sm"
              />
            </div>

            {/* AI Model Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">AI Model</label>
              <div className="space-y-1.5">
                {MODELS.map(model => {
                  const Icon = model.icon;
                  const isSelected = selectedModel === model.key;
                  return (
                    <button
                      key={String(model.key)}
                      onClick={() => setSelectedModel(model.key)}
                      className={cn(
                        "w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all text-xs",
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                      <div className="flex-1">
                        <span className={cn("font-medium", isSelected ? "text-primary" : "text-foreground")}>{model.label}</span>
                        <span className="text-muted-foreground ml-1.5">{model.description}</span>
                      </div>
                      {model.badge && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{model.badge}</span>
                      )}
                      {isSelected && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Context notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Additional Context <span className="font-normal text-muted-foreground">(optional)</span></label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any specific focus areas, regulatory requirements, or context you want the AI to include..."
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            {/* AI context note */}
            {isTraining && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                <Bot className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-green-700">
                  The Training Generator will automatically analyse the last 14 days of audit events and workforce performance data to create contextually grounded training content.
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>Back</Button>
              <Button size="sm" className="flex-1 gap-2" onClick={handleGenerate} disabled={!title.trim()}>
                <Bot className="w-3.5 h-3.5" />
                Generate with AI
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Generating */}
        {step === 3 && (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border-2 border-purple-300 flex items-center justify-center">
                <Loader2 className="w-3 h-3 text-purple-500 animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-heading font-semibold text-foreground mb-1">Generating {selectedType?.label}...</p>
              <p className="text-sm text-muted-foreground">OrbitanOS AI is analysing your operational context and crafting your document.</p>
              <p className="text-xs text-muted-foreground mt-2">This typically takes 15–30 seconds.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse delay-75" />
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse delay-150" />
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && result && (
          <div className="py-6 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <div className="text-center">
              <p className="font-heading font-semibold text-foreground mb-1">Document Generated Successfully</p>
              <p className="text-sm text-muted-foreground mb-4">
                {result.status === 'auto_published'
                  ? 'Your document has been auto-published and is ready to use.'
                  : 'Your document has been added to the review queue. A manager must approve it before it becomes active.'}
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border"
                style={result.status === 'auto_published'
                  ? { background: '#EFF6FF', color: '#2563EB', borderColor: '#BFDBFE' }
                  : { background: '#FFFBEB', color: '#D97706', borderColor: '#FDE68A' }}>
                {result.status === 'auto_published' ? <Zap className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                {result.status === 'auto_published' ? 'Auto-Published' : 'Pending Manager Review'}
              </div>
            </div>
            <div className="w-full p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground line-clamp-4">{result.content_preview}</p>
            </div>
            <Button size="sm" className="w-full" onClick={onClose}>
              Done — View in AI Studio
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}