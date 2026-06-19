import React from 'react';
import { motion } from 'framer-motion';
import {
  Store, Leaf, ShoppingBag, Cpu, PartyPopper,
  HeartPulse, GraduationCap, Truck, Building2, Check } from
'lucide-react';
import { INDUSTRY_PACKS } from '@/lib/orbitan-config';

const PACK_ICONS = {
  fnb: Store,
  recycling: Leaf,
  retail: ShoppingBag,
  technology: Cpu,
  events: PartyPopper,
  healthcare: HeartPulse,
  education: GraduationCap,
  logistics: Truck,
  facilities: Building2
};

export default function IndustryStep({ data, update }) {
  const packs = Object.values(INDUSTRY_PACKS);

  const select = (pack) => {
    update({
      packKey: pack.key,
      industry: pack.industry,
      // Pre-fill recommended modules from the pack blueprint
      selectedModules: pack.modules
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-white mb-1.5">Choose your industry</h2>
        <p className="text-slate-400 text-sm">
          OrbitanOS ships a ready-to-run blueprint for each industry — modules, workflows and compliance, pre-configured.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {packs.map((pack, i) => {
          const Icon = PACK_ICONS[pack.key] || Building2;
          const isSelected = data.packKey === pack.key;
          return (
            <motion.button
              key={pack.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              onClick={() => select(pack)}
              className={`relative text-left rounded-2xl border p-4 transition-all duration-200 ${
              isSelected ?
              'border-white/20 bg-white/[0.06]' :
              'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]'}`
              }
              style={isSelected ? { boxShadow: `0 0 0 1px ${pack.color_hex}40` } : undefined}>

              {isSelected &&
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: pack.color_hex }}>
                  <Check className="w-3 h-3 text-white" />
                </div>
              }
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: `${pack.color_hex}18` }}>
                <Icon className="w-4.5 h-4.5" style={{ color: pack.color_hex }} />
              </div>
              <h3 className="font-display font-bold text-white text-sm mb-0.5">{pack.name}</h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">{pack.description}</p>
            </motion.button>);

        })}
      </div>
    </div>);

}