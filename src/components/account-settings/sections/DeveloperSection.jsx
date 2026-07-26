import React from 'react';
import { KeyRound, Webhook, Link2, Info } from 'lucide-react';

export default function DeveloperSection() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Programmatic access for integrations and automation. These capabilities are on the roadmap —
        no credentials are issued yet.
      </p>
      <Planned icon={KeyRound} title="API Keys" desc="Issue and revoke personal API keys for authenticated access to OrbitanOS resources." />
      <Planned icon={Webhook} title="Webhooks" desc="Register webhook endpoints to receive platform events." />
      <Planned icon={Link2} title="Integration Credentials" desc="Manage OAuth client credentials for tenant-level integrations." />
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
        <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Secret values are never displayed after creation. This section will become active once the
          developer API backend is implemented.
        </p>
      </div>
    </div>
  );
}

function Planned({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-center gap-3 p-3 -mx-3 rounded-lg border border-dashed border-border">
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Planned</span>
    </div>
  );
}