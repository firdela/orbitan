import React from 'react';
import { Link } from 'react-router-dom';
import BackBar from '@/components/shared/BackBar';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rocket, CheckCircle2, Clock, FlaskConical, ArrowRight, Lightbulb } from 'lucide-react';

const STATUS_CONFIG = {
  now: { label: 'Now', icon: Rocket, color: 'bg-orbitan-blue-light text-orbitan-blue-700', dot: 'bg-orbitan-blue' },
  next: { label: 'Next', icon: Clock, color: 'bg-orbitan-purple-light text-orbitan-purple-700', dot: 'bg-orbitan-purple' },
  later: { label: 'Later', icon: Clock, color: 'bg-orbitan-amber-light text-orbitan-amber-700', dot: 'bg-orbitan-amber' },
  research: { label: 'Research', icon: FlaskConical, color: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'bg-orbitan-green-light text-orbitan-green-700', dot: 'bg-orbitan-green' },
};

const ROADMAP = [
  {
    status: 'now',
    items: [
      { title: 'Pilot Go-Live Hardening', desc: 'Final RBAC/RLS validation, navigation hardening, and button workflow verification for RC1.', deps: ['RBAC audit', 'Navigation hardening'] },
      { title: 'Foundation Pages', desc: 'About, Legal, Support, Status, Governance, Change Log — all public and admin foundation pages live.', deps: [] },
      { title: 'Data Export & System Activity', desc: 'Secure tenant-scoped data export and chronological activity feed.', deps: ['exportData function'] },
    ],
  },
  {
    status: 'next',
    items: [
      { title: 'Compliance Dashboard', desc: 'Unified compliance score, expiring documents, and corrective actions tracking.', deps: ['ComplianceRecord entity'] },
      { title: 'Subscription Management', desc: 'Self-serve plan management, billing history, and Stripe customer portal integration.', deps: ['Stripe billing'] },
      { title: 'Integration Health Centre', desc: 'Centralised health view for Xero, Stripe, email, and storage integrations with reconnect flows.', deps: ['Integration Hub'] },
    ],
  },
  {
    status: 'later',
    items: [
      { title: 'Blueprint Studio', desc: 'Visual tenant blueprint designer with drag-and-drop module configuration.', deps: ['Capability Manager'] },
      { title: 'Universal Search', desc: 'Cross-module global search with role-aware results and deep linking.', deps: [] },
      { title: 'AI Everywhere', desc: 'Embedded Nexus intelligence across all operational modules with contextual suggestions.', deps: ['Nexus Intelligence'] },
      { title: 'Orbit Command Center', desc: 'Unified operational command center with real-time KPIs and anomaly alerts.', deps: ['Operational Health'] },
    ],
  },
  {
    status: 'research',
    items: [
      { title: 'Industry Pack Expansion', desc: 'Healthcare, Education, and Logistics industry packs with specialised workflows.', deps: [] },
      { title: 'Mobile Optimisation', desc: 'Native-grade mobile experience with offline-first capabilities and push notifications.', deps: [] },
      { title: 'Public Launch', desc: 'Marketing site, self-serve onboarding, and public marketplace for module discovery.', deps: ['MVP validation'] },
    ],
  },
  {
    status: 'completed',
    items: [
      { title: 'Core Platform', desc: 'Auth, RBAC, tenant isolation, and manifest-driven navigation.', deps: [] },
      { title: 'Workforce Module', desc: 'Clock-in/out, scheduling, timesheets, and payroll snapshots.', deps: [] },
      { title: 'Inventory & Procurement', desc: 'Stock management, POs, goods receipts, and supplier management.', deps: [] },
      { title: 'F&B Production', desc: 'Recipe management, production batches, and ingredient consumption.', deps: [] },
      { title: 'Sales & Finance', desc: 'Sales invoices, daily reconciliation, and Xero integration.', deps: [] },
      { title: 'Nexus Intelligence', desc: 'AI-driven insights, anomaly detection, and daily briefings.', deps: [] },
      { title: 'Orbit Inbox', desc: 'Unified operational inbox with actionable items and notification preferences.', deps: [] },
      { title: 'Audit Centre', desc: 'Global activity timeline with severity, category, and source classification.', deps: [] },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <BackBar to="/" label="Back to Home" breadcrumb={[{ label: 'Roadmap' }]} />

      <PageHeader
        title="Platform Roadmap"
        subtitle="What we're building now, next, and later — no false promises"
        help={{ title: 'Roadmap', content: 'This roadmap reflects actual development priorities. Statuses are truthfully represented — no fabricated completion percentages.' }}
      />

      <div className="space-y-8">
        {ROADMAP.map(section => {
          const cfg = STATUS_CONFIG[section.status];
          const Icon = cfg.icon;
          return (
            <div key={section.status}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                  <Icon className="w-3.5 h-3.5" /> {cfg.label}
                </span>
                <span className="text-xs text-muted-foreground">({section.items.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {section.items.map((item, i) => (
                  <Card key={i} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <span className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0 mt-1.5`} />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                          {item.deps.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              <span className="text-[10px] text-muted-foreground/70">Depends on:</span>
                              {item.deps.map(d => <Badge key={d} variant="outline" className="text-[9px] h-4">{d}</Badge>)}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Lightbulb className="w-5 h-5 text-orbitan-amber shrink-0" />
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Have feedback?</span>{' '}
            <Link to="/support" className="text-primary hover:underline">Contact support</Link>
            {' '}or{' '}
            <Link to="/platform/change-log" className="text-primary hover:underline">view the change log</Link>
            {' '}for release history.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}