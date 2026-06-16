import { cn } from "@/lib/utils";
import { 
  Store, Leaf, ShoppingBag, BarChart3, Shield, Brain,
  Building2, Users, Package, ClipboardCheck, Wallet, Globe
} from 'lucide-react';

const PACK_CONFIG = {
  fnb:          { color: 'bg-pack-fnb/10 text-pack-fnb border-pack-fnb/20', icon: Store, label: 'F&B' },
  retail:       { color: 'bg-pack-retail/10 text-pack-retail border-pack-retail/20', icon: ShoppingBag, label: 'Retail' },
  recycling:    { color: 'bg-pack-recycling/10 text-pack-recycling border-pack-recycling/20', icon: Leaf, label: 'Recycling' },
  sustainability: { color: 'bg-pack-recycling/10 text-pack-recycling border-pack-recycling/20', icon: Leaf, label: 'Sustainability' },
  finance:      { color: 'bg-primary/10 text-primary border-primary/20', icon: BarChart3, label: 'Finance' },
  ai:           { color: 'bg-orbitan-purple/10 text-orbitan-purple border-orbitan-purple/20', icon: Brain, label: 'AI' },
  compliance:   { color: 'bg-orbitan-red/10 text-orbitan-red border-orbitan-red/20', icon: Shield, label: 'Compliance' },
  workforce:    { color: 'bg-orbitan-amber/10 text-orbitan-amber border-orbitan-amber/20', icon: Users, label: 'Workforce' },
  inventory:    { color: 'bg-orbitan-slate/10 text-orbitan-slate border-orbitan-slate/20', icon: Package, label: 'Inventory' },
  procurement:  { color: 'bg-orbitan-blue/10 text-orbitan-blue border-orbitan-blue/20', icon: ClipboardCheck, label: 'Procurement' },
  marketplace:  { color: 'bg-orbitan-green/10 text-orbitan-green border-orbitan-green/20', icon: Wallet, label: 'Marketplace' },
  integrations: { color: 'bg-orbitan-slate-mid/10 text-orbitan-slate-mid border-orbitan-slate-mid/20', icon: Globe, label: 'Integrations' },
  core:         { color: 'bg-slate-500/10 text-slate-500 border-slate-500/20', icon: Building2, label: 'Core' },
};

export function CapabilityBadge({ type, label, size = 'sm', className }) {
  const config = PACK_CONFIG[type] || { color: 'bg-slate-500/10 text-slate-500 border-slate-500/20', icon: Building2, label: type?.toUpperCase() };
  const Icon = config.icon;
  const displayLabel = label || config.label || type?.toUpperCase();

  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border font-bold tracking-wide",
      config.color,
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-[11px]',
      className
    )}>
      {Icon && <Icon className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />}
      {displayLabel}
    </span>
  );
}

export function CapabilityStack({ packs, size = 'sm', className }) {
  if (!packs?.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {packs.map((pack) => (
        <CapabilityBadge key={typeof pack === 'string' ? pack : pack.type} type={typeof pack === 'string' ? pack : pack.type} label={pack?.label} size={size} />
      ))}
    </div>
  );
}

export default CapabilityBadge;