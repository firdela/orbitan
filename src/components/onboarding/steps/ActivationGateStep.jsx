import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Tag, MapPin, Package, ShieldCheck, Sparkles } from 'lucide-react';
import { SUBSCRIPTION_PLANS, INDUSTRY_PACKS, MODULES } from '@/lib/orbitan-config';

// Final "Regulate" gate — formal summary + explicit acceptance.
export default function ActivationGateStep({ data, update }) {
  const pack = INDUSTRY_PACKS[data.packKey];
  const plan = SUBSCRIPTION_PLANS[data.planKey];
  const t = data.tenant || {};
  const s = data.structure || {};
  const modules = data.selectedModules || [];

  const summaryRow = (icon, label, value, color) =>
  <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
        {React.createElement(icon, { className: 'w-3.5 h-3.5', style: { color } })}
      </div>
      <span className="text-slate-500 text-xs w-24 flex-shrink-0">{label}</span>
      <span className="text-white text-sm font-medium truncate">{value || '—'}</span>
    </div>;


  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-white mb-1.5">Review & activate</h2>
        <p className="text-slate-400 text-sm">
          Confirm your workspace blueprint. On activation, OrbitanOS provisions your full hierarchy and pre-loads your industry standards.
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 mb-5">
        {summaryRow(Sparkles, 'Industry', pack?.name, pack?.color_hex || '#2563EB')}
        {summaryRow(Building2, 'Company', s.company_name || t.name, '#2563EB')}
        {summaryRow(Tag, 'Brand', s.brand_name || s.company_name || t.name, '#7C3AED')}
        {summaryRow(MapPin, 'Outlet', s.outlet_name || 'Primary Outlet', '#F97316')}
        {summaryRow(Package, 'Plan', plan?.price_label ? `${plan.name} · ${plan.price_label}` : plan?.name, plan?.color_hex || '#2563EB')}
      </div>

      {/* Modules */}
      <div className="mb-5">
        <p className="text-[11px] tracking-[0.15em] uppercase text-slate-500 font-bold mb-2">
          {modules.length} Modules Activating
        </p>
        <div className="flex flex-wrap gap-1.5">
          {modules.map((m) =>
          <span key={m} className="text-[10px] px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-300">
              {(MODULES[m]?.name || m).replace(' Module', '')}
            </span>
          )}
        </div>
      </div>

      {/* What we provision */}
      <div className="rounded-xl border border-blue-500/15 bg-blue-500/[0.04] p-4 mb-5">
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-white font-semibold">We'll provision automatically:</span> your Company → Brand → Outlet hierarchy,
          an Orbitan Wallet with your plan credits, and your industry's compliance checklists and setup tasks — all on an
          auditable, exit-ready trail.
        </p>
      </div>

      {/* Activation Gate */}
      <motion.button
        onClick={() => update({ acceptedStandards: !data.acceptedStandards })}
        className={`w-full flex items-center gap-3 text-left rounded-xl border p-4 transition-all duration-200 ${
        data.acceptedStandards ?
        'border-emerald-500/40 bg-emerald-500/[0.08]' :
        'border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.04]'}`
        }>

        <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
        data.acceptedStandards ? 'bg-emerald-500 border-emerald-500' : 'border-white/30'}`
        }>
          {data.acceptedStandards && <ShieldCheck className="w-3.5 h-3.5 text-white" />}
        </div>
        <span className="text-sm text-slate-300">
          I accept the <span className="text-white font-semibold">Orbitan Operating Standards</span> and authorise OrbitanOS
          to govern this workspace under the Shield™ framework.
        </span>
      </motion.button>
    </div>);

}