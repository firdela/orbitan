import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const INTEGRATIONS = [
  { name: 'Xero', category: 'Finance', color: '#13B5EA', letter: 'X' },
  { name: 'Stripe', category: 'Payments', color: '#635BFF', letter: 'S' },
  { name: 'QuickBooks', category: 'Finance', color: '#2CA01C', letter: 'Q' },
  { name: 'Slack', category: 'Comms', color: '#E01E5A', letter: '#' },
  { name: 'WhatsApp', category: 'Comms', color: '#25D366', letter: 'W' },
  { name: 'Google Workspace', category: 'Productivity', color: '#4285F4', letter: 'G' },
  { name: 'Shopify', category: 'Commerce', color: '#7AB55C', letter: 'S' },
  { name: 'Microsoft 365', category: 'Productivity', color: '#F25022', letter: 'M' },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
};

export default function IntegrationHubSection() {
  const [hovered, setHovered] = useState(null);

  return (
    <section id="connect" className="py-20 md:py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div {...fadeUp} className="text-center mb-14">
          <p className="text-xs tracking-[0.2em] uppercase text-marketing-blue font-bold mb-3">
            Orbit Connect
          </p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-white">
            Your Stack, Connected.
          </h2>
          <p className="text-slate-300 max-w-xl mx-auto text-sm leading-relaxed">
            Orbitan isn't a walled garden. Connect the tools you already use —
            finance, payments, communication, and commerce — into one unified operating system.
          </p>
        </motion.div>

        {/* Integration grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {INTEGRATIONS.map((int, i) => (
            <motion.div
              key={int.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              onMouseEnter={() => setHovered(int.name)}
              onMouseLeave={() => setHovered(null)}
              className="group relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300 cursor-default"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 font-display font-bold text-lg transition-transform duration-300 group-hover:scale-110"
                style={{
                  backgroundColor: `${int.color}18`,
                  color: int.color,
                }}
              >
                {int.letter}
              </div>
              <h4 className="font-display font-semibold text-white text-sm">{int.name}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5 tracking-wide uppercase">{int.category}</p>
            </motion.div>
          ))}
        </div>

        {/* Value proposition bar */}
        <motion.div
          {...fadeUp}
          className="bg-gradient-to-r from-white/[0.04] to-white/[0.02] border border-white/[0.08] rounded-2xl p-6 md:p-8"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="font-display font-bold text-white text-lg mb-2">
                Two-way sync. Zero data silos.
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed max-w-md">
                Invoices push to Xero automatically. Payments sync from Stripe in real-time.
                Purchase orders, payroll, and reconciliation — all connected through the Orbit Nexus Integration Hub.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 flex-shrink-0">
              {['OAuth-secured connectors', 'Real-time sync queue', 'ERP-agnostic architecture'].map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-xs text-slate-200">
                  <Check className="w-3.5 h-3.5 flex-shrink-0 text-marketing-blue" />
                  {feat}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}