import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Brain, Briefcase, Check } from 'lucide-react';
import { Rocket, FlaskConical } from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
};

const PRODUCTS = [
  {
    id: 'orbitanos',
    name: 'OrbitanOS',
    tagline: 'The Workforce Operating System',
    description:
      'Run your workforce, operations, and financial workflows in one unified platform. Inventory, procurement, sales, compliance — built for every industry, from home-based businesses to enterprises.',
    icon: Briefcase,
    accent: '#2563EB',
    accentGradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
    availability: {
      label: 'Pilot Programme',
      status: 'Currently validating with selected pilot organisations to ensure production readiness before a wider public launch.',
      badgeClass: 'bg-marketing-blue/10 border-marketing-blue/30 text-marketing-blue',
      dotClass: 'bg-marketing-blue',
    },
    features: [
      'Workforce & Attendance',
      'Inventory & Procurement',
      'Sales & Invoicing',
      'Compliance & Audit Trail',
      'Industry Packs (F&B, Retail, Sustainability)',
      'Xero & Stripe Integration',
    ],
    pricing: 'From S$49/mo',
    cta: 'Request Pilot Access',
    ctaHref: '/contact/interest?type=orbitanos_pilot',
    href: '#plans',
  },
  {
    id: 'nexus',
    name: 'Orbit Nexus',
    tagline: 'The Intelligence Platform',
    description:
      'AI-powered intelligence that works standalone or powers OrbitanOS. RAG knowledge search, agentic AI workflows, AIReceipts OCR, and a full integration hub — subscribe independently.',
    icon: Brain,
    accent: '#7C3AED',
    accentGradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
    availability: {
      label: 'In Active Development',
      status: 'Standalone subscriptions and pilot enrolment will open separately once the platform is ready for external validation.',
      badgeClass: 'bg-marketing-gold/10 border-marketing-gold/30 text-marketing-gold',
      dotClass: 'bg-marketing-gold',
    },
    features: [
      'RAG Knowledge Search',
      'Agentic AI Workflows',
      'AIReceipts OCR & Extraction',
      'Integration Hub (Xero, Stripe, Slack)',
      'MCP Server & API Gateway',
      'Automation Engine',
    ],
    pricing: 'From S$39/mo',
    cta: 'Register Interest',
    ctaHref: '/contact/interest?type=orbit_nexus_interest',
    href: '#nexus',
  },
];

export default function DualProductSection() {
  return (
    <section id="products" className="py-20 md:py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div {...fadeUp} className="text-center mb-14">
          <p className="text-xs tracking-[0.2em] uppercase text-marketing-gold font-bold mb-3">
            Two Products. One Ecosystem.
          </p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-white">
            Choose Your Platform.
          </h2>
          <p className="text-slate-300 max-w-xl mx-auto text-sm leading-relaxed">
            OrbitanOS runs your business operations. Orbit Nexus powers it with AI.
            Subscribe to either independently — or combine both for the full ecosystem.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {PRODUCTS.map((product, i) => {
            const Icon = product.icon;
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="group relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7 hover:bg-white/[0.05] transition-all duration-300 overflow-hidden"
              >
                {/* Top accent gradient bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: product.accentGradient }}
                />

                {/* Hover glow */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${product.accent}10, transparent 70%)`,
                  }}
                />

                <div className="relative z-10">
                  {/* Icon + Name */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: product.accentGradient,
                      }}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-white text-xl">{product.name}</h3>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">
                        {product.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Availability Badge */}
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold mb-4 ${product.availability.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${product.availability.dotClass} animate-pulse`} />
                    {product.id === 'orbitanos' ? <FlaskConical className="w-3 h-3" /> : <Rocket className="w-3 h-3" />}
                    {product.availability.label}
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed mb-2">
                    {product.description}
                  </p>

                  <p className="text-[11px] text-slate-400 leading-relaxed mb-5 italic">
                    {product.availability.status}
                  </p>

                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {product.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-xs text-slate-200">
                        <Check
                          className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                          style={{ color: product.accent }}
                        />
                        {feat}
                      </li>
                    ))}
                  </ul>

                  {/* Pricing + CTA */}
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/[0.06]">
                    <span
                      className="text-sm font-display font-bold"
                      style={{ color: product.accent }}
                    >
                      {product.pricing}
                    </span>
                    <Link to={product.ctaHref}>
                      <Button
                        className="h-9 px-5 rounded-lg text-xs font-bold gap-1.5"
                        style={{
                          background: product.accentGradient,
                          color: '#FFFFFF',
                        }}
                      >
                        {product.cta}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Ecosystem bridge note */}
        <motion.div
          {...fadeUp}
          className="text-center mt-8"
        >
          <p className="text-xs text-slate-400">
            <span className="text-marketing-gold font-semibold">Combined:</span> OrbitanOS + Orbit Nexus = the complete Orbitan ecosystem.
          </p>
        </motion.div>
      </div>
    </section>
  );
}