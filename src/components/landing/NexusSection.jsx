import React from 'react';
import { motion } from 'framer-motion';
import { Plug, Zap, Brain } from 'lucide-react';
import { LOGO_ASSETS } from '@/lib/orbitan-identity';

const NEXUS_PILLARS = [
{
  name: 'Think',
  icon: Brain,
  color: '#7C3AED',
  description: 'Ground AI in your business context. RAG retrieves your SOPs, policies, and history so every recommendation is specific — not generic. Agent Engine executes autonomously within governance gates.',
  features: ['RAG Knowledge Search', 'Agentic AI Workflows', 'AIReceipts OCR', 'Smart Recommendations']
},
{
  name: 'Connect',
  icon: Plug,
  color: '#06B6D4',
  description: 'A secure, high-performance integration hub. OAuth connectors, MCP server, and SDKs unify your existing tools — Xero, Stripe, Slack — into one operating system without data silos.',
  features: ['Xero & QuickBooks', 'Stripe & Shopify', 'Slack & WhatsApp', 'Google Workspace']
},
{
  name: 'Act',
  icon: Zap,
  color: '#F97316',
  description: 'The bridge between intelligence and execution. Automation Engine triggers workflows based on AI decisions — low stock creates purchase orders, schedule gaps trigger shift calls.',
  features: ['Automated Workflows', 'Procurement Agents', 'Inventory Replenishment', 'Scheduled Tasks']
}];


const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 }
};

// Breathing animation — Apple-vibe organic pulse
const breathingLogo = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

const breathingHalo = {
  animate: {
    scale: [1, 1.3, 1],
    opacity: [0.15, 0.35, 0.15],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

export default function NexusSection() {
  return (
    <section id="nexus" className="py-20 md:py-28 px-6 bg-marketing-surface-dark">
      <div className="max-w-5xl mx-auto">
        {/* Header with breathing logo */}
        <motion.div {...fadeUp} className="text-center mb-14">
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            {/* Glow halo — synchronized breathing */}
            <motion.div
              variants={breathingHalo}
              animate="animate"
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, rgba(59,130,246,0.15) 50%, transparent 70%)',
                willChange: 'transform, opacity'
              }} />
            
            {/* Logo — subtle scale pulse */}
            <motion.img
              src={LOGO_ASSETS.nexusLogo}
              alt="Orbit Nexus"
              variants={breathingLogo}
              animate="animate"
              className="relative w-16 h-16 object-contain"
              style={{ willChange: 'transform', filter: 'drop-shadow(0 0 12px rgba(124,58,237,0.3))' }}
            />
            
          </div>
          <p className="text-xs tracking-[0.2em] uppercase text-marketing-gold font-bold mb-3">
            Powered by Orbit Nexus
          </p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-white">
            Think. Connect. Act.
          </h2>
          <p className="text-slate-300 max-w-lg mx-auto text-sm leading-relaxed">
            Orbit Nexus is the intelligence platform that powers the entire Orbit ecosystem.
            It can also be offered as a standalone subscription product.
          </p>
        </motion.div>

        {/* Three pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {NEXUS_PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative group bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] transition-all duration-300">
                
                {/* Top accent line */}
                <div
                  className="absolute top-0 left-6 right-6 h-px opacity-30 group-hover:opacity-60 transition-opacity"
                  style={{ background: `linear-gradient(90deg, transparent, ${pillar.color}, transparent)` }} />
                

                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: `${pillar.color}15` }}>
                  
                  {Icon && <Icon className="w-6 h-6" style={{ color: pillar.color }} />}
                </div>

                <h3 className="font-display font-bold text-white text-lg mb-2">{pillar.name}</h3>
                <p className="text-slate-300 text-xs leading-relaxed mb-5">{pillar.description}</p>

                <ul className="space-y-2">
                  {pillar.features.map((feature) =>
                  <li key={feature} className="flex items-center gap-2 text-xs text-slate-400">
                      <span
                      className="w-1 h-1 rounded-full flex-shrink-0"
                      style={{ backgroundColor: pillar.color }} />
                    
                      {feature}
                    </li>
                  )}
                </ul>
              </motion.div>);

          })}
        </div>

        {/* Nexus capabilities bar */}
        <motion.div
          {...fadeUp}
          className="mt-10 flex flex-wrap items-center justify-center gap-3">
          
          {['AI Gateway', 'RAG Engine', 'Agent Engine', 'AIReceipts', 'MCP Server', 'Automation Engine'].map((cap) =>
          <span
            key={cap}
            className="px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200 font-medium">
            
              {cap}
            </span>
          )}
        </motion.div>
      </div>
    </section>);

}