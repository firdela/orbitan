import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Shield, Store, Leaf, ShoppingBag,
  Check, Lock, Server } from 'lucide-react';
import { CapabilityStack } from '@/components/shared/CapabilityBadge';
import { SUBSCRIPTION_PLANS, INDUSTRY_PACKS } from '@/lib/orbitan-config';
import OrbitanWordmark from '@/components/brand/OrbitanWordmark';
import { LOGO_ASSETS } from '@/lib/orbitan-identity';
import OrbitEcosystemSection from '@/components/landing/OrbitEcosystemSection';
import NexusSection from '@/components/landing/NexusSection';
import IntegrationHubSection from '@/components/landing/IntegrationHubSection';
import DualProductSection from '@/components/landing/DualProductSection';
import UserMenu from '@/components/shared/UserMenu';

const FEATURED_PACKS = ['fnb', 'recycling', 'retail'];
const PLAN_ORDER = ['orbitan_free', 'orbitan_starter', 'orbitan_growth', 'orbitan_business', 'orbitan_enterprise'];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
};

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-marketing-bg text-white overflow-x-hidden">
      {/* ── Skip link — keyboard accessibility (WCAG 2.4.1) ── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-marketing-gold focus:text-marketing-bg focus:rounded-md focus:shadow"
      >
        Skip to main content
      </a>
      {/* ── Navigation ── */}
      <nav aria-label="Main" className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 pt-[env(safe-area-inset-top)] ${scrolled ? 'bg-marketing-bg/95 backdrop-blur-md border-b border-white/[0.06]' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <OrbitanWordmark size="sm" variant="light" showOS={false} />
          </Link>
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link to="/workspace">
                <Button variant="outline" className="border-marketing-gold/30 text-marketing-gold hover:bg-marketing-gold/10 text-xs font-bold px-5 h-9 rounded-lg">
                  Workspace
                </Button>
              </Link>
              <div className="w-36 [&_button]:text-white/70 [&_button:hover]:text-white">
                <UserMenu variant="dark" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/join">
                <Button variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold px-4 h-9 rounded-lg">
                  Join Org
                </Button>
              </Link>
              <Link to="/auth/gateway">
                <Button className="bg-marketing-gold hover:bg-marketing-gold/90 text-marketing-bg text-xs font-bold px-5 h-9 rounded-lg">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section id="main-content" tabIndex={-1} className="relative pt-32 pb-16 md:pt-40 md:pb-20 px-6 overflow-hidden outline-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08)_0%,transparent_70%)]" />
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-20 left-[10%] w-72 h-72 rounded-full blur-[100px] opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-40 right-[8%] w-96 h-96 rounded-full blur-[120px] opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)' }}
        />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="mb-8"
          >
            <motion.img
              src={LOGO_ASSETS.mark}
              alt="Orbitan"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="w-32 h-32 md:w-40 md:h-40 mx-auto drop-shadow-2xl"
              style={{ filter: 'drop-shadow(0 0 40px rgba(59,130,246,0.15))' }}
            />
          </motion.div>

          {/* Early Access Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-marketing-blue/10 border border-marketing-blue/20 text-marketing-blue text-xs font-semibold mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-marketing-blue animate-pulse" />
            Early Access — Pilot Programme Active
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.08] mb-5"
          >
            Run Your Business.<br />
            <span className="bg-gradient-to-r from-marketing-blue via-blue-400 to-marketing-blue bg-clip-text text-transparent">
              Connect Everything.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-base md:text-lg text-slate-300 max-w-xl mx-auto mb-9 leading-relaxed"
          >
            One ecosystem. Two products. OrbitanOS runs your workforce and operations.
            Orbit Nexus powers it with AI. Subscribe to either — or both.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-xs text-slate-500 mt-4 mb-8 max-w-md mx-auto"
          >
            OrbitanOS is actively evolving alongside our pilot partners. New modules, intelligence capabilities, and enterprise features ship weekly — your feedback directly shapes the roadmap.
            Orbit Nexus is in active development and will open for pilot enrolment separately once ready for external validation.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            {isAuthenticated ? (
              <Link to="/workspace">
                <Button className="bg-marketing-blue hover:bg-marketing-blue/90 text-white text-sm font-semibold px-8 h-12 rounded-xl gap-2">
                  Go to Workspace <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/auth/gateway">
                <Button className="bg-marketing-blue hover:bg-marketing-blue/90 text-white text-sm font-semibold px-8 h-12 rounded-xl gap-2">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
            <a href="#products" className="text-sm text-slate-300 hover:text-white transition-colors">
              Explore Products →
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── 1. Two Products ── */}
      <div id="products"><DualProductSection /></div>

      {/* ── 2. Ecosystem Engines ── */}
      <div id="ecosystem"><OrbitEcosystemSection /></div>

      {/* ── 3. Orbit Nexus (Intelligence) ── */}
      <div id="nexus"><NexusSection /></div>

      {/* ── 4. Integration Hub ── */}
      <div id="connect"><IntegrationHubSection /></div>

      {/* ── 5. Industry Packs ── */}
      <section id="packs" className="py-20 md:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <p className="text-xs tracking-[0.2em] uppercase text-marketing-gold font-bold mb-3">Industry Packs</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Built for Your Industry</h2>
            <p className="text-slate-300 max-w-lg mx-auto text-sm">
              Self-aware capability blueprints. Every pack ships with the right modules, workflows, and compliance templates.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURED_PACKS.map((key, i) => {
              const pack = INDUSTRY_PACKS[key];
              const icons = { fnb: Store, recycling: Leaf, retail: ShoppingBag };
              const Icon = icons[key];
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${pack.color_hex}18` }}>
                    <Icon className="w-5 h-5" style={{ color: pack.color_hex }} />
                  </div>
                  <h3 className="font-display font-bold text-white text-lg mb-1">{pack.name}</h3>
                  <p className="text-slate-300 text-xs leading-relaxed mb-4">{pack.description}</p>
                  <CapabilityStack packs={pack.modules.map((m) => ({ type: m.toLowerCase().replace(/\s+/g, '_'), label: m })).slice(0, 5)} />
                  {pack.modules.length > 5 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.06] text-slate-300">+{pack.modules.length - 5} more</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 6. OrbitanOS Pricing ── */}
      <section id="plans" className="py-20 md:py-28 px-6 bg-marketing-surface-dark">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <p className="text-xs tracking-[0.2em] uppercase text-marketing-blue font-bold mb-3">OrbitanOS Pricing</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Scale With Confidence</h2>
            <p className="text-slate-300 max-w-lg mx-auto text-sm">
              From single-outlet startups to multi-entity enterprises. Every plan scales with your growth.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {PLAN_ORDER.map((key, i) => {
              const plan = SUBSCRIPTION_PLANS[key];
              const isEnterprise = key === 'orbitan_enterprise';
              const isFree = key === 'orbitan_free';
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className={`rounded-2xl border p-6 flex flex-col ${isEnterprise ? 'bg-marketing-surface border-marketing-gold/30 ring-1 ring-marketing-gold/20' : 'bg-white/[0.03] border-white/[0.06]'}`}
                >
                  <div>
                    <span
                      className="text-[10px] tracking-[0.15em] uppercase font-bold px-2 py-0.5 rounded-full mb-3 inline-block"
                      style={{ backgroundColor: `${plan.color_hex}18`, color: isEnterprise ? plan.accent_hex : plan.color_hex }}
                    >
                      {plan.name}
                    </span>
                    <div className="mt-2 mb-0.5">
                      <p className="text-xl md:text-2xl font-display font-bold text-white">{plan.price_label}</p>
                      {isEnterprise && plan.starting_price_label && (
                        <p className="text-[11px] text-marketing-gold font-semibold mt-1">{plan.starting_price_label}</p>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mb-5 mt-2">{plan.suitable_for}</p>
                  </div>
                  <ul className="space-y-2.5 flex-1 mb-6">
                    {[
                      isFree ? 'Up to 3 employees' : plan.max_employees ? `Up to ${plan.max_employees.toLocaleString()} employees` : 'Unlimited employees',
                      plan.ai_access ? 'AI-powered features' : 'Core features',
                      plan.advanced_reporting ? 'Advanced reporting' : 'Basic reporting',
                      plan.integrations ? 'External integrations' : 'Standard modules',
                      isEnterprise ? 'Dedicated support' : 'Community support',
                    ].map((feat, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-slate-300">
                        <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: isEnterprise ? '#D4AF37' : '#3B82F6' }} />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <Link to={isEnterprise ? '/contact/interest?type=enterprise_pilot' : '/contact/interest?type=orbitanos_pilot'}>
                    <Button className={`w-full h-10 rounded-xl text-xs font-bold ${isEnterprise ? 'bg-marketing-gold hover:bg-marketing-gold/90 text-marketing-bg' : 'bg-white/[0.08] hover:bg-white/[0.12] text-white'}`}>
                      {isEnterprise ? 'Enterprise Pilot Access' : 'Request Pilot Access'}
                    </Button>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 7. Trust: Orbit Shield ── */}
      <section id="shield" className="py-20 md:py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <div className="w-14 h-14 rounded-2xl bg-marketing-red/10 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-7 h-7 text-marketing-red" />
            </div>
            <span className="text-xs tracking-[0.2em] uppercase text-marketing-red font-bold">Orbit Shield™</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold mt-3 mb-4">Security You Can Audit.</h2>
            <p className="text-slate-300 max-w-xl mx-auto text-sm leading-relaxed">
              Enterprise-grade governance baked into every action. Immutable audit trails, compliance gates,
              and policy-as-code enforcement — exit-ready and portable to any stack.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { icon: Lock, title: 'Access Control', desc: 'MFA, SSO, and granular role-based permissions across every module.' },
              { icon: Server, title: 'Audit Trail', desc: 'Immutable audit logs. Every state change captured and verifiable.' },
              { icon: Shield, title: 'Governance', desc: 'Compliance templates, data retention policies, and regulatory reporting.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5"
              >
                <item.icon className="w-5 h-5 text-marketing-red mb-3" />
                <h4 className="font-display font-semibold text-white text-sm mb-1.5">{item.title}</h4>
                <p className="text-slate-300 text-xs leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. CTA ── */}
      <section className="py-20 md:py-28 px-6 bg-marketing-surface-dark">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Ready to Build Momentum?</h2>
            <p className="text-slate-300 text-sm mb-8">
              Join the ecosystem that connects your workforce, operations, and intelligence.
            </p>
            {isAuthenticated ? (
              <Link to="/workspace">
                <Button className="bg-marketing-gold hover:bg-marketing-gold/90 text-marketing-bg text-sm font-semibold px-10 h-12 rounded-xl gap-2">
                  Go to Workspace <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/auth/gateway">
                <Button className="bg-marketing-blue hover:bg-marketing-blue/90 text-white text-sm font-semibold px-10 h-12 rounded-xl gap-2">
                  Join Orbitan <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={LOGO_ASSETS.mark3D} alt="Orbitan" className="w-5 h-5 opacity-50" />
            <span className="text-xs text-slate-300">© {new Date().getFullYear()} Orbitan. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-5 flex-wrap justify-center">
            <Link to="/about-orbitan" className="text-xs text-slate-300 hover:text-white transition-colors">About</Link>
            <a href="#products" className="text-xs text-slate-300 hover:text-white transition-colors">Products</a>
            <a href="#ecosystem" className="text-xs text-slate-300 hover:text-white transition-colors">Ecosystem</a>
            <a href="#nexus" className="text-xs text-slate-300 hover:text-white transition-colors">Nexus</a>
            <a href="#packs" className="text-xs text-slate-300 hover:text-white transition-colors">Industries</a>
            <a href="#plans" className="text-xs text-slate-300 hover:text-white transition-colors">Pricing</a>
            <Link to="/support" className="text-xs text-slate-300 hover:text-white transition-colors">Support</Link>
            <Link to="/status" className="text-xs text-slate-300 hover:text-white transition-colors">Status</Link>
            <Link to="/legal" className="text-xs text-slate-300 hover:text-white transition-colors">Legal</Link>
            <Link to="/governance" className="text-xs text-slate-300 hover:text-white transition-colors">Governance</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}