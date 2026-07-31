import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Bug, Wrench, AlertCircle, ArrowUpRight } from 'lucide-react';
import BackBar from '@/components/shared/BackBar';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PLATFORM_IDENTITY } from '@/lib/orbitan-config';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const CHANGELOG = [
  {
    version: 'v1.1.0',
    date: '2026-07-31',
    type: 'major',
    title: 'Audit Centre & Orbit Inbox',
    sections: [
      { type: 'feature', icon: Sparkles, items: [
        'Global Activity Timeline with severity, category, and source classification',
        'Unified Orbit Inbox — actionable items separated from activity feed',
        'Notification Template registry with tenant-overridable copy',
        'Per-user notification preferences with digest and noise filtering',
        'Compliance Snapshot Writer for tamper-evident audit bundles',
      ]},
      { type: 'improvement', icon: Wrench, items: [
        'Platform footer standardised — personal attribution removed',
        'BackBar component for consistent standalone page navigation',
        'Integration error classification utility for user-friendly Xero errors',
        'UserMenu consolidated from 10 to 7 items — Profile & Connected Accounts merged into Settings',
      ]},
    ],
  },
  {
    version: 'v1.0.9',
    date: '2026-06-30',
    type: 'minor',
    title: 'Nexus Intelligence',
    sections: [
      { type: 'feature', icon: Sparkles, items: [
        'AI-driven operational insights with evidence and source linkage',
        'Anomaly detection across operational metrics',
        'Daily and weekly briefings with deterministic + LLM synthesis',
        'Nexus Copilot — conversational AI for operational questions',
      ]},
    ],
  },
  {
    version: 'v1.0.8',
    date: '2026-06-15',
    type: 'minor',
    title: 'Finance Integration',
    sections: [
      { type: 'feature', icon: Sparkles, items: [
        'Xero OAuth integration with credential management',
        'Account mapping — OrbitanOS categories to Xero Chart of Accounts',
        'Finance sync queue processor with retry and error tracking',
        'FinanceSyncQueue entity for transactional sync state',
      ]},
      { type: 'fix', icon: Bug, items: [
        'Fixed Xero OAuth 400 error — now shows meaningful classification',
      ]},
    ],
  },
  {
    version: 'v1.0.7',
    date: '2026-05-30',
    type: 'minor',
    title: 'Production Engine',
    sections: [
      { type: 'feature', icon: Sparkles, items: [
        'F&B production batches with ingredient auto-deduction',
        'Recipe cost calculation from live inventory costs',
        'Finished-goods ledger with shelf life and expiry tracking',
      ]},
    ],
  },
  {
    version: 'v1.0.6',
    date: '2026-05-15',
    type: 'minor',
    title: 'Shield Governance',
    sections: [
      { type: 'feature', icon: Sparkles, items: [
        'Shield policy interceptor — runtime policy evaluation on all entity operations',
        'Governance override workflows with approval/denial lifecycle',
        'Forensic artifact linkage — tamper-evident audit trail',
      ]},
    ],
  },
];

const TYPE_CONFIG = {
  feature: { label: 'New', color: 'bg-emerald-50 text-emerald-600' },
  improvement: { label: 'Improved', color: 'bg-blue-50 text-blue-600' },
  fix: { label: 'Fixed', color: 'bg-amber-50 text-amber-600' },
};

const VERSION_TYPE_CONFIG = {
  major: { label: 'Major Release', color: 'bg-primary text-primary-foreground' },
  minor: { label: 'Minor Release', color: 'bg-secondary text-secondary-foreground' },
};

export default function ChangeLog() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <BackBar to="/leader-org" label="Back to Platform Console" />
      <PageHeader
        title="Change Log"
        subtitle="New features, improvements, bug fixes, and known issues across all releases."
      />

      {/* Current Version Banner */}
      <motion.div {...fadeUp} className="mb-8">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/0 border-primary/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Current Version</p>
              <p className="text-3xl font-display font-bold text-foreground">{PLATFORM_IDENTITY.version}</p>
              <p className="text-sm text-muted-foreground mt-1">{PLATFORM_IDENTITY.tagline}</p>
            </div>
            <Badge className={VERSION_TYPE_CONFIG.major.color}>
              <Sparkles className="w-3 h-3 mr-1" /> Latest
            </Badge>
          </CardContent>
        </Card>
      </motion.div>

      {/* Changelog Timeline */}
      <div className="space-y-6">
        {CHANGELOG.map((release, i) => (
          <motion.div key={release.version} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.05 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg font-mono">{release.version}</CardTitle>
                    <Badge className={VERSION_TYPE_CONFIG[release.type]?.color || VERSION_TYPE_CONFIG.minor.color}>
                      {VERSION_TYPE_CONFIG[release.type]?.label || 'Release'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{release.title}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{release.date}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {release.sections.map((section, si) => (
                    <div key={si}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`text-[10px] h-5 ${TYPE_CONFIG[section.type].color}`}>
                          <section.icon className="w-3 h-3 mr-0.5" />{TYPE_CONFIG[section.type].label}
                        </Badge>
                      </div>
                      <ul className="space-y-1.5">
                        {section.items.map((item, ii) => (
                          <li key={ii} className="flex items-start gap-2 text-sm text-foreground">
                            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5 rotate-45" />
                            <span className="leading-snug">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Known Issues */}
      <motion.div {...fadeUp} className="mt-8">
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" /> Known Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                <span className="text-muted-foreground">Xero OAuth requires platform admin to configure XERO_CLIENT_ID and XERO_CLIENT_SECRET secrets before tenant connection is available.</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                <span className="text-muted-foreground">OTP authentication system may produce false positives in certain email delivery scenarios.</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}