import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plug, Zap, Brain, Check, ArrowRight, Sparkles } from 'lucide-react';

const NEXUS_PILLARS = [
  {
    name: 'Think',
    icon: Brain,
    color: '#7C3AED',
    description: 'Ground AI in your business context. RAG retrieves your SOPs, policies, and history so every recommendation is specific — not generic. Agent Engine executes autonomously within governance gates.',
    features: ['RAG Knowledge Search', 'Agentic AI Workflows', 'AIReceipts OCR', 'Smart Recommendations'],
  },
  {
    name: 'Connect',
    icon: Plug,
    color: '#06B6D4',
    description: 'A secure, high-performance integration hub. OAuth connectors, MCP server, and SDKs unify your existing tools — Xero, Stripe, Slack — into one operating system without data silos.',
    features: ['Xero & QuickBooks', 'Stripe & Shopify', 'Slack & WhatsApp', 'Google Workspace'],
  },
  {
    name: 'Act',
    icon: Zap,
    color: '#F97316',
    description: 'The bridge between intelligence and execution. Automation Engine triggers workflows based on AI decisions — low stock creates purchase orders, schedule gaps trigger shift calls.',
    features: ['Automated Workflows', 'Procurement Agents', 'Inventory Replenishment', 'Scheduled Tasks'],
  },
];

const NEXUS_PLANS = [
  {
    name: 'Free',
    price: 'S$0',
    period: '/mo',
    features: ['Basic AI Assistant', 'Limited AI requests', 'Basic AI Search', 'Community support'],
    color: '#64748B',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'S$39',
    period: '/mo',
    features: ['AI Assistant', 'AI Search', 'AIReceipts', 'Document AI', 'Workflow AI', 'Standard support'],
    color: '#7C3AED',
    highlight: true,
  },
  {
    name: 'Team',
    price: 'S$149',
    period: '/mo',
    features: ['Everything in Pro', 'Shared AI workspace', 'AI Agents', 'RAG Knowledge Base', 'Team collaboration', 'Priority support'],
    color: '#06B6D4',
    highlight: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: ['Private AI deployment', 'Unlimited AI usage', 'MCP Server & SDKs', 'Connectors & Integration Hub', 'Advanced security', 'SLA & enterprise support'],
    color: '#D4AF37',
    highlight: false,
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
        {/* Header — CSS-based icon (no image transparency issues) */}
        <motion.div {...fadeUp} className="text-center mb-14">
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            {/* Glow halo — breathing */}
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.15, 0.35, 0.15],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, rgba(59,130,246,0.15) 50%, transparent 70%)',
              }}
            />
            {/* CSS gradient icon — no image needed */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                boxShadow: '0 0 20px rgba(124,58,237,0.3)',
              }}
            >
              <Brain className="w-8 h-8 text-white" />
            </motion.div>
          </div>
          <p className="text-xs tracking-[0.2em] uppercase text-marketing-gold font-bold mb-3">
            Orbit Nexus
          </p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-white">
            Think. Connect. Act.
          </h2>
          <p className="text-slate-300 max-w-lg mx-auto text-sm leading-relaxed">
            The standalone AI & Intelligence Platform. Subscribe independently —
            or let it power your OrbitanOS with RAG, Agentic AI, and the Integration Hub.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            In Active Development — Pilot Enrolment Coming Soon
          </div>
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

        {/* ── Nexus Pricing ── */}
        <motion.div {...fadeUp} className="mt-16 text-center">
          <p className="text-xs tracking-[0.2em] uppercase text-marketing-gold font-bold mb-3">
            Orbit Nexus Plans
          </p>
          <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">
            Intelligence, Priced Independently.
          </h3>
          <p className="text-slate-300 max-w-md mx-auto text-sm mb-10">
            Subscribe to Orbit Nexus without OrbitanOS — or add it to your existing plan.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {NEXUS_PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={`rounded-2xl border p-5 flex flex-col ${
                plan.highlight
                  ? 'border-purple-500/30 bg-purple-500/[0.04] ring-1 ring-purple-500/20'
                  : 'border-white/[0.06] bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-3">
                {plan.highlight && <Sparkles className="w-3 h-3 text-purple-400" />}
                <span
                  className="text-[10px] tracking-[0.15em] uppercase font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${plan.color}18`, color: plan.color }}
                >
                  {plan.name}
                </span>
              </div>
              <div className="mb-4">
                <span className="text-xl font-display font-bold text-white">{plan.price}</span>
                <span className="text-xs text-slate-400">{plan.period}</span>
              </div>
              <ul className="space-y-2 flex-1 mb-5">
                {plan.features.map((feat, j) => (
                  <li key={j} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                    <Check
                      className="w-3 h-3 flex-shrink-0 mt-0.5"
                      style={{ color: plan.color }}
                    />
                    {feat}
                  </li>
                ))}
              </ul>
              <Link to="/request-access">
                <Button
                  className={`w-full h-9 rounded-lg text-xs font-bold ${
                    plan.highlight
                      ? 'bg-purple-600 hover:bg-purple-600/90 text-white'
                      : 'bg-white/[0.08] hover:bg-white/[0.12] text-white'
                  }`}
                >
                  {plan.name === 'Enterprise' ? 'Contact Sales' : 'Join the Waitlist'}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}