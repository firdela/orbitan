import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Shield, Zap, Wallet, ArrowRightLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';

const PACK_COLORS = {
  fnb: '#F97316',
  recycling: '#16A34A',
  retail: '#22C55E',
};

export default function TenantPilotCard({ tenant, onToggleAutopilot, onToggleShadowSync }) {
  const pack = tenant.industry_pack || 'fnb';
  const packColor = PACK_COLORS[pack] || '#2563EB';
  const isHealthy = (tenant.issues || 0) === 0;

  return (
    <Card className="border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Colored top stripe */}
      <div className="h-1.5 w-full" style={{ backgroundColor: packColor }} />
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold font-heading">{tenant.name}</CardTitle>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
              {tenant.industry_label || 'F&B'} · {tenant.plan || 'Starter'}
            </p>
          </div>
          <Badge variant={isHealthy ? 'outline' : 'destructive'} className={`text-[10px] px-2 py-0.5 ${isHealthy ? 'border-green-300 text-green-600 bg-green-50' : ''}`}>
            {isHealthy ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
            {isHealthy ? 'Healthy' : 'Needs Attention'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vital Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted rounded-xl p-2.5 text-center">
            <Wallet className="w-3.5 h-3.5 text-orbitan-blue mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Credits</p>
            <p className="text-sm font-bold font-mono">{tenant.balance_credits || 0}</p>
          </div>
          <div className="bg-muted rounded-xl p-2.5 text-center">
            <ArrowRightLeft className="w-3.5 h-3.5 text-orbitan-purple mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-sm font-bold font-mono">{tenant.pending_syncs || 0}</p>
          </div>
          <div className="bg-muted rounded-xl p-2.5 text-center">
            <AlertTriangle className={`w-3.5 h-3.5 mx-auto mb-1 ${(tenant.issues || 0) > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
            <p className="text-xs text-muted-foreground">Issues</p>
            <p className={`text-sm font-bold font-mono ${(tenant.issues || 0) > 0 ? 'text-red-500' : ''}`}>{tenant.issues || 0}</p>
          </div>
        </div>

        {/* Autopilot Status */}
        <div className="bg-muted/50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${tenant.autopilot_active ? 'bg-green-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-xs font-semibold">Autopilot</span>
            </div>
            <Switch
              checked={tenant.autopilot_active !== false}
              onCheckedChange={() => onToggleAutopilot?.(tenant.id)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-xs font-semibold">Shadow Sync</span>
            </div>
            <Switch
              checked={tenant.shadow_sync_active || false}
              onCheckedChange={() => onToggleShadowSync?.(tenant.id)}
            />
          </div>
        </div>

        {/* Xero Sync Stats */}
        <div className="flex items-center justify-between text-xs border-t border-border pt-3">
          <span className="text-muted-foreground">Finance Sync</span>
          <span className="font-mono font-semibold">
            <span className="text-green-600">{tenant.synced_count || 0}</span>
            <span className="text-muted-foreground"> / {tenant.total_docs || 0}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}