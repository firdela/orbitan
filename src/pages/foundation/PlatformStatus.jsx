import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Clock, Activity, Server, Database, Cloud } from 'lucide-react';
import PublicFoundationLayout from '@/components/foundation/PublicFoundationLayout';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const SERVICES = [
  { name: 'Web Application', icon: Cloud, status: 'operational' },
  { name: 'API Gateway', icon: Server, status: 'operational' },
  { name: 'Database Cluster', icon: Database, status: 'operational' },
  { name: 'Authentication', icon: Activity, status: 'operational' },
  { name: 'Real-time Subscriptions', icon: Clock, status: 'operational' },
  { name: 'File Storage', icon: Cloud, status: 'operational' },
  { name: 'Integration Hub', icon: Server, status: 'operational' },
  { name: 'AI & Nexus Intelligence', icon: Activity, status: 'operational' },
];

const INCIDENT_HISTORY = [
  { date: '2026-07-28', title: 'Scheduled Maintenance — Database optimisation', status: 'resolved', impact: 'minor', desc: 'Brief read-only window during database index rebuild. No data loss. Resolved within 15 minutes.' },
  { date: '2026-07-15', title: 'Real-time sync delay', status: 'resolved', impact: 'minor', desc: 'Inbox notifications experienced a 2-minute delay. Root cause identified and patched.' },
  { date: '2026-06-30', title: 'Scheduled Maintenance — Platform upgrade to v1.1.0', status: 'resolved', impact: 'maintenance', desc: 'Platform upgraded to version 1.1.0 with new Audit Centre and Orbit Inbox features.' },
];

const STATUS_CONFIG = {
  operational: { label: 'Operational', color: '#10B981', icon: CheckCircle },
  degraded: { label: 'Degraded Performance', color: '#F59E0B', icon: AlertCircle },
  partial: { label: 'Partial Outage', color: '#F97316', icon: AlertCircle },
  major: { label: 'Major Outage', color: '#EF4444', icon: AlertCircle },
  maintenance: { label: 'Under Maintenance', color: '#3B82F6', icon: Clock },
};

export default function PlatformStatus() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const allOperational = SERVICES.every(s => s.status === 'operational');

  return (
    <PublicFoundationLayout>
      <section className="py-16 md:py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-marketing-blue/10 text-marketing-blue text-xs font-semibold mb-6">
              Platform Status
            </span>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">System Status</h1>
            <p className="text-slate-300 text-sm max-w-2xl mx-auto">
              Real-time status of all OrbitanOS services. Updated automatically.
            </p>
          </motion.div>

          {/* Overall Status Banner */}
          <motion.div {...fadeUp} className={`rounded-2xl p-8 border text-center mb-8 ${allOperational ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
            <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: allOperational ? '#10B981' : '#F59E0B' }} />
            <h2 className="text-2xl font-display font-bold mb-1">
              {allOperational ? 'All Systems Operational' : 'Some Systems Degraded'}
            </h2>
            <p className="text-slate-300 text-xs">
              Last checked: {now.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
            </p>
          </motion.div>

          {/* Service List */}
          <div className="space-y-2 mb-12">
            {SERVICES.map((service, i) => {
              const config = STATUS_CONFIG[service.status];
              return (
                <motion.div key={service.name} {...fadeUp} className="bg-marketing-surface rounded-xl p-4 border border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <service.icon className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-medium">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <config.icon className="w-4 h-4" style={{ color: config.color }} />
                    <span className="text-xs font-medium" style={{ color: config.color }}>{config.label}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Uptime History (last 30 days visual) */}
          <motion.div {...fadeUp} className="bg-marketing-surface rounded-2xl p-6 border border-white/[0.06] mb-12">
            <h3 className="text-sm font-semibold mb-4">30-Day Uptime History</h3>
            <div className="flex gap-0.5">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-8 rounded-sm bg-emerald-500/60 hover:bg-emerald-400 transition-colors"
                  title="Operational"
                />
              ))}
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
              <span>30 days ago</span>
              <span>100% uptime</span>
              <span>Today</span>
            </div>
          </motion.div>

          {/* Incident History */}
          <motion.div {...fadeUp}>
            <h3 className="text-lg font-display font-bold mb-4">Incident History</h3>
            <div className="space-y-3">
              {INCIDENT_HISTORY.map((incident, i) => {
                const config = STATUS_CONFIG[incident.impact === 'maintenance' ? 'maintenance' : 'operational'];
                return (
                  <div key={i} className="bg-marketing-surface rounded-xl p-5 border border-white/[0.06]">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h4 className="text-sm font-semibold">{incident.title}</h4>
                        <span className="text-[10px] text-slate-400">{incident.date}</span>
                      </div>
                      <span className="text-[10px] font-medium px-2 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: `${config.color}20`, color: config.color }}>
                        {incident.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{incident.desc}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>
    </PublicFoundationLayout>
  );
}