import React from 'react';
import { motion } from 'framer-motion';
import {
  Loader2, Sparkles, Check, AlertTriangle,
  Shield, Package, Brain, DollarSign, RefreshCw,
  Users, Calendar, CheckSquare, ShoppingCart, FileText,
  BarChart2, BookOpen, Archive, UserCheck, Link as LinkIcon,
} from 'lucide-react';
import { INDUSTRY_PACKS, SUBSCRIPTION_PLANS, MODULES } from '@/lib/orbitan-config';

const MODULE_ICONS = {
  workforce: Users, scheduling: Calendar, task: CheckSquare,
  inventory: Package, procurement: ShoppingCart, sales_invoice: FileText,
  reporting: BarChart2, compliance: Shield, finance_integration: LinkIcon,
  training: BookOpen, knowledge: Archive, customer_management: UserCheck,
};

export default function PrescriptionCard({
  loading, error, prescription, onRetry, onAccept, onAdjustManually,
}) {
  // ── Loading state ──
  if (loading) {
    return (
      <div className="text-center py-12">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-6"
        >
          <Brain className="w-8 h-8 text-[#D4AF37]" />
        </motion.div>
        <h2 className="text-xl font-display font-bold text-white mb-2">Analysing your needs…</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
          Our AI architect is prescribing the optimal OrbitanOS configuration based on your answers.
        </p>
        <Loader2 className="w-5 h-5 animate-spin text-blue-400 mx-auto" />
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-xl font-display font-bold text-white mb-2">Couldn't generate prescription</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">{error}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onRetry}
            className="flex items-center gap-2 h-10 px-5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-medium w-full sm:w-auto justify-center"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
          <button
            onClick={onAdjustManually}
            className="flex items-center gap-2 h-10 px-5 rounded-xl border border-white/15 bg-white/[0.04] text-white text-sm font-medium hover:bg-white/[0.08] w-full sm:w-auto justify-center"
          >
            Choose Manually
          </button>
        </div>
      </div>
    );
  }

  if (!prescription) return null;

  const pack = INDUSTRY_PACKS[prescription.pack_key];
  const plan = SUBSCRIPTION_PLANS[prescription.plan_key];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#D4AF37] font-bold">AI Prescription</span>
        </div>
        <h2 className="text-2xl font-display font-bold text-white mb-2">Your recommended configuration</h2>
        <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">{prescription.summary}</p>
      </div>

      {/* Prescription card */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 mb-5">
        {/* Pack + Plan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-[10px] tracking-[0.15em] uppercase text-slate-500 font-bold mb-2">Industry Pack</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${pack?.color_hex || '#3B82F6'}18` }}>
                <Package className="w-4 h-4" style={{ color: pack?.color_hex || '#3B82F6' }} />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{pack?.name || prescription.pack_key}</p>
                <p className="text-[10px] text-slate-500">{prescription.industry}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-[10px] tracking-[0.15em] uppercase text-slate-500 font-bold mb-2">Subscription Plan</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${plan?.color_hex || '#3B82F6'}18` }}>
                <DollarSign className="w-4 h-4" style={{ color: plan?.color_hex || '#3B82F6' }} />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{plan?.name || prescription.plan_key}</p>
                <p className="text-[10px] text-slate-500">{plan?.price_label || 'Custom'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modules */}
        <div className="mb-5">
          <p className="text-[10px] tracking-[0.15em] uppercase text-slate-500 font-bold mb-3">
            Recommended Modules ({prescription.recommended_modules?.length || 0})
          </p>
          <div className="flex flex-wrap gap-2">
            {prescription.recommended_modules?.map(modKey => {
              const mod = MODULES[modKey];
              if (!mod) return null;
              const Icon = MODULE_ICONS[modKey] || CheckSquare;
              return (
                <span key={modKey} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                  <Icon className="w-3 h-3 text-slate-400" />
                  <span className="text-[11px] text-slate-300">{mod.name.replace(' Module', '')}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Compliance */}
        {prescription.is_regulated && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-3.5 h-3.5 text-red-400" />
              <p className="text-[10px] tracking-[0.15em] uppercase text-red-400 font-bold">Compliance Activated</p>
            </div>
            {prescription.compliance_templates?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {prescription.compliance_templates.map((t, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-red-500/[0.06] border border-red-500/[0.15] text-[10px] text-red-300">
                    {t.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
            {prescription.governance_domain && (
              <p className="text-[10px] text-slate-500 mt-2">
                Governance domain: <code className="text-slate-400">{prescription.governance_domain}</code>
              </p>
            )}
          </div>
        )}

        {/* Rationale */}
        <div className="rounded-xl bg-[#D4AF37]/[0.04] border border-[#D4AF37]/[0.12] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-3.5 h-3.5 text-[#D4AF37]" />
            <p className="text-[10px] tracking-[0.15em] uppercase text-[#D4AF37] font-bold">AI Rationale</p>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">{prescription.rationale}</p>
        </div>
      </div>

      {/* Cost summary */}
      {prescription.estimated_monthly_cost_sgd != null && (
        <div className="text-center mb-6">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Estimated Monthly Cost</p>
          <p className="text-2xl font-display font-bold text-white">
            {prescription.estimated_monthly_cost_sgd === 0
              ? 'Free'
              : `S$${prescription.estimated_monthly_cost_sgd}/mo`}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onAccept}
          className="flex items-center gap-2 h-11 px-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold w-full sm:w-auto justify-center transition-colors"
        >
          <Check className="w-4 h-4" />
          Accept & Continue
        </button>
        <button
          onClick={onAdjustManually}
          className="flex items-center gap-2 h-11 px-6 rounded-xl border border-white/15 bg-white/[0.04] text-white text-sm font-medium hover:bg-white/[0.08] w-full sm:w-auto justify-center transition-colors"
        >
          Adjust Manually
        </button>
      </div>
    </motion.div>
  );
}