import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, ShieldX, Eye, Ghost, CheckCircle, Clock, ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const OUTCOME_CONFIG = {
  blocked: {
    label: 'Hard Block',
    color: 'text-red-700 bg-red-50 border-red-200',
    icon: ShieldX,
    dot: 'bg-red-500',
  },
  notify: {
    label: 'Soft Notify',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    icon: Eye,
    dot: 'bg-amber-500',
  },
  override_requested: {
    label: 'Override Requested',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    icon: ChevronRight,
    dot: 'bg-blue-500',
  },
  override_approved: {
    label: 'Override Approved',
    color: 'text-green-700 bg-green-50 border-green-200',
    icon: CheckCircle,
    dot: 'bg-green-500',
  },
  override_denied: {
    label: 'Override Denied',
    color: 'text-slate-700 bg-slate-50 border-slate-200',
    icon: ShieldX,
    dot: 'bg-slate-500',
  },
  pass: {
    label: 'Passed',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    icon: CheckCircle,
    dot: 'bg-emerald-500',
  },
};

function isShadowAudit(entry) {
  return entry.action_type?.includes('shadow') ||
    entry.new_state?.shadow_audit === true;
}

export default function ShieldActivityFeed({ maxResults = 50 }) {
  const [outcomeFilter, setOutcomeFilter] = useState('all');

  const { data: entries, isLoading } = useQuery({
    queryKey: ['shieldActivity', outcomeFilter, maxResults],
    queryFn: async () => {
      const filter = outcomeFilter === 'all'
        ? { shield_outcome: { $ne: 'not_evaluated' } }
        : { shield_outcome: outcomeFilter };
      const result = await base44.entities.AuditLog.filter(filter, '-created_date', maxResults);
      return result || [];
    },
  });

  const all = entries || [];
  const stats = {
    blocks: all.filter((e) => e.shield_outcome === 'blocked').length,
    shadowAudits: all.filter(isShadowAudit).length,
    notifies: all.filter((e) => e.shield_outcome === 'notify').length,
    overrides: all.filter((e) => e.shield_outcome?.startsWith('override')).length,
  };

  return (
    <div className="space-y-4">
      {/* Mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <ShieldX className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-xs text-red-900/70">Hard Blocks</p>
                <p className="text-lg font-display font-bold text-red-900">{stats.blocks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Ghost className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-xs text-purple-900/70">Shadow Audits</p>
                <p className="text-lg font-display font-bold text-purple-900">{stats.shadowAudits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-600" />
              <div>
                <p className="text-xs text-amber-900/70">Soft Notifies</p>
                <p className="text-lg font-display font-bold text-amber-900">{stats.notifies}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-blue-900/70">Overrides</p>
                <p className="text-lg font-display font-bold text-blue-900">{stats.overrides}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Shield Evaluation Stream</h3>
        </div>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Filter by outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            <SelectItem value="blocked">Hard blocks</SelectItem>
            <SelectItem value="notify">Soft notifies</SelectItem>
            <SelectItem value="override_requested">Override requested</SelectItem>
            <SelectItem value="override_approved">Override approved</SelectItem>
            <SelectItem value="override_denied">Override denied</SelectItem>
            <SelectItem value="pass">Passed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading shield activity...</div>
      ) : all.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <ShieldX className="h-6 w-6 mx-auto mb-2 opacity-40" />
            No shield evaluations recorded yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {all.map((entry) => {
            const shadow = isShadowAudit(entry);
            const cfg = OUTCOME_CONFIG[entry.shield_outcome] || OUTCOME_CONFIG.pass;
            const Icon = cfg.icon;
            const domain = entry.new_state?.governance_domain || entry.new_state?.product_context?.governance_domain;

            return (
              <Card key={entry.id} className={`border ${shadow ? 'border-purple-200 bg-purple-50/30' : ''}`}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${cfg.color}`}>
                      {shadow ? <Ghost className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                          {shadow ? 'Shadow Audit' : cfg.label}
                        </Badge>
                        {entry.policy_name && (
                          <span className="text-xs font-medium text-foreground truncate">
                            {entry.policy_name}
                          </span>
                        )}
                        {domain && (
                          <Badge variant="ghost" className="text-xs text-blue-700">
                            {domain}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {entry.details || `${entry.action_type} on ${entry.target_entity}`}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(entry.created_date).toLocaleString('en-SG', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                        <span>{entry.target_entity}</span>
                        {entry.new_state?.actor_type === 'agent' && (
                          <Badge variant="outline" className="text-xs text-purple-700 border-purple-200">
                            agent: {entry.new_state.agent_name || 'unknown'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}