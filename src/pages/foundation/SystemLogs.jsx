import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScrollText, Filter, Search, AlertTriangle, CheckCircle, Clock, XCircle, ChevronDown } from 'lucide-react';
import BackBar from '@/components/shared/BackBar';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const SAMPLE_LOGS = [
  { id: 1, timestamp: '2026-07-31 17:30:22', level: 'info', source: 'auditEngine', message: 'Audit log created for compliance_record: CR-2026-0042', duration: '12ms' },
  { id: 2, timestamp: '2026-07-31 17:28:15', level: 'success', source: 'financeSyncProcessor', message: 'Sync queue processed: 3 invoices synced to Xero', duration: '2.4s' },
  { id: 3, timestamp: '2026-07-31 17:25:08', level: 'warning', source: 'replenishmentEngine', message: 'Stock below threshold for item: Chicken Breast (2.5kg remaining)', duration: '45ms' },
  { id: 4, timestamp: '2026-07-31 17:20:01', level: 'info', source: 'notificationDispatcher', message: 'Orbit Inbox: 5 items created for shift reminder', duration: '120ms' },
  { id: 5, timestamp: '2026-07-31 17:15:44', level: 'error', source: 'xeroOAuth', message: 'Token refresh failed — credentials may need reconnection', duration: '890ms' },
  { id: 6, timestamp: '2026-07-31 17:10:30', level: 'info', source: 'taskController', message: 'Task TSK-00891 status changed: in_progress → completed', duration: '23ms' },
  { id: 7, timestamp: '2026-07-31 17:05:12', level: 'success', source: 'productionEngine', message: 'Production batch PB-2026-0015 completed: 50 servings', duration: '1.2s' },
  { id: 8, timestamp: '2026-07-31 17:00:00', level: 'info', source: 'systemSettingsWatcher', message: 'Scheduled check completed — all system settings nominal', duration: '340ms' },
];

const LEVEL_CONFIG = {
  info: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
  success: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
};

export default function SystemLogs() {
  const [logs] = useState(SAMPLE_LOGS);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  const filtered = logs.filter(l => {
    const matchesSearch = !search || l.message.toLowerCase().includes(search.toLowerCase()) || l.source.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter === 'all' || l.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <BackBar to="/leader-org" label="Back to Platform Console" />
      <PageHeader
        title="System Logs"
        subtitle="Background jobs, worker logs, system events, and application errors."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Events (24h)', value: '1,247', icon: ScrollText, color: 'text-blue-500' },
          { label: 'Errors (24h)', value: '3', icon: XCircle, color: 'text-red-500' },
          { label: 'Warnings (24h)', value: '12', icon: AlertTriangle, color: 'text-amber-500' },
          { label: 'Avg Response', value: '245ms', icon: Clock, color: 'text-emerald-500' },
        ].map((stat) => (
          <motion.div key={stat.label} {...fadeUp}>
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

      {/* Filters + Log Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base">Event Log</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-32 h-9">
                  <Filter className="w-3.5 h-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No logs match your filters.</p>
            ) : (
              filtered.map((log) => {
                const config = LEVEL_CONFIG[log.level];
                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors border border-transparent hover:border-border">
                    <div className={`w-7 h-7 rounded-md ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <config.icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] h-5 font-mono">{log.source}</Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">{log.timestamp}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">{log.duration}</span>
                      </div>
                      <p className="text-sm text-foreground mt-1 leading-snug">{log.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}