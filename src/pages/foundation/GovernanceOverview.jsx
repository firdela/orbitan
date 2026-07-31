import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, FileText, Scale, Eye, Database, ArrowRight, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicFoundationLayout from '@/components/foundation/PublicFoundationLayout';
import { Button } from '@/components/ui/button';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const PILLARS = [
  { icon: Shield, title: 'Security Standards', desc: 'We implement encryption in transit and at rest, row-level security (RLS), role-based access control (RBAC), and immutable audit trails. Our Shield governance interceptor enforces policies at runtime across all entity operations.' },
  { icon: Scale, title: 'Compliance Framework', desc: 'OrbitanOS is designed to support SOC 2, Singapore PDPA, and GDPR-ready data management. Our Audit Centre provides immutable, tamper-evident audit logs suitable for compliance evidence.' },
  { icon: Database, title: 'Data Governance', desc: 'Every tenant operates in strict isolation. Row-level security ensures no tenant can access another tenant\'s data. Data provenance is tracked, and customers retain full ownership and exportability of their data at all times.' },
  { icon: Eye, title: 'Risk Framework', desc: 'Our governance model includes policy evaluation, override workflows, and forensic artifact linkage. Shield policies are evaluated on every high-value action, with hard-gate (block) and soft-gate (notify) outcomes.' },
  { icon: FileText, title: 'Audit Philosophy', desc: 'We believe in transparent, immutable audit trails. Every significant action — from clock-in to compliance sign-off to finance sync — is recorded with full context, actor, and timestamp. Audit logs are append-only and tamper-evident.' },
  { icon: Lock, title: 'Privacy Principles', desc: 'Privacy by Design is foundational. We collect only necessary data, never sell customer data, and provide full data portability. Customer data is stored in tenant-isolated databases with granular access controls.' },
];

export default function GovernanceOverview() {
  return (
    <PublicFoundationLayout>
      <section className="py-16 md:py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-marketing-blue/10 text-marketing-blue text-xs font-semibold mb-6">
              Governance
            </span>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Trust & Governance</h1>
            <p className="text-slate-300 text-sm max-w-2xl mx-auto">
              Our commitment to security, compliance, and data governance — the foundation of trust for every business that operates on OrbitanOS.
            </p>
          </motion.div>

          {/* Trust Score Banner */}
          <motion.div {...fadeUp} className="bg-marketing-surface rounded-2xl p-8 border border-white/[0.06] mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 mb-4">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">Enterprise-Grade Security</span>
            </div>
            <h2 className="text-2xl font-display font-bold mb-2">Built for Regulated Industries</h2>
            <p className="text-slate-300 text-sm max-w-xl mx-auto">
              From food safety compliance to financial audit trails, OrbitanOS provides the governance
              infrastructure that regulated businesses require.
            </p>
          </motion.div>

          {/* Governance Pillars */}
          <div className="grid sm:grid-cols-2 gap-6 mb-12">
            {PILLARS.map((pillar) => (
              <motion.div key={pillar.title} {...fadeUp} className="bg-marketing-surface rounded-2xl p-6 border border-white/[0.06]">
                <div className="w-10 h-10 rounded-xl bg-marketing-blue/10 flex items-center justify-center mb-4">
                  <pillar.icon className="w-5 h-5 text-marketing-blue" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{pillar.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{pillar.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Key Commitments */}
          <motion.div {...fadeUp} className="bg-marketing-surface-dark rounded-2xl p-8 border border-white/[0.06] mb-12">
            <h3 className="text-lg font-display font-bold mb-6">Our Commitments to You</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                'You own your data — we are custodians, not proprietors',
                'Full data exportability at any time',
                'Immutable audit trails for every significant action',
                'Tenant isolation enforced at the database level',
                'Shield governance policies evaluated on every action',
                'Privacy by Design across all features',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-marketing-blue flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300 leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div {...fadeUp} className="text-center">
            <Link to="/legal">
              <Button variant="outline" className="border-marketing-gold/30 text-marketing-gold hover:bg-marketing-gold/10 text-sm">
                Read Our Legal Policies <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </PublicFoundationLayout>
  );
}