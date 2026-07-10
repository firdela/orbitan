import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ArrowRight, ArrowLeft, Brain, Shield,
  Users, Rocket, Utensils, HeartPulse, DollarSign, Leaf, Building,
  Store, ShoppingBag, Truck, GraduationCap, Cpu, PartyPopper, Building2,
  Check
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { INDUSTRY_PACKS, SUBSCRIPTION_PLANS, MODULES } from '@/lib/orbitan-config';
import PrescriptionCard from './diagnostic/PrescriptionCard';

const STAGES = [
  { key: 'intent', label: 'Your Goal' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'industry', label: 'Industry' },
  { key: 'scale', label: 'Scale' },
];

const INTENT_OPTIONS = [
  { value: 'workforce_ops', label: 'Manage workforce & operations', desc: 'Staff scheduling, attendance, inventory, procurement', icon: Users },
  { value: 'ai_intelligence', label: 'AI to help run my business', desc: 'Smart recommendations, document AI, automation', icon: Brain },
  { value: 'scaling_platform', label: 'Scaling — need a complete platform', desc: 'Multi-outlet, multi-brand, structured growth', icon: Rocket },
  { value: 'compliance_focus', label: 'Track compliance & governance', desc: 'Regulatory audits, safety logs, policy management', icon: Shield },
];

const COMPLIANCE_OPTIONS = [
  { value: 'food_safety', label: 'Food & Beverage', desc: 'Food safety, hygiene, licensing', icon: Utensils },
  { value: 'healthcare', label: 'Healthcare', desc: 'Patient safety, infection control', icon: HeartPulse },
  { value: 'financial', label: 'Finance & Accounting', desc: 'Financial audits, tax compliance', icon: DollarSign },
  { value: 'environmental', label: 'Environmental & Waste', desc: 'Environmental audits, disposal certs', icon: Leaf },
  { value: 'none', label: 'No — General operations', desc: 'Standard business compliance only', icon: Building },
];

const EMPLOYEE_OPTIONS = [
  { value: '1-3', label: '1–3', desc: 'Solo / micro' },
  { value: '4-10', label: '4–10', desc: 'Small team' },
  { value: '11-50', label: '11–50', desc: 'Growing team' },
  { value: '51-250', label: '51–250', desc: 'Mid-size' },
  { value: '250+', label: '250+', desc: 'Enterprise' },
];

const OUTLET_OPTIONS = [
  { value: '1', label: '1', desc: 'Single location' },
  { value: '2-5', label: '2–5', desc: 'Multi-outlet' },
  { value: '6-20', label: '6–20', desc: 'Regional' },
  { value: '20+', label: '20+', desc: 'National / Global' },
];

const PACK_ICONS = {
  fnb: Store, recycling: Leaf, retail: ShoppingBag, technology: Cpu,
  events: PartyPopper, healthcare: HeartPulse, education: GraduationCap,
  logistics: Truck, facilities: Building2,
};

function OptionCard({ option, selected, onClick, color }) {
  const Icon = option.icon;
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`relative text-left rounded-2xl border p-4 transition-all duration-200 ${
        selected ? 'border-white/25 bg-white/[0.07]' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]'
      }`}
      style={selected ? { boxShadow: `0 0 0 1px ${color || '#3B82F6'}40` } : undefined}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: color || '#3B82F6' }}>
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      {Icon && (
        <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${color || '#3B82F6'}18` }}>
          <Icon className="w-4 h-4" style={{ color: color || '#3B82F6' }} />
        </div>
      )}
      <h3 className="font-display font-bold text-white text-sm mb-0.5">{option.label}</h3>
      {option.desc && <p className="text-slate-500 text-[11px] leading-relaxed">{option.desc}</p>}
    </button>
  );
}

export default function FindMySolutionWizard({ update, onComplete }) {
  const [stage, setStage] = useState(0);
  const [answers, setAnswers] = useState({
    intent: null,
    regulationType: null,
    packKey: null,
    employeeCount: null,
    outletCount: null,
  });
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isRegulated = answers.regulationType && answers.regulationType !== 'none';
  const updateAnswer = (patch) => setAnswers(prev => ({ ...prev, ...patch }));

  const canAdvance = () => {
    if (stage === 0) return !!answers.intent;
    if (stage === 1) return !!answers.regulationType;
    if (stage === 2) return !!answers.packKey;
    if (stage === 3) return !!answers.employeeCount && !!answers.outletCount;
    return false;
  };

  const generatePrescription = async () => {
    setLoading(true);
    setError(null);
    try {
      const selectedPack = INDUSTRY_PACKS[answers.packKey];
      const packsData = Object.values(INDUSTRY_PACKS).map(p => ({ key: p.key, name: p.name, industry: p.industry, modules: p.modules }));
      const plansData = Object.values(SUBSCRIPTION_PLANS).map(p => ({ key: p.key, name: p.name, price_sgd: p.price_sgd, max_employees: p.max_employees, allowed_modules: p.allowed_modules }));
      const modulesData = Object.values(MODULES).map(m => ({ key: m.key, name: m.name, description: m.description }));

      const prompt = `You are the OrbitanOS Solution Architect. Based on the user's diagnostic answers, prescribe the optimal OrbitanOS configuration.

USER ANSWERS:
- Primary goal: ${answers.intent}
- Regulated industry: ${isRegulated ? `Yes — ${answers.regulationType}` : 'No'}
- Industry pack: ${answers.packKey} (${selectedPack?.name})
- Employee count: ${answers.employeeCount}
- Outlet count: ${answers.outletCount}

AVAILABLE INDUSTRY PACKS:
${JSON.stringify(packsData)}

AVAILABLE SUBSCRIPTION PLANS:
${JSON.stringify(plansData)}

AVAILABLE MODULES:
${JSON.stringify(modulesData)}

PRESCRIPTION RULES:
1. pack_key MUST be "${answers.packKey}"
2. plan_key must support the employee count (max_employees >= count or null for unlimited). For 250+ employees, use orbitan_enterprise. For 51-250, use orbitan_business. For 11-50, use orbitan_growth. For 1-10, use orbitan_starter or orbitan_free.
3. If the industry is regulated (food_safety, healthcare, financial, environmental), the "compliance" module MUST be in recommended_modules
4. recommended_modules must be a subset of the pack's modules AND allowed by the plan's allowed_modules (or "all")
5. For regulated industries, set governance_domain (e.g., fnb_standard_ops, healthcare_standard_ops, recycling_standard_ops, retail_standard_ops, logistics_standard_ops)
6. Provide a clear, business-friendly rationale explaining WHY this plan and module combination was chosen
7. List relevant compliance_templates for the industry and regulation type
8. estimated_monthly_cost_sgd = the plan's price_sgd (0 for free, null for enterprise)
9. summary should be a single sentence (max 120 chars) describing the prescription`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: 'claude_sonnet_4_6',
        response_json_schema: {
          type: 'object',
          properties: {
            pack_key: { type: 'string' },
            industry: { type: 'string' },
            plan_key: { type: 'string' },
            recommended_modules: { type: 'array', items: { type: 'string' } },
            compliance_templates: { type: 'array', items: { type: 'string' } },
            governance_domain: { type: 'string' },
            is_regulated: { type: 'boolean' },
            rationale: { type: 'string' },
            summary: { type: 'string' },
            estimated_monthly_cost_sgd: { type: 'number' },
          },
          required: ['pack_key', 'plan_key', 'recommended_modules', 'rationale', 'summary'],
        },
      });

      const validPackKey = INDUSTRY_PACKS[res.pack_key] ? res.pack_key : answers.packKey;
      const validPlanKey = SUBSCRIPTION_PLANS[res.plan_key] ? res.plan_key : 'orbitan_growth';
      const validModules = Array.isArray(res.recommended_modules)
        ? res.recommended_modules.filter(m => MODULES[m])
        : selectedPack?.modules || [];

      setPrescription({
        ...res,
        pack_key: validPackKey,
        plan_key: validPlanKey,
        recommended_modules: validModules,
      });
    } catch (e) {
      setError(e?.message || 'Failed to generate prescription.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (stage === 3) {
      setStage(4);
      generatePrescription();
    } else {
      setStage(s => Math.min(s + 1, STAGES.length - 1));
    }
  };

  const handleBack = () => {
    if (stage === 0) return;
    setStage(s => Math.max(s - 1, 0));
  };

  const handleAccept = () => {
    if (!prescription) return;
    update({
      packKey: prescription.pack_key,
      industry: prescription.industry || INDUSTRY_PACKS[prescription.pack_key]?.industry,
      planKey: prescription.plan_key,
      selectedModules: prescription.recommended_modules || [],
      prescription: {
        rationale: prescription.rationale,
        summary: prescription.summary,
        compliance_templates: prescription.compliance_templates || [],
        governance_domain: prescription.governance_domain,
        is_regulated: prescription.is_regulated,
        estimated_monthly_cost_sgd: prescription.estimated_monthly_cost_sgd,
      },
    });
    onComplete();
  };

  const handleAdjustManually = () => {
    onComplete();
  };

  // ── Prescription stage ──
  if (stage === 4) {
    return (
      <PrescriptionCard
        loading={loading}
        error={error}
        prescription={prescription}
        onRetry={generatePrescription}
        onAccept={handleAccept}
        onAdjustManually={handleAdjustManually}
      />
    );
  }

  const stageConfig = [
    {
      title: 'What brings you to Orbitan today?',
      subtitle: "We'll prescribe the right configuration based on your needs.",
      options: INTENT_OPTIONS,
      selectedValue: answers.intent,
      onSelect: v => updateAnswer({ intent: v }),
      color: '#3B82F6',
    },
    {
      title: 'Do you operate in a regulated industry?',
      subtitle: 'Compliance requirements shape your governance domain and module recommendations.',
      options: COMPLIANCE_OPTIONS,
      selectedValue: answers.regulationType,
      onSelect: v => updateAnswer({ regulationType: v }),
      color: '#DC2626',
    },
    {
      title: 'What industry do you operate in?',
      subtitle: 'Each industry ships with a ready-to-run blueprint — modules, workflows and compliance.',
      options: Object.values(INDUSTRY_PACKS).map(p => ({
        value: p.key,
        label: p.name,
        desc: p.description,
        icon: PACK_ICONS[p.key] || Building2,
      })),
      selectedValue: answers.packKey,
      onSelect: v => updateAnswer({ packKey: v }),
      color: INDUSTRY_PACKS[answers.packKey]?.color_hex || '#3B82F6',
    },
    {
      title: 'How large is your organisation?',
      subtitle: 'Scale determines your subscription tier and module entitlements.',
      options: null,
      selectedValue: null,
      onSelect: null,
      color: '#10B981',
    },
  ];

  const current = stageConfig[stage];

  return (
    <div>
      {/* Stage indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STAGES.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className={`w-2 h-2 rounded-full transition-colors ${i === stage ? 'bg-blue-500' : i < stage ? 'bg-emerald-500' : 'bg-white/10'}`} />
            {i < STAGES.length - 1 && <div className={`h-px w-6 ${i < stage ? 'bg-emerald-500/40' : 'bg-white/10'}`} />}
          </React.Fragment>
        ))}
        <span className="text-[10px] text-slate-500 ml-2">{STAGES[stage].label}</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#D4AF37] font-bold">Find My Solution</span>
        </div>
        <h2 className="text-2xl font-display font-bold text-white mb-1.5">{current.title}</h2>
        <p className="text-slate-400 text-sm">{current.subtitle}</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25 }}
        >
          {stage < 3 && current.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {current.options.map(opt => (
                <OptionCard
                  key={opt.value}
                  option={opt}
                  selected={current.selectedValue === opt.value}
                  onClick={() => current.onSelect(opt.value)}
                  color={current.color}
                />
              ))}
            </div>
          )}

          {stage === 3 && (
            <div className="space-y-6">
              <div>
                <p className="text-xs tracking-[0.15em] uppercase text-slate-500 font-bold mb-3">Employees</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {EMPLOYEE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateAnswer({ employeeCount: opt.value })}
                      className={`text-center rounded-xl border p-3 transition-all ${
                        answers.employeeCount === opt.value
                          ? 'border-emerald-500/40 bg-emerald-500/[0.08]'
                          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                      }`}
                    >
                      <p className="text-lg font-display font-bold text-white">{opt.label}</p>
                      <p className="text-[10px] text-slate-500">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs tracking-[0.15em] uppercase text-slate-500 font-bold mb-3">Locations</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {OUTLET_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateAnswer({ outletCount: opt.value })}
                      className={`text-center rounded-xl border p-3 transition-all ${
                        answers.outletCount === opt.value
                          ? 'border-emerald-500/40 bg-emerald-500/[0.08]'
                          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                      }`}
                    >
                      <p className="text-lg font-display font-bold text-white">{opt.label}</p>
                      <p className="text-[10px] text-slate-500">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Internal navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={handleBack}
          disabled={stage === 0}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!canAdvance()}
          className="flex items-center gap-2 h-10 px-6 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}