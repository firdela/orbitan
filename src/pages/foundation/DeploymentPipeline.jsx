import React from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Rocket, CheckCircle, Clock, AlertTriangle, ArrowRight, Box, TestTube, Server, Zap } from 'lucide-react';
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

const PIPELINE_STAGES = [
  { key: 'development', label: 'Development', icon: Box, status: 'active', desc: 'Feature branches under active development', count: 3 },
  { key: 'testing', label: 'Testing', icon: TestTube, status: 'active', desc: 'Automated test suites running', count: 2 },
  { key: 'staging', label: 'Staging', icon: Server, status: 'active', desc: 'Pre-production validation', count: 1 },
  { key: 'production', label: 'Production', icon: Rocket, status: 'active', desc: 'Live environment serving all tenants', count: 1 },
];

const RELEASES = [
  { version: 'v1.1.0', date: '2026-07-15', status: 'live', title: 'Audit Centre & Orbit Inbox', notes: 'Global Activity Timeline, unified notification pipeline, compliance snapshot writer.', type: 'major' },
  { version: 'v1.0.9', date: '2026-06-30', status: 'live', title: 'Nexus Intelligence', notes: 'AI-driven operational insights, anomaly detection, daily briefings.', type: 'minor' },
  { version: 'v1.0.8', date: '2026-06-15', status: 'live', title: 'Finance Integration', notes: 'Xero OAuth, account mapping, sync queue processor.', type: 'minor' },
  { version: 'v1.0.7', date: '2026-05-30', status: 'live', title: 'Production Engine', notes: 'F&B production batches, recipe cost calculation, ingredient auto-deduction.', type: 'minor' },
  { version: 'v1.0.6', date: '2026-05-15', status: 'live', title: 'Shield Governance', notes: 'Policy interceptor, override workflows, forensic artifact linkage.', type: 'minor' },
];

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'text-emerald-500', bg: 'bg-emerald-50', icon: CheckCircle },
  live: { label: 'Live', color: 'text-emerald-500', bg: 'bg-emerald-50', icon: Rocket },
  pending: { label: 'Pending', color: 'text-amber-500', bg: 'bg-amber-50', icon: Clock },
  failed: { label: 'Failed', color: 'text-red-500', bg: 'bg-red-50', icon: AlertTriangle },
};

export default function DeploymentPipeline() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <BackBar to="/leader-org" label="Back to Platform Console" />
      <PageHeader
        title="Deployment Pipeline"
        subtitle="Development, testing, staging, and production environments with release history."
      />

      {/* Pipeline Stages */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {PIPELINE_STAGES.map((stage, i) => {
          const config = STATUS_CONFIG[stage.status];
          return (
            <motion.div key={stage.key} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.05 }}>
              <Card className="relative overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <stage.icon className="w-5 h-5 text-primary" />
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${config.color} border-0 ${config.bg}`}>
                      <config.icon className="w-3 h-3 mr-1" /> {config.label}
                    </Badge>
                  </div>
                  <h3 className="font-heading font-semibold text-sm">{stage.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{stage.desc}</p>
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">{stage.count} active {stage.count === 1 ? 'build' : 'builds'}</span>
                  </div>
                </CardContent>
                {i < PIPELINE_STAGES.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30 z-10" />
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Build Readiness */}
      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <motion.div {...fadeUp}>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <h3 className="text-sm font-semibold">Test Suite Status</h3>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">All Passing</p>
              <p className="text-xs text-muted-foreground mt-1">247 tests · 0 failures · 0 skipped</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <GitBranch className="w-4 h-4 text-blue-500" />
                </div>
                <h3 className="text-sm font-semibold">Current Branch</h3>
              </div>
              <p className="text-lg font-mono font-semibold text-foreground">main</p>
              <p className="text-xs text-muted-foreground mt-1">Last commit: 2 hours ago</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <h3 className="text-sm font-semibold">Deployment Readiness</h3>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">98%</p>
              <p className="text-xs text-muted-foreground mt-1">Ready for production deploy</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Release History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Release History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {RELEASES.map((release) => {
              const config = STATUS_CONFIG[release.status];
              const isCurrent = release.version === `v${PLATFORM_IDENTITY.version}`;
              return (
                <div key={release.version} className="flex items-start gap-4 p-4 rounded-xl border border-border hover:bg-accent/30 transition-colors">
                  <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                    <config.icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold font-mono text-foreground">{release.version}</span>
                      {isCurrent && <Badge className="text-[10px] h-5 bg-primary">Current</Badge>}
                      <Badge variant="outline" className={`text-[10px] h-5 ${config.color} border-0 ${config.bg}`}>{config.label}</Badge>
                      <span className="text-[10px] text-muted-foreground">{release.date}</span>
                      <Badge variant="secondary" className="text-[10px] h-5">{release.type}</Badge>
                    </div>
                    <h4 className="text-sm font-medium text-foreground mt-1">{release.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{release.notes}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}