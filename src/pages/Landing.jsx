import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Shield, Store, Leaf, ShoppingBag,
  ChevronRight, Check, Sparkles, Zap, Lock, Globe, Server } from
'lucide-react';
import { CapabilityBadge, CapabilityStack } from '@/components/shared/CapabilityBadge';
import { OPERATING_CYCLE, SUBSCRIPTION_PLANS, INDUSTRY_PACKS } from '@/lib/orbitan-config';
import OrbitanWordmark from '@/components/brand/OrbitanWordmark';
import { LOGO_ASSETS } from '@/lib/orbitan-identity';

const PRINCIPLES = ['Renew', 'Relate', 'Respond', 'Refine', 'Regulate', 'Reach'];

const PRINCIPLE_ICONS = {
  Renew: Sparkles,
  Relate: Globe,
  Respond: Zap,
  Refine: BarChartIcon,
  Regulate: Shield,
  Reach: ArrowRight
};

function BarChartIcon(props) {return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;}

const PRINCIPLE_COLORS = {
  Renew: '#16A34A', Relate: '#2563EB', Respond: '#F97316',
  Refine: '#7C3AED', Regulate: '#DC2626', Reach: '#D4AF37'
};

const FEATURED_PACKS = ['fnb', 'recycling', 'retail'];

const PLAN_ORDER = ['orbitan_starter', 'orbitan_growth', 'orbitan_business', 'orbitan_enterprise'];

const fadeUp = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.6 } };

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-marketing-bg text-white overflow-x-hidden">
      {/* ── Navigation ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-marketing-bg/95 backdrop-blur-md border-b border-white/[0.06]' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <OrbitanWordmark size="sm" variant="light" showOS={false} />
          </div>
          {isAuthenticated ?
          <Link to="/workspace">
              <Button variant="outline" className="border-marketing-gold/30 text-marketing-gold hover:bg-marketing-gold/10 text-xs font-bold px-5 h-9 rounded-lg">
                Workspace
              </Button>
            </Link> :

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
          }
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.07)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.04)_0%,transparent_50%)]" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: 'easeOut' }}>
            <img src="https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39/16aaf935a_Orbitan3dlogotransparentcopy.png" alt="Orbitan" className="w-56 h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 mx-auto mb-10 drop-shadow-2xl" />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
          className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.08] mb-5">
            Run Your Business.<br />
            <span className="text-marketing-blue">Connect Everything.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }}
          className="text-base md:text-lg text-slate-300 max-w-xl mx-auto mb-9 leading-relaxed">
            The Workforce Operating System for Modern Organisations — connecting people, operations, knowledge, compliance, and growth.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {isAuthenticated ?
            <Link to="/workspace">
                <Button className="bg-marketing-blue hover:bg-marketing-blue/90 text-white text-sm font-semibold px-8 h-12 rounded-xl gap-2">
                  Go to Workspace <ArrowRight className="w-4 h-4" />
                </Button>
              </Link> :
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
            }
            <a href="#plans" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
              View Plans <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── 6R Framework ── */}
      <section id="framework" className="py-20 md:py-28 px-6 bg-marketing-surface-dark">
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
                <motion.div key={p} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${color}15` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <h3 className="font-display font-bold text-white mb-1.5">{p}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">{config?.description || ''}</p>
                </motion.div>);

            })}
          </div>
        </div>
      </section>

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
                <motion.div key={key} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${pack.color_hex}18` }}>
                    <Icon className="w-5 h-5" style={{ color: pack.color_hex }} />
                  </div>
                  <h3 className="font-display font-bold text-white text-lg mb-1">{pack.name}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed mb-4">{pack.description}</p>
                  <CapabilityStack packs={pack.modules.map((m) => ({ type: m.toLowerCase().replace(/\s+/g, '_'), label: m })).slice(0, 5)} />
                  {pack.modules.length > 5 &&
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.06] text-slate-400">+{pack.modules.length - 5} more</span>
                  }
                </motion.div>);

            })}
          </div>
        </div>
      </section>

      {/* ── Success Stories — Placeholder ── */}
      <section id="stories" className="py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <p className="text-xs tracking-[0.2em] uppercase text-marketing-gold font-bold mb-3">Customer Stories</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Trusted by Industry Leaders</h2>
            <p className="text-slate-300 max-w-lg mx-auto text-sm">
              See how businesses across F&B, sustainability, and retail are transforming with OrbitanOS.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
            { industry: 'Food & Beverage', pack: 'F&B Pack', color: '#F97316', logo: Store },
            { industry: 'Sustainability', pack: 'Recycling Pack', color: '#16A34A', logo: Leaf },
            { industry: 'Retail', pack: 'Retail Pack', color: '#22C55E', logo: ShoppingBag }].
            map((story, i) => {
              const Icon = story.logo;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative group bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 overflow-hidden hover:border-white/[0.1] transition-all duration-500">
                  <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${story.color}, transparent 70%)` }} />
                  <div className="relative z-10 space-y-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${story.color}15` }}>
                      <Icon className="w-6 h-6" style={{ color: story.color }} />
                    </div>
                    <div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold mb-2 inline-block"
                      style={{ backgroundColor: `${story.color}15`, color: story.color }}>{story.pack}</span>
                      <p className="text-slate-400 text-xs leading-relaxed mt-2">
                        Success Story: <span className="text-white font-medium">{story.industry}</span> — Coming Soon
                      </p>
                    </div>
                    <div className="h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                    <p className="text-[10px] text-slate-400 italic">
                      "How {story.industry} businesses achieved operational excellence with OrbitanOS."
                    </p>
                  </div>
                </motion.div>);

            })}
          </div>
        </div>
      </section>

      {/* ── Subscription Plans ── */}
      <section id="plans" className="py-20 md:py-28 px-6 bg-marketing-surface-dark">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <p className="text-xs tracking-[0.2em] uppercase text-marketing-gold font-bold mb-3">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Scale With Confidence</h2>
            <p className="text-slate-300 max-w-lg mx-auto text-sm">
              From single-outlet startups to multi-entity enterprises. Every plan scales with your growth.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLAN_ORDER.map((key, i) => {
              const plan = SUBSCRIPTION_PLANS[key];
              const isEnterprise = key === 'orbitan_enterprise';
              return (
                <motion.div key={key} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`rounded-2xl border p-6 flex flex-col ${isEnterprise ? 'bg-marketing-surface border-marketing-gold/30 ring-1 ring-marketing-gold/20' : 'bg-white/[0.03] border-white/[0.06]'}`}>
                  <div>
                    <span className="text-[10px] tracking-[0.15em] uppercase font-bold px-2 py-0.5 rounded-full mb-3 inline-block"
                    style={{ backgroundColor: `${plan.color_hex}18`, color: isEnterprise ? plan.accent_hex : plan.color_hex }}>
                      {plan.name}
                    </span>
                    <p className="text-3xl font-display font-bold text-white mt-2 mb-0.5">{plan.price_label}</p>
                    <p className="text-xs text-slate-400 mb-5">{plan.suitable_for}</p>
                  </div>
                  <ul className="space-y-2.5 flex-1 mb-6">
                    {[
                    `Up to ${plan.max_employees ? plan.max_employees.toLocaleString() : 'unlimited'} employees`,
                    plan.ai_access ? 'AI-powered features' : 'Core features',
                    plan.advanced_reporting ? 'Advanced reporting' : 'Basic reporting',
                    plan.integrations ? 'External integrations' : 'Standard modules',
                    isEnterprise ? 'Dedicated support' : 'Community support'].
                    map((feat, j) =>
                    <li key={j} className="flex items-start gap-2 text-xs text-slate-400">
                        <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: isEnterprise ? '#D4AF37' : '#3B82F6' }} />
                        {feat}
                      </li>
                    )}
                  </ul>
                  <Link to="/auth/gateway">
                    <Button className={`w-full h-10 rounded-xl text-xs font-bold ${isEnterprise ? 'bg-marketing-gold hover:bg-marketing-gold/90 text-marketing-bg' : 'bg-white/[0.08] hover:bg-white/[0.12] text-white'}`}>
                      {isEnterprise ? 'Contact Sales' : 'Get Started'}
                    </Button>
                  </Link>
                </motion.div>);

            })}
          </div>
        </div>
      </section>

      {/* ── Orbit Shield™ ── */}
      <section id="shield" className="py-20 md:py-28 px-6">
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
            { icon: Shield, title: 'Governance', desc: 'Compliance templates, data retention policies, and regulatory reporting.' }].
            map((item, i) =>
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
            className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                <item.icon className="w-5 h-5 text-marketing-red mb-3" />
                <h4 className="font-display font-semibold text-white text-sm mb-1.5">{item.title}</h4>
                <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ── Connected Ecosystem ── */}
      <section id="ecosystem" className="py-20 md:py-28 px-6 bg-marketing-surface-dark">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <p className="text-xs tracking-[0.2em] uppercase text-marketing-gold font-bold mb-3">Connected Ecosystem</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Integrate Everything</h2>
            <p className="text-slate-300 max-w-lg mx-auto text-sm">
              OrbitanOS connects with the tools you already use. Finance, workforce, compliance — all in one operating system.
            </p>
          </motion.div>

          {/* Integration Network Visual */}
          <motion.div {...fadeUp} className="relative flex items-center justify-center mb-12">
            <div className="w-20 h-20 rounded-full bg-marketing-blue/10 border border-[#3B82F6]/20 flex items-center justify-center z-10">
              <img src={LOGO_ASSETS.mark} alt="Orbitan" className="w-10 h-10 opacity-80" />
            </div>
            {/* Connection lines with pulsing dots */}
            {[0, 72, 144, 216, 288].map((angle, i) =>
            <div key={i} className="absolute top-1/2 left-1/2 origin-left h-px"
            style={{ width: '140px', transform: `rotate(${angle}deg)`, background: `linear-gradient(90deg, rgba(59,130,246,0.3), transparent)` }}>
                <div className="absolute right-0 -top-1 w-2 h-2 rounded-full bg-marketing-blue/60 animate-pulse" />
              </div>
            )}
            {/* Satellite nodes */}
            {['Finance', 'Workforce', 'Inventory', 'Compliance', 'AI'].map((label, i) => {
              const angles = [0, 72, 144, 216, 288];
              const rad = angles[i] * Math.PI / 180;
              const x = Math.cos(rad) * 140;
              const y = Math.sin(rad) * 140;
              return (
                <div key={label} className="absolute flex flex-col items-center gap-1"
                style={{ transform: `translate(${x}px, ${y}px)` }}>
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                    <Zap className="w-4 h-4 text-marketing-blue/60" />
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium">{label}</span>
                </div>);

            })}
          </motion.div>

          {/* Integration Partners Grid */}
          <motion.div {...fadeUp} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {['Xero', 'Google', 'Slack', 'Stripe', 'WhatsApp'].map((partner, i) =>
            <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300 group">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors">{partner[0]}</span>
                </div>
                <span className="text-[9px] text-slate-400 group-hover:text-slate-200 transition-colors">{partner}</span>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Mobile App — Placeholder ── */}
      <section id="mobile" className="py-20 md:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div {...fadeUp} className="space-y-6">
              <div>
                <p className="text-xs tracking-[0.2em] uppercase text-marketing-gold font-bold mb-3">Coming Soon</p>
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">OrbitanOS in Your Pocket</h2>
                <p className="text-slate-300 text-sm leading-relaxed max-w-md">
                  Clock in, manage tasks, and stay connected — all from your phone. The full OrbitanOS experience, optimised for mobile.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="h-11 px-5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-2 cursor-not-allowed opacity-60">
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.37 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
                  <span className="text-xs text-slate-400 font-medium">App Store</span>
                </div>
                <div className="h-11 px-5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-2 cursor-not-allowed opacity-60">
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 010 1.732l-2.807 1.626L15.206 12l2.492-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" /></svg>
                  <span className="text-xs text-slate-400 font-medium">Google Play</span>
                </div>
              </div>
            </motion.div>
            <motion.div {...fadeUp} className="flex justify-center">
              <div className="relative">
                <div className="w-56 h-96 rounded-[2rem] border-2 border-white/[0.08] bg-marketing-surface overflow-hidden shadow-2xl">
                  <div className="h-8 border-b border-white/[0.05] flex items-center justify-center">
                    <div className="w-16 h-1 rounded-full bg-white/[0.1]" />
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-marketing-blue/10 flex items-center justify-center mx-auto">
                      <img src={LOGO_ASSETS.mark3D} alt="Orbitan" className="w-6 h-6 opacity-60" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-3/4 rounded bg-white/[0.06] mx-auto" />
                      <div className="h-2 w-1/2 rounded bg-white/[0.04] mx-auto" />
                    </div>
                    <div className="space-y-1.5 mt-3">
                      <div className="h-8 rounded-lg bg-white/[0.03] border border-white/[0.05]" />
                      <div className="h-8 rounded-lg bg-white/[0.03] border border-white/[0.05]" />
                      <div className="h-8 rounded-lg bg-white/[0.03] border border-white/[0.05]" />
                    </div>
                  </div>
                </div>
                <div className="absolute -inset-4 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08)_0%,transparent_70%)] rounded-[3rem] -z-10" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 md:py-28 px-6 bg-marketing-surface-dark">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Ready to Build Momentum?</h2>
            <p className="text-slate-300 text-sm mb-8">Join the operating system that connects your workforce, operations, and growth.</p>
            {isAuthenticated ?
            <Link to="/workspace">
                <Button className="bg-marketing-gold hover:bg-marketing-gold/90 text-marketing-bg text-sm font-semibold px-10 h-12 rounded-xl gap-2">
                  Go to Workspace <ArrowRight className="w-4 h-4" />
                </Button>
              </Link> :

            <Link to="/auth/gateway">
                <Button className="bg-marketing-blue hover:bg-marketing-blue/90 text-white text-sm font-semibold px-10 h-12 rounded-xl gap-2">
                  Join Orbitan <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            }
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={LOGO_ASSETS.mark3D} alt="Orbitan" className="w-5 h-5 opacity-50" />
            <span className="text-xs text-slate-400">OrbitanOS by Orbitan © {new Date().getFullYear()} Muhammad Firdaus Bin Ismail</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#framework" className="text-xs text-slate-400 hover:text-white transition-colors">Framework</a>
            <a href="#packs" className="text-xs text-slate-400 hover:text-white transition-colors">Packs</a>
            <a href="#stories" className="text-xs text-slate-400 hover:text-white transition-colors">Stories</a>
            <a href="#plans" className="text-xs text-slate-400 hover:text-white transition-colors">Plans</a>
            <a href="#shield" className="text-xs text-slate-400 hover:text-white transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>);

}