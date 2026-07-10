import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Plug, Zap, ArrowRight } from 'lucide-react';

const NEXUS_PILLARS = [
  {
    name: 'Think',
    icon: Brain,
    color: '#7C3AED',
    description: 'RAG, Agentic AI, AIReceipts, and intelligent recommendations powered by a shared knowledge layer.',
    features: ['Knowledge Search', 'SOP & Policy Search', 'Agentic Workflows', 'Smart Recommendations'],
  },
  {
    name: 'Connect',
    icon: Plug,
    color: '#06B6D4',
    description: 'API gateway, OAuth connectors, MCP server, and SDKs — integrate everything into one operating system.',
    features: ['Xero & QuickBooks', 'Google Workspace', 'Slack & WhatsApp', 'Stripe & Shopify'],
  },
  {
    name: 'Act',
    icon: Zap,
    color: '#F97316',
    description: 'MCP tools, workflow automations, and scheduled tasks that turn intelligence into real-world action.',
    features: ['Automated Workflows', 'Procurement Agents', 'Inventory Agents', 'Scheduled Tasks'],
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
};

export default function NexusSection() {
  return (
    <section id="nexus" className="py-20 md:py-28 px-6 bg-marketing-surface-dark">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div {...fadeUp} className="text-center mb-14">
          <div className="w-14 h-14 rounded-2xl bg-marketing-blue/10 flex items-center justify-center mx-auto mb-6">
            <Brain className="w-7 h-7 text-marketing-blue" />
          </div>
          <p className="text-xs tracking-[0.2em] uppercase text-marketing-gold font-bold mb-3">
            Powered by Orbit Nexus
          </p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
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
                className="relative group bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] transition-all duration-300"
              >
                {/* Top accent line */}
                <div
                  className="absolute top-0 left-6 right-6 h-px opacity-30 group-hover:opacity-60 transition-opacity"
                  style={{ background: `linear-gradient(90deg, transparent, ${pillar.color}, transparent)` }}
                />

                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: `${pillar.color}15` }}
                >
                  <Icon className="w-6 h-6" style={{ color: pillar.color }} />
                </div>

                <h3 className="font-display font-bold text-white text-lg mb-2">{pillar.name}</h3>
                <p className="text-slate-300 text-xs leading-relaxed mb-5">{pillar.description}</p>

                <ul className="space-y-2">
                  {pillar.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-xs text-slate-400">
                      <span
                        className="w-1 h-1 rounded-full flex-shrink-0"
                        style={{ backgroundColor: pillar.color }}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* Nexus capabilities bar */}
        <motion.div
          {...fadeUp}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          {['AI Gateway', 'RAG Engine', 'Agent Engine', 'AIReceipts', 'MCP Server', 'Automation Engine'].map((cap) => (
            <span
              key={cap}
              className="px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200 font-medium"
            >
              {cap}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}