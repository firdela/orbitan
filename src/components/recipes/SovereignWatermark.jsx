import React from 'react';
import { useAuth } from '@/lib/AuthContext';

/**
 * SovereignWatermark — ADR-0026 Layer A (Foreground UI)
 *
 * A low-opacity tiled overlay displaying the current user's identity
 * and timestamp. pointer-events: none ensures it never blocks
 * interaction. It ensures any screenshot or photograph of the
 * controlled view carries forensic identity context.
 *
 * Layer B (server-side export burn-in) and Layer C (steganographic
 * metadata) are handled by the exportData function.
 */
export default function SovereignWatermark({ enabled = true, tenantName = 'OrbitanOS', className = '' }) {
  const { user } = useAuth();
  if (!enabled) return null;

  const stamp = new Date().toLocaleString('en-SG', {
    timeZone: 'Asia/Singapore',
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  const identity = user?.full_name || user?.email || 'Unknown User';

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-30 overflow-hidden select-none ${className}`}
    >
      <div
        className="absolute inset-0 flex flex-wrap items-center justify-center gap-8 opacity-[0.06]"
        style={{ transform: 'rotate(-20deg)', transformOrigin: 'center' }}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="text-[11px] font-semibold leading-tight text-foreground whitespace-nowrap">
            {tenantName} · {identity} · {stamp}
          </div>
        ))}
      </div>
    </div>
  );
}