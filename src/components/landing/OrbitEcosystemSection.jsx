import React from 'react';
import { motion } from 'framer-motion';
import {
  Layers, BrainCircuit, Shield, Plug, Wallet, Blocks } from 'lucide-react';

const ECOSYSTEM_SERVICES = [
  {
    name: 'Orbit Core',
    icon: Layers,
    color: '#3B82F6',
    tagline: 'Platform Foundation',
    description: 'Authentication, multi-tenancy, permissions, tenant management, and organisational hierarchy.',
    capabilities: ['Identity & Access', 'Tenant Management', 'Audit Logs', 'Notifications'],
  },
  {
    name: 'Orbit Nexus',
    icon: BrainCircuit,
    color: '#7C3AED',
    tagline: 'Intelligence Platform',
    description: 'AI gateway, RAG engine, agentic workflows, AIReceipts, and the integration hub.',
    capabilities: ['RAG & Knowledge', 'Agentic AI', 'AIReceipts OCR', 'Integration Hub'],
  },
  {
    name: 'Orbit Shield',
    icon: Shield,
    color: '#DC2626',
    tagline: 'Security & Governance',
    description: 'Policy-as-code governance, compliance gates, immutable audit trails, and override management.',
    capabilities: ['Policy Enforcement', 'Compliance Gates', 'Audit Trail', 'Override Registry'],
  },
  {
    name: 'Orbit Connect',
    icon: Plug,
    color: '#06B6D4',
    tagline: 'Integrations & APIs',
    description: 'OAuth connectors, API gateway, MCP server, and SDK access for external systems.',
    capabilities: ['Xero & QuickBooks', 'Google Workspace', 'Slack & WhatsApp', 'Stripe & Shopify'],
  },
  {
    name: 'Orbit Wallet',
    icon: Wallet,
    color: '#D4AF37',
    tagline: 'Payments & Credits',
    description: 'Orbitan Credits, reward points, cashback, and subscription billing in one unified ledger.',
    capabilities: ['AI Credit Metering', 'Reward Points', 'Cashback Engine', 'Subscription Billing'],
  },
  {
    name: 'Orbit Builder',
    icon: Blocks,
    color: '#10B981',
    tagline: 'Workspace Builder',
    description: 'Registry-driven manifest engine, module palette, and dynamic navigation hydration.',
    capabilities: ['Manifest Engine', 'Module Palette', 'Dynamic Navigation', 'Industry Blueprints'],
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
};

export default function OrbitEcosystemSection() {
  return (
    <section id="ecosystem" className="py-20 md:py-28 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div {...fadeUp} className="text-center mb-14">
          <p className="text-xs tracking-[0.2em] uppercase text-marketing-gold font-bold mb-3">
            Platform Architecture
          </p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            One Platform. Six Engines.
          </h2>
          <p className="text-slate-300 max-w-xl mx-auto text-sm leading-relaxed">
            OrbitanOS is powered by a unified ecosystem of shared platform services.
            Each engine operates independently — yet together, they form a single, cohesive operating system.
          </p>
        </motion.div>

        {/* OrbitanOS banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative mb-8 rounded-2xl border border-marketing-blue/20 bg-gradient-to-r from-marketing-blue/10 to-transparent p-6 text-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.06)_0%,transparent_70%)]" />
          <div className="relative z-10">
            <span className="text-xs tracking-[0.15em] uppercase text-marketing-blue font-bold">
              The Flagship Product
            </span>
            <h3 className="text-xl md:text-2xl font-display font-bold text-white mt-1">
              OrbitanOS — The Workforce Operating System
            </h3>
            <p className="text-slate-300 text-xs mt-1.5 max-w-md mx-auto">
              Built on Orbit Core. Powered by Orbit Nexus. Protected by Orbit Shield.
            </p>
          </div>
        </motion.div>

        {/* Service cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ECOSYSTEM_SERVICES.map((service, i) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-300"
              >
                {/* Hover glow */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${service.color}10, transparent 70%)` }}
                />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${service.color}18` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: service.color }} />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-white text-sm">{service.name}</h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{service.tagline}</p>
                    </div>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed mb-4">{service.description}</p>

                  <div className="flex flex-wrap gap-1.5">
                    {service.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-400 font-medium"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}