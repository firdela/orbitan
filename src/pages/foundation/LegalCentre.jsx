import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Shield, Cookie, Scale, Lock, Award, BookOpen, ExternalLink } from 'lucide-react';
import PublicFoundationLayout from '@/components/foundation/PublicFoundationLayout';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const LEGAL_DOCUMENTS = [
  {
    key: 'privacy',
    icon: Shield,
    title: 'Privacy Policy',
    desc: 'How we collect, use, and protect your personal data.',
    summary: 'Orbitan is committed to protecting your privacy. We collect only the data necessary to provide our services, never sell your data to third parties, and give you full control over your information. All data is stored securely with row-level security and tenant isolation.',
  },
  {
    key: 'terms',
    icon: FileText,
    title: 'Terms of Service',
    desc: 'The terms governing your use of OrbitanOS.',
    summary: 'By accessing OrbitanOS, you agree to use the platform in accordance with these terms. You retain full ownership of your business data. We provide the service on a commercially reasonable basis and are not liable for indirect or consequential damages beyond the terms outlined herein.',
  },
  {
    key: 'cookies',
    icon: Cookie,
    title: 'Cookie Policy',
    desc: 'How we use cookies and tracking technologies.',
    summary: 'We use essential cookies to maintain your session and provide core functionality. We use optional analytics cookies to improve our service. You can manage your cookie preferences at any time from your account settings.',
  },
  {
    key: 'acceptable_use',
    icon: Scale,
    title: 'Acceptable Use Policy',
    desc: 'Permitted and prohibited uses of the platform.',
    summary: 'You agree not to use OrbitanOS for unlawful activities, to infringe on intellectual property, to transmit malware, or to attempt to disrupt service. Violations may result in account suspension or termination.',
  },
  {
    key: 'security',
    icon: Lock,
    title: 'Security Policy',
    desc: 'Our security standards and practices.',
    summary: 'We implement industry-standard security measures including encryption in transit and at rest, row-level security, role-based access control, immutable audit trails, and regular security reviews. We follow a privacy-by-design philosophy across all features.',
  },
  {
    key: 'compliance',
    icon: Award,
    title: 'Compliance Statements',
    desc: 'Regulatory compliance and certifications.',
    summary: 'OrbitanOS is designed to support SOC 2 compliance through immutable audit logs, governance controls, and data governance features. We align with Singapore PDPA requirements and provide tools for GDPR-ready data management.',
  },
  {
    key: 'licensing',
    icon: BookOpen,
    title: 'Licensing',
    desc: 'Software licensing and intellectual property.',
    summary: 'OrbitanOS is proprietary software. Source code is synchronised with our private GitHub repository. Customers receive a license to use the platform according to their subscription plan. All intellectual property remains with Orbitan.',
  },
  {
    key: 'opensource',
    icon: ExternalLink,
    title: 'Open Source Notices',
    desc: 'Third-party open source components used.',
    summary: 'OrbitanOS is built using open source technologies including React, Tailwind CSS, Node.js, and various Radix UI components. We are grateful to the open source community and comply with all applicable licenses.',
  },
];

export default function LegalCentre() {
  const [selected, setSelected] = useState('privacy');
  const activeDoc = LEGAL_DOCUMENTS.find(d => d.key === selected);

  return (
    <PublicFoundationLayout>
      <section className="py-16 md:py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-marketing-blue/10 text-marketing-blue text-xs font-semibold mb-6">
              Legal Centre
            </span>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Legal & Compliance</h1>
            <p className="text-slate-300 text-sm max-w-2xl mx-auto">
              Everything you need to understand your rights, our obligations, and how we protect your data.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Document List */}
            <div className="lg:col-span-1 space-y-2">
              {LEGAL_DOCUMENTS.map((doc) => (
                <button
                  key={doc.key}
                  onClick={() => setSelected(doc.key)}
                  className={`w-full text-left p-4 rounded-xl transition-colors border ${selected === doc.key ? 'bg-marketing-surface border-marketing-blue/30' : 'border-transparent hover:bg-marketing-surface/50'}`}
                >
                  <div className="flex items-start gap-3">
                    <doc.icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${selected === doc.key ? 'text-marketing-blue' : 'text-slate-400'}`} />
                    <div>
                      <h3 className={`text-sm font-semibold ${selected === doc.key ? 'text-white' : 'text-slate-300'}`}>{doc.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{doc.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Document Content */}
            <div className="lg:col-span-2">
              <motion.div key={selected} {...fadeUp} className="bg-marketing-surface rounded-2xl p-8 border border-white/[0.06]">
                <div className="flex items-center gap-3 mb-6">
                  <activeDoc.icon className="w-6 h-6 text-marketing-blue" />
                  <h2 className="text-xl font-display font-bold">{activeDoc.title}</h2>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">{activeDoc.summary}</p>
                <div className="space-y-3 text-xs text-slate-400">
                  <p>This document is provided for informational purposes and constitutes part of the agreement between Orbitan and its customers. For binding terms, please refer to your subscription agreement.</p>
                  <p className="text-slate-500">Last updated: July 2026 · © 2026 Orbitan. All rights reserved.</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </PublicFoundationLayout>
  );
}