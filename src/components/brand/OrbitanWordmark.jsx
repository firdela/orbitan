import React from 'react';
import { LOGO_ASSETS } from '@/lib/orbitan-identity';

const SIZES = {
  xs: { icon: 16, text: 'text-[11px]', sub: 'text-[7px]' },
  sm: { icon: 22, text: 'text-sm',     sub: 'text-[8px]' },
  md: { icon: 28, text: 'text-base',   sub: 'text-[9px]' },
  lg: { icon: 38, text: 'text-xl',     sub: 'text-[10px]' },
  xl: { icon: 50, text: 'text-2xl',    sub: 'text-xs' },
};

/**
 * OrbitanWordmark
 * Primary brand: "Orbitan" (prominent)
 * Technical context: "OS" / "Operating System" (secondary, when showOS=true)
 *
 * Usage guideline:
 * - Public-facing pages (Landing, AuthGateway): showOS=false, Orbitan-first
 * - Dashboard / console headers: showOS=true, "OrbitanOS" for technical context
 * - Mobile / tight spaces: size="sm"
 */
export default function OrbitanWordmark({ size = 'md', variant = 'light', showOS = false, className = '' }) {
  const s = SIZES[size] || SIZES.md;
  const isLight = variant === 'light';

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <img
        src={LOGO_ASSETS.mark3D}
        alt="Orbitan"
        width={s.icon}
        height={s.icon}
        className="flex-shrink-0 object-contain"
      />
      <div className="flex flex-col leading-none">
        <span
          className={`font-display font-bold tracking-tight ${s.text}`}
          style={{ color: isLight ? '#FFFFFF' : '#0F172A' }}
        >
          Orbitan
          {showOS && (
            <span className="font-light ml-[3px]" style={{ color: isLight ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.35)' }}>
              OS
            </span>
          )}
        </span>
        {showOS && (
          <span className={`${s.sub} font-body tracking-[0.12em] uppercase mt-0.5`}
            style={{ color: isLight ? 'rgba(255,255,255,0.25)' : 'rgba(15,23,42,0.3)' }}>
            Operating System
          </span>
        )}
      </div>
    </div>
  );
}