import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Target, Eye, Heart, Compass, Zap, Shield } from 'lucide-react';
import PublicFoundationLayout from '@/components/foundation/PublicFoundationLayout';
import { PLATFORM_IDENTITY, OPERATING_CYCLE } from '@/lib/orbitan-config';
import { Button } from '@/components/ui/button';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
};

const PRINCIPLES = Object.values(OPERATING_CYCLE);

const VALUES = [
  { icon: Heart, title: 'Customer Sovereignty', desc: 'Every customer owns their data. We are custodians, not proprietors.' },
  { icon: Shield, title: 'Privacy by Design', desc: 'Security and privacy are foundational, not bolted on after the fact.' },
  { icon: Compass, title: 'Sustainable Growth', desc: 'We build for long-term resilience, not short-term extraction.' },
  { icon: Zap, title: 'Operational Excellence', desc: 'Beautiful tools that make daily work effortless and intelligent.' },
];

export default function AboutOrbitan() {
  return (
    <PublicFoundationLayout>
      {/* Hero */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <span className="inline-block px-4 py-1.5 rounded-full bg-marketing-blue/10 text-marketing-blue text-xs font-semibold mb-6">
              About Orbitan
            </span>
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 leading-tight">
              The Operating System for <span className="text-marketing-gold">Sustainable Operations</span>
            </h1>
            <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
              {PLATFORM_IDENTITY.tagline}
            </p>
            <Link to="/auth/gateway">
              <Button className="bg-marketing-gold hover:bg-marketing-gold/90 text-marketing-bg text-sm font-semibold px-8 h-11 rounded-xl gap-2">
                Start Your Journey <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 px-6 bg-marketing-surface-dark">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          <motion.div {...fadeUp} className="bg-marketing-surface rounded-2xl p-8 border border-white/[0.06]">
            <Target className="w-8 h-8 text-marketing-blue mb-4" />
            <h2 className="text-2xl font-display font-bold mb-3">Our Mission</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              To give every operating business — from home-based bakers to multi-site enterprises —
              a single, intelligent platform that makes workforce, inventory, finance, compliance and
              growth feel effortless. We believe operational excellence should be accessible to all,
              not reserved for those who can afford enterprise software.
            </p>
          </motion.div>
          <motion.div {...fadeUp} className="bg-marketing-surface rounded-2xl p-8 border border-white/[0.06]">
            <Eye className="w-8 h-8 text-marketing-gold mb-4" />
            <h2 className="text-2xl font-display font-bold mb-3">Our Vision</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              A world where every business operates on a single, connected, AI-augmented operating
              system — one that learns from daily operations, anticipates needs, and grows with the
              organisation. From a single home kitchen to a multi-country enterprise, the same
              intelligence scales with you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold mb-4">Core Values</h2>
            <p className="text-slate-300 text-sm">The principles that guide every line of code and every customer interaction.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-6">
            {VALUES.map((value, i) => (
              <motion.div key={value.title} {...fadeUp} className="bg-marketing-surface rounded-2xl p-6 border border-white/[0.06]">
                <div className="w-10 h-10 rounded-xl bg-marketing-blue/10 flex items-center justify-center mb-4">
                  <value.icon className="w-5 h-5 text-marketing-blue" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{value.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Operating Principles */}
      <section className="py-16 px-6 bg-marketing-surface-dark">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold mb-4">The 6-R Operating Cycle</h2>
            <p className="text-slate-300 text-sm">The foundation of OrbitanOS — six principles that define how every business operates.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRINCIPLES.map((principle, i) => (
              <motion.div key={principle.key} {...fadeUp} className="bg-marketing-surface rounded-xl p-5 border border-white/[0.06]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${principle.color}20` }}>
                    <span className="text-xs font-bold" style={{ color: principle.color }}>{i + 1}</span>
                  </div>
                  <h3 className="font-display font-semibold">{principle.label}</h3>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{principle.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Overview */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <h2 className="text-3xl font-display font-bold mb-6">Company Overview</h2>
            <p className="text-slate-300 text-sm leading-relaxed mb-8">
              Orbitan is a Singapore-based technology company building the operating system for
              modern operations. Founded on the belief that operational software should be intelligent,
              accessible, and growth-enabling, we serve businesses across food & beverage, retail,
              sustainability, logistics, and home-based enterprises. Our platform, OrbitanOS, unifies
              workforce management, inventory, procurement, finance, compliance, and AI-driven
              intelligence into a single, scalable system.
            </p>
            <div className="flex items-center justify-center gap-8 mb-8">
              <div>
                <div className="text-3xl font-display font-bold text-marketing-gold">2024</div>
                <div className="text-xs text-slate-400">Founded</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <div className="text-3xl font-display font-bold text-marketing-blue">SG</div>
                <div className="text-xs text-slate-400">Headquartered</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <div className="text-3xl font-display font-bold text-marketing-gold">v{PLATFORM_IDENTITY.version}</div>
                <div className="text-xs text-slate-400">Current Release</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/support"><Button variant="outline" className="border-white/20 text-white/80 hover:bg-white/10">Contact Support</Button></Link>
              <Link to="/legal"><Button variant="outline" className="border-white/20 text-white/80 hover:bg-white/10">Legal Centre</Button></Link>
            </div>
          </motion.div>
        </div>
      </section>
    </PublicFoundationLayout>
  );
}