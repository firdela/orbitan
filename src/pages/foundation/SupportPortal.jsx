import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LifeBuoy, BookOpen, FileQuestion, Ticket, Mail, HelpCircle, Compass, ArrowRight } from 'lucide-react';
import PublicFoundationLayout from '@/components/foundation/PublicFoundationLayout';
import { Button } from '@/components/ui/button';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const SUPPORT_CHANNELS = [
  { icon: BookOpen, title: 'Knowledge Hub', desc: 'Browse our complete documentation, guides, and tutorials.', to: '/knowledge-hub', cta: 'Browse Docs' },
  { icon: FileQuestion, title: 'FAQ', desc: 'Find answers to the most commonly asked questions.', to: '/knowledge-hub', cta: 'View FAQ' },
  { icon: Ticket, title: 'Submit a Ticket', desc: 'Report an issue or request a feature directly from your workspace.', to: '/workspace', cta: 'Open Workspace' },
  { icon: Mail, title: 'Contact Support', desc: 'Reach our support team for urgent or complex issues.', to: '/contact/interest?type=orbitanos_pilot', cta: 'Contact Us' },
  { icon: Compass, title: 'System Guides', desc: 'Step-by-step guides for administrators, managers, and workers.', to: '/knowledge-hub', cta: 'View Guides' },
  { icon: HelpCircle, title: 'Help Centre', desc: 'Searchable help articles across all modules.', to: '/knowledge-hub', cta: 'Search Help' },
];

export default function SupportPortal() {
  return (
    <PublicFoundationLayout>
      <section className="py-16 md:py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-marketing-blue/10 text-marketing-blue text-xs font-semibold mb-6">
              Support Portal
            </span>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">How Can We Help?</h1>
            <p className="text-slate-300 text-sm max-w-2xl mx-auto">
              Find documentation, submit tickets, and get the help you need to make the most of OrbitanOS.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SUPPORT_CHANNELS.map((channel) => (
              <motion.div key={channel.title} {...fadeUp} className="bg-marketing-surface rounded-2xl p-6 border border-white/[0.06] flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-marketing-blue/10 flex items-center justify-center mb-4">
                  <channel.icon className="w-5 h-5 text-marketing-blue" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{channel.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed flex-1">{channel.desc}</p>
                <Link to={channel.to} className="mt-4">
                  <Button variant="ghost" className="text-marketing-blue hover:text-marketing-blue hover:bg-marketing-blue/10 text-sm font-semibold px-0">
                    {channel.cta} <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp} className="mt-12 bg-marketing-surface rounded-2xl p-8 border border-white/[0.06] text-center">
            <LifeBuoy className="w-10 h-10 text-marketing-gold mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold mb-2">Need Urgent Help?</h2>
            <p className="text-slate-300 text-sm mb-6 max-w-md mx-auto">
              If you're an existing customer with an urgent operational issue, submit a ticket from your workspace for priority handling.
            </p>
            <Link to="/workspace">
              <Button className="bg-marketing-gold hover:bg-marketing-gold/90 text-marketing-bg text-sm font-semibold px-6 h-10 rounded-lg">
                Open Workspace
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </PublicFoundationLayout>
  );
}