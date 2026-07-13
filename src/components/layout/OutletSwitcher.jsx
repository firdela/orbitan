import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useGlobalOutlet, SCOPE_ALL } from '@/lib/GlobalOutletContext';
import { ChevronDown, Store, Check, Globe } from 'lucide-react';

export default function OutletSwitcher({ tenant }) {
  const { activeScope, activeOutlet, switchToOutlet, switchToGlobal, setOutlets } = useGlobalOutlet();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const { data: outlets = [] } = useQuery({
    queryKey: ['outlet-switcher', tenant?.id],
    queryFn: () => base44.entities.Outlet.filter({ tenant_id: tenant.id }),
    enabled: !!tenant?.id,
  });

  // Sync outlets into the global context so all pages can filter by active outlet
  useEffect(() => {
    if (outlets.length > 0) setOutlets(outlets);
  }, [outlets, setOutlets]);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayName = activeScope === SCOPE_ALL
    ? 'All Outlets'
    : activeOutlet?.name || 'All Outlets';

  // Don't render if no outlets
  if (!outlets || outlets.length === 0) return null;

  return (
    <div ref={ref} className="relative px-3 py-2 border-b border-sidebar-border/40">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors text-left"
      >
        <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center flex-shrink-0">
          {activeScope === SCOPE_ALL ? (
            <Globe className="w-3.5 h-3.5 text-primary" />
          ) : (
            <Store className="w-3.5 h-3.5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold">Outlet Scope</p>
          <p className="text-xs font-medium text-sidebar-foreground truncate">{displayName}</p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-sidebar-foreground/40 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50 max-h-64 overflow-y-auto">
          <button
            type="button"
            onClick={() => { switchToGlobal(); setOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-accent transition-colors ${
              activeScope === SCOPE_ALL ? 'bg-accent' : ''
            }`}
          >
            <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="flex-1 text-sm text-foreground">All Outlets</span>
            {activeScope === SCOPE_ALL && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
          </button>
          {outlets.map(outlet => (
            <button
              key={outlet.id}
              type="button"
              onClick={() => { switchToOutlet(outlet.id); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-accent transition-colors border-t border-border/40 ${
                activeScope === outlet.id ? 'bg-accent' : ''
              }`}
            >
              <Store className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{outlet.name}</p>
                {outlet.address && (
                  <p className="text-[10px] text-muted-foreground truncate">{outlet.address}</p>
                )}
              </div>
              {activeScope === outlet.id && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}