import React from 'react';
import { motion } from 'framer-motion';
import {
  Users, Calendar, CheckSquare, Package, ShoppingCart, FileText,
  BarChart2, Shield, Link as LinkIcon, BookOpen, Archive, UserCheck,
  Check, Lock } from
'lucide-react';
import { SUBSCRIPTION_PLANS, MODULES } from '@/lib/orbitan-config';

const PLAN_ORDER = ['orbitan_starter', 'orbitan_growth', 'orbitan_business', 'orbitan_enterprise'];

const MODULE_ICONS = {
  Users, Calendar, CheckSquare, Package, ShoppingCart, FileText,
  BarChart2, Shield, Link: LinkIcon, BookOpen, Archive, UserCheck
};

function planAllows(planKey, moduleKey) {
  const plan = SUBSCRIPTION_PLANS[planKey];
  if (!plan) return false;
  if (plan.allowed_modules.includes('all')) return true;
  return plan.allowed_modules.includes(moduleKey);
}

export default function PlanStep({ data, update }) {
  const selectPlan = (planKey) => {
    // Prune any selected modules the new plan doesn't allow
    const pruned = (data.selectedModules || []).filter((m) => planAllows(planKey, m));
    update({ planKey, selectedModules: pruned });
  };

  const toggleModule = (moduleKey) => {
    if (!planAllows(data.planKey, moduleKey)) return;
    const current = data.selectedModules || [];
    const next = current.includes(moduleKey) ?
    current.filter((m) => m !== moduleKey) :
    [...current, moduleKey];
    update({ selectedModules: next });
  };

  const modules = Object.values(MODULES);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-white mb-1.5">Pick a plan & activate modules</h2>
        <p className="text-slate-400 text-sm">
          Your plan sets the ceiling. Modules locked by your plan can be unlocked any time with an upgrade.
        </p>
      </div>

      {/* ── Plans ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {PLAN_ORDER.map((key) => {
          const plan = SUBSCRIPTION_PLANS[key];
          const isSelected = data.planKey === key;
          const isEnterprise = key === 'orbitan_enterprise';
          return (
            <button
              key={key}
              onClick={() => selectPlan(key)}
              className={`relative text-left rounded-xl border p-3.5 transition-all duration-200 ${
              isSelected ?
              'border-white/25 bg-white/[0.07]' :
              'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'}`
              }>

              {isSelected &&
              <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: isEnterprise ? plan.accent_hex : plan.color_hex }}>
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              }
              <span className="text-[9px] tracking-[0.12em] uppercase font-bold"
              style={{ color: isEnterprise ? plan.accent_hex : plan.color_hex }}>
                {plan.name.replace('Orbitan ', '')}
              </span>
              <p className="text-lg font-display font-bold text-white mt-1">{plan.price_label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{plan.suitable_for}</p>
            </button>);

        })}
      </div>

      {/* ── Modules ── */}
      <p className="text-xs tracking-[0.15em] uppercase text-slate-500 font-bold mb-3">Modules</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {modules.map((mod) => {
          const Icon = MODULE_ICONS[mod.icon] || CheckSquare;
          const allowed = planAllows(data.planKey, mod.key);
          const active = (data.selectedModules || []).includes(mod.key) && allowed;
          return (
            <motion.button
              key={mod.key}
              layout
              onClick={() => toggleModule(mod.key)}
              disabled={!allowed}
              className={`relative flex items-start gap-3 text-left rounded-xl border p-3 transition-all duration-200 ${
              !allowed ?
              'border-white/[0.04] bg-white/[0.01] cursor-not-allowed opacity-50' :
              active ?
              'border-blue-500/40 bg-blue-500/[0.08]' :
              'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'}`
              }>

              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              active ? 'bg-blue-500/20' : 'bg-white/[0.04]'}`
              }>
                <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-slate-500'}`} />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">{mod.name.replace(' Module', '')}</p>
                <p className="text-slate-500 text-[10px] leading-tight">{mod.description}</p>
              </div>
              {!allowed &&
              <Lock className="w-3 h-3 text-slate-600 absolute top-2.5 right-2.5" />
              }
              {active &&
              <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              }
            </motion.button>);

        })}
      </div>
    </div>);

}