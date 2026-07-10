import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Shield, Store, Leaf, ShoppingBag,
  ChevronRight, Check, Sparkles, Zap, Lock, Globe, Server, Plug,
  ChevronLeft, ChevronRight as ChevronRightIcon } from
'lucide-react';
import { CapabilityBadge, CapabilityStack } from '@/components/shared/CapabilityBadge';
import { OPERATING_CYCLE, SUBSCRIPTION_PLANS, INDUSTRY_PACKS } from '@/lib/orbitan-config';
import OrbitanWordmark from '@/components/brand/OrbitanWordmark';
import { LOGO_ASSETS } from '@/lib/orbitan-identity';
import OrbitEcosystemSection from '@/components/landing/OrbitEcosystemSection';
import NexusSection from '@/components/landing/NexusSection';

const PRINCIPLES = ['Renew', 'Relate', 'Respond', 'Refine', 'Regulate', 'Reach'];

const PRINCIPLE_ICONS = {
  Renew: Sparkles,
  Relate: Globe,
  Respond: Zap,
  Refine: Server,
  Regulate: Shield,
  Reach: ArrowRight,
};

const PRINCIPLE_COLORS = {
  Renew: '#16A34A', Relate: '#2563EB', Respond: '#F97316',
  Refine: '#7C3AED', Regulate: '#DC2626', Reach: '#D4AF37',
};

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
      {/* ── Navigation ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-marketing-bg/95 backdrop-blur-md border-b border-white/[0.06]' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <OrbitanWordmark size="sm" variant="light" showOS={false} />
          </Link>
          {isAuthenticated ? (
            <Link to="/workspace">
              <Button variant="outline" className="border-marketing-gold/30 text-marketing-gold hover:bg-marketing-gold/10 text-xs font-bold px-5 h-9 rounded-lg">
                Workspace
              </Button>
            </Link>
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

      {/* ── Hero with Orbital Animation ── */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 px-6">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.08)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.04)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />

        {/* Floating orbs */}
        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 left-10 w-3 h-3 rounded-full bg-marketing-blue/40 blur-sm"
        />
        <motion.div
          animate={{ y: [0, 15, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute top-1/3 right-10 w-2 h-2 rounded-full bg-marketing-gold/40 blur-sm"
        />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Logo with orbital ring */}
          <div className="relative w-56 h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 mx-auto mb-10">
            {/* Outer rotating ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full"
              style={{
                border: '1px solid rgba(59,130,246,0.15)',
                boxShadow: '0 0 60px rgba(59,130,246,0.1)',
              }}
            >
              {/* Orbiting dot */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-marketing-blue shadow-lg" style={{ boxShadow: '0 0 20px rgba(59,130,246,0.6)' }} />
            </motion.div>

            {/* Inner counter-rotating ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-6 rounded-full"
              style={{ border: '1px solid rgba(212,175,55,0.12)' }}
            >
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-marketing-gold/60" />
            </motion.div>

            {/* 3D Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <img src={LOGO_ASSETS.mark3D} alt="Orbitan" className="w-40 h-40 md:w-48 md:h-48 lg:w-52 lg:h-52 drop-shadow-2xl" />
            </motion.div>
          </div>

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
            The Workforce Operating System for Modern Organisations — connecting people,
            operations, knowledge, compliance, and growth.
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
              <>
                <Link to="/auth/gateway">
                  <Button className="bg-marketing-blue hover:bg-marketing-blue/90 text-white text-sm font-semibold px-8 h-12 rounded-xl gap-2">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/join">
                  <Button variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-sm font-semibold px-8 h-12 rounded-xl gap-2">
                    Join Organisation <Shield className="w-4 h-4" />
                  </Button>
                </Link>
              </>
            )}
            <a href="#ecosystem" className="text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-1.5">
              Explore Platform <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── Orbit Ecosystem Section ── */}
      <OrbitEcosystemSection />

      {/* ── 6R Framework ── */}
      <section id="framework" className="py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <p className="text-xs tracking-[0.2em] uppercase text-marketing-gold font-bold mb-3">The Operating Cycle</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Six Principles. One Platform.</h2>
            <p className="text-slate-300 max-w-lg mx-auto text-sm">
              The six interconnected "R" elements represent the continuous cycle powering every Orbitan tenant.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PRINCIPLES.map((p, i) => {
              const Icon = PRINCIPLE_ICONS[p];
              const color = PRINCIPLE_COLORS[p];
              const config = Object.values(OPERATING_CYCLE).find((c) => c.label === p);
              return (
                <motion.div
                  key={p}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="group bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${color}15` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <h3 className="font-display font-bold text-white mb-1.5">{p}</h3>
                  <p className="text-slate-300 text-xs leading-relaxed">{config?.description || ''}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Orbit Nexus (AI) Section ── */}
      <NexusSection />

      {/* ── Industry Packs ── */}
      <section id="packs" className="py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto">
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

      {/* ── Orbit Shield™ ── */}
      <section id="shield" className="py-20 md:py-28 px-6 bg-marketing-surface-dark">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <div className="w-14 h-14 rounded-2xl bg-marketing-red/10 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-7 h-7 text-marketing-red" />
            </div>
            <span className="text-xs tracking-[0.2em] uppercase text-marketing-red font-bold">Powered by Regulate</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold mt-3 mb-4">
              Orbit Shield<span className="text-white/30">™</span>
            </h2>
            <p className="text-slate-300 max-w-xl mx-auto text-sm mb-10 leading-relaxed">
              Enterprise-grade security, compliance, and governance. Auditable, portable, and exit-ready — every record, every action, every time.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
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

      {/* ── Subscription Plans ── */}
      <section id="plans" className="py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <p className="text-xs tracking-[0.2em] uppercase text-marketing-gold font-bold mb-3">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Scale With Confidence</h2>
            <p className="text-slate-300 max-w-lg mx-auto text-sm">
              From single-outlet startups to multi-entity enterprises. Every plan scales with your growth.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
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
                  transition={{ duration: 0.5, delay: i * 0.1 }}
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
                      <p className="text-2xl md:text-3xl font-display font-bold text-white whitespace-nowrap">{plan.price_label}</p>
                      {isEnterprise && plan.starting_price_label && (
                        <p className="text-[11px] text-marketing-gold font-semibold mt-1">{plan.starting_price_label}</p>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mb-5">{plan.suitable_for}</p>
                  </div>
                  <ul className="space-y-2.5 flex-1 mb-6">
                    {[
                      isFree ? 'Up to 3 employees' : `Up to ${plan.max_employees ? plan.max_employees.toLocaleString() : 'unlimited'} employees`,
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
                  <Link to="/auth/gateway">
                    <Button className={`w-full h-10 rounded-xl text-xs font-bold ${isEnterprise ? 'bg-marketing-gold hover:bg-marketing-gold/90 text-marketing-bg' : 'bg-white/[0.08] hover:bg-white/[0.12] text-white'}`}>
                      {isEnterprise ? 'Contact Sales' : 'Get Started'}
                    </Button>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 md:py-28 px-6 bg-marketing-surface-dark">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Ready to Build Momentum?</h2>
            <p className="text-slate-300 text-sm mb-8">
              Join the operating system that connects your workforce, operations, and growth.
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
            <span className="text-xs text-slate-300">OrbitanOS by Orbitan © {new Date().getFullYear()} Muhammad Firdaus Bin Ismail</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#ecosystem" className="text-xs text-slate-300 hover:text-white transition-colors">Platform</a>
            <a href="#framework" className="text-xs text-slate-300 hover:text-white transition-colors">Framework</a>
            <a href="#packs" className="text-xs text-slate-300 hover:text-white transition-colors">Packs</a>
            <a href="#plans" className="text-xs text-slate-300 hover:text-white transition-colors">Plans</a>
            <a href="#shield" className="text-xs text-slate-300 hover:text-white transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}