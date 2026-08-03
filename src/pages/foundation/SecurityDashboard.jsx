import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Lock, Eye, Activity, Ban, Clock, CheckCircle, XCircle } from 'lucide-react';
import BackBar from '@/components/shared/BackBar';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const SECURITY_EVENTS = [
  { id: 1, timestamp: '2026-07-31 17:15:22', type: 'failed_login', severity: 'warning', user: 'unknown@example.com', ip: '203.0.113.42', action: 'Failed login attempt (3rd)', resolved: false },
  { id: 2, timestamp: '2026-07-31 16:45:10', type: 'role_change', severity: 'info', user: 'admin@orbitan.net', ip: '198.51.100.1', action: 'Promoted user to outlet_manager', resolved: true },
  { id: 3, timestamp: '2026-07-31 15:30:00', type: 'shield_block', severity: 'critical', user: 'worker@taqueria.sg', ip: '198.51.100.5', action: 'Shield blocked: attempted delete on locked payroll record', resolved: true },
  { id: 4, timestamp: '2026-07-31 14:20:33', type: 'suspicious_activity', severity: 'warning', user: 'user@renewed.sg', ip: '203.0.113.99', action: 'Multiple rapid API calls detected (rate limit warning)', resolved: false },
  { id: 5, timestamp: '2026-07-31 12:00:00', type: 'session_expired', severity: 'info', user: 'manager@orbitan.net', ip: '198.51.100.2', action: 'Session expired and refreshed', resolved: true },
];

const SEVERITY_CONFIG = {
  info: { label: 'Info', color: 'text-blue-500', bg: 'bg-blue-50', icon: Activity },
  warning: { label: 'Warning', color: 'text-amber-500', bg: 'bg-amber-50', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'text-red-500', bg: 'bg-red-50', icon: Ban },
};

export default function SecurityDashboard() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuditLogs = async () => {
      try {
        const logs = await base44.entities.AuditLog.list('-created_date', 20);
        setAuditLogs(logs || []);
      } catch {
        setAuditLogs([]);
      } finally {
        setLoading(false);
      }
    };
    loadAuditLogs();
  }, []);

  const failedLogins = SECURITY_EVENTS.filter(e => e.type === 'failed_login').length;
  const shieldBlocks = SECURITY_EVENTS.filter(e => e.type === 'shield_block').length;
  const unresolved = SECURITY_EVENTS.filter(e => !e.resolved).length;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <BackBar to="/leader-org" label="Back to Platform Console" />
      <PageHeader
        title="Security Dashboard"
        subtitle="Security events, failed logins, suspicious activity, session monitoring, and threat indicators."
      />

      {/* Security KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Failed Logins (24h)', value: failedLogins, icon: Lock, color: 'text-amber-500' },
          { label: 'Shield Blocks', value: shieldBlocks, icon: Ban, color: 'text-red-500' },
          { label: 'Unresolved Alerts', value: unresolved, icon: AlertTriangle, color: 'text-orange-500' },
          { label: 'Security Health', value: 'Good', icon: CheckCircle, color: 'text-emerald-500' },
        ].map((stat, i) => (
          <motion.div key={stat.label} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.05 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Security Events */}
        <motion.div {...fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Security Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {SECURITY_EVENTS.map((event) => {
                  const config = SEVERITY_CONFIG[event.severity];
                  return (
                    <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors">
                      <div className={`w-7 h-7 rounded-md ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <config.icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] h-5">{event.type.replace(/_/g, ' ')}</Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">{event.timestamp}</span>
                          {event.resolved ? (
                            <Badge className="text-[10px] h-5 bg-emerald-500"><CheckCircle className="w-3 h-3 mr-0.5" />Resolved</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] h-5"><Clock className="w-3 h-3 mr-0.5" />Open</Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground mt-1 leading-snug">{event.action}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{event.user} · {event.ip}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Audit Log (Shield outcomes) */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" /> Recent Governance Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading audit trail...</p>
              ) : auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No governance events recorded.</p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.slice(0, 10).map((log) => (
                    <div key={log.id} className="p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="text-[10px] h-5">{log.shield_outcome || 'not_evaluated'}</Badge>
                        {log.severity && <Badge variant="outline" className={`text-[10px] h-5 ${log.severity === 'critical' ? 'text-red-500' : log.severity === 'warning' ? 'text-amber-500' : 'text-blue-500'}`}>{log.severity}</Badge>}
                      </div>
                      <p className="text-sm text-foreground leading-snug">{log.details || `${log.action_type} on ${log.target_entity}`}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{log.actor_name || 'System'} · {log.module}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}