import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, ArrowRight, Check, Loader2, Sparkles,
  AlertTriangle, Rocket } from
'lucide-react';
import OrbitanWordmark from '@/components/brand/OrbitanWordmark';
import IndustryStep from '@/components/onboarding/steps/IndustryStep';
import StructureStep from '@/components/onboarding/steps/StructureStep';
import PlanStep from '@/components/onboarding/steps/PlanStep';
import ActivationGateStep from '@/components/onboarding/steps/ActivationGateStep';

const STEPS = [
{ key: 'industry', label: 'Industry' },
{ key: 'structure', label: 'Organisation' },
{ key: 'plan', label: 'Plan & Modules' },
{ key: 'activate', label: 'Activate' }];


export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const [data, setData] = useState({
    packKey: null,
    industry: null,
    tenant: { name: '', legal_name: '', contact_email: '' },
    structure: { company_name: '', brand_name: '', outlet_name: '', outlet_address: '', is_virtual: false },
    planKey: 'orbitan_growth',
    selectedModules: [],
    acceptedStandards: false
  });

  const update = (patch) => setData((prev) => ({ ...prev, ...patch }));

  const canAdvance = () => {
    if (step === 0) return !!data.packKey;
    if (step === 1) return !!(data.tenant.name || '').trim();
    if (step === 2) return !!data.planKey;
    if (step === 3) return !!data.acceptedStandards;
    return true;
  };

  const provision = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('onboardingService', {
        action: 'provision_organisation',
        packKey: data.packKey,
        industry: data.industry,
        tenant: data.tenant,
        structure: data.structure,
        planKey: data.planKey,
        selectedModules: data.selectedModules,
        acceptedStandards: data.acceptedStandards
      });
      const report = res.data?.report;
      if (!report || report.status === 'failed') {
        setError(report?.errors?.[0]?.error || 'Provisioning failed. Please try again.');
      } else {
        setResult(report);
        // Refresh auth so the founder's new tenant binding loads
        await checkUserAuth?.();
      }
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Provisioning failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (step === STEPS.length - 1) {provision();return;}
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // ── Success screen ──
  if (result) {
    return (
      <div className="min-h-screen bg-[#0A0F1A] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center">

          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-6">
            <Rocket className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white mb-2">Workspace provisioned</h1>
          <p className="text-slate-400 text-sm mb-6">
            {data.tenant.name} is live on OrbitanOS. Your hierarchy, wallet and industry blueprint are ready.
          </p>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 mb-6 text-left">
            {result.records_created?.slice(0, 6).map((r, i) =>
            <div key={i} className="flex items-center gap-2 py-1">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="text-slate-300 text-xs">{r.title || r.entity}</span>
              </div>
            )}
            {result.records_created?.length > 6 &&
            <p className="text-slate-600 text-[10px] mt-1.5">+{result.records_created.length - 6} more records created</p>
            }
          </div>
          <Button
            onClick={() => navigate('/company')}
            className="w-full h-11 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl gap-2">

            Enter Workspace <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>);

  }

  const StepComponent = [IndustryStep, StructureStep, PlanStep, ActivationGateStep][step];

  return (
    <div className="min-h-screen bg-[#0A0F1A] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <OrbitanWordmark size="sm" variant="light" showOS={false} />
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
            Business Installation
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="max-w-3xl mx-auto px-6 pt-8">
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) =>
          <React.Fragment key={s.key}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
              i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-[#3B82F6] text-white' : 'bg-white/[0.05] text-slate-500'}`
              }>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${i === step ? 'text-white font-medium' : 'text-slate-500'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 &&
            <div className={`flex-1 h-px ${i < step ? 'bg-emerald-500/40' : 'bg-white/[0.06]'}`} />
            }
            </React.Fragment>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-6 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}>

            <StepComponent data={data} update={update} />
          </motion.div>
        </AnimatePresence>

        {error &&
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-red-300 text-xs">{error}</span>
          </div>
        }
      </div>

      {/* Footer nav */}
      <div className="fixed bottom-0 inset-x-0 border-t border-white/[0.06] bg-[#0A0F1A]/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 h-20 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={step === 0 ? () => navigate('/auth/gateway') : back}
            disabled={submitting}
            className="text-slate-400 hover:text-white gap-2">

            <ArrowLeft className="w-4 h-4" />
            {step === 0 ? 'Back' : 'Previous'}
          </Button>

          <Button
            onClick={next}
            disabled={!canAdvance() || submitting}
            className={`h-11 px-6 rounded-xl gap-2 ${
            step === STEPS.length - 1 ?
            'bg-emerald-500 hover:bg-emerald-600 text-white' :
            'bg-[#3B82F6] hover:bg-[#2563EB] text-white'}`
            }>

            {submitting ?
            <><Loader2 className="w-4 h-4 animate-spin" /> Provisioning…</> :
            step === STEPS.length - 1 ?
            <><Rocket className="w-4 h-4" /> Activate Workspace</> :

            <>Continue <ArrowRight className="w-4 h-4" /></>
            }
          </Button>
        </div>
      </div>
    </div>);

}