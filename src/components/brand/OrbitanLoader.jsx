// ============================================================
// ORBITAN — Global Brand Loader
// The spinning 6-R disc that represents the OrbitanOS
// Operating Cycle: Renew · Relate · Respond · Refine · Regulate · Reach
// EXIT-READY: Pure CSS animation, zero dependencies.
// ============================================================

import React from 'react';
import { cn } from '@/lib/utils';

const LOGO_URL = 'https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39/4fb495aab_OrbitonLogowebsite.png';

// The 6R principle colours for the orbit ring segments
const R_COLORS = [
  '#3B82F6', // Renew    — Orbit Blue
  '#10B981', // Relate   — Growth Emerald
  '#F97316', // Respond  — F&B Orange
  '#8B5CF6', // Refine   — Business Violet
  '#D4AF37', // Regulate — Enterprise Gold
  '#06B6D4', // Reach    — Cyan
];

export default function OrbitanLoader({
  size = 'md',       // sm | md | lg | fullscreen
  message = null,
  className,
}) {
  const sizeMap = {
    sm:         { outer: 40,  logo: 18, ring: 3,   text: 'text-xs' },
    md:         { outer: 72,  logo: 32, ring: 4,   text: 'text-sm' },
    lg:         { outer: 100, logo: 44, ring: 5,   text: 'text-base' },
    fullscreen: { outer: 96,  logo: 42, ring: 5,   text: 'text-sm' },
  };

  const s = sizeMap[size] || sizeMap.md;
  const isFullscreen = size === 'fullscreen';

  const loader = (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* The spinning 6-R orbit ring */}
      <div
        className="relative flex items-center justify-center flex-shrink-0"
        style={{ width: s.outer, height: s.outer }}
      >
        {/* Orbit ring built from 6 colour-segment arcs via SVG */}
        <svg
          width={s.outer}
          height={s.outer}
          viewBox={`0 0 ${s.outer} ${s.outer}`}
          className="absolute inset-0 animate-spin"
          style={{ animationDuration: '2s', animationTimingFunction: 'linear' }}
        >
          {R_COLORS.map((color, i) => {
            const segments = 6;
            const gap = 4; // degrees gap between segments
            const segmentDeg = 360 / segments - gap;
            const startDeg = i * (360 / segments);
            const cx = s.outer / 2;
            const cy = s.outer / 2;
            const r = s.outer / 2 - s.ring / 2 - 2;

            const toRad = (deg) => (deg * Math.PI) / 180;
            const x1 = cx + r * Math.cos(toRad(startDeg - 90));
            const y1 = cy + r * Math.sin(toRad(startDeg - 90));
            const x2 = cx + r * Math.cos(toRad(startDeg + segmentDeg - 90));
            const y2 = cy + r * Math.sin(toRad(startDeg + segmentDeg - 90));
            const largeArc = segmentDeg > 180 ? 1 : 0;

            return (
              <path
                key={i}
                d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
                fill="none"
                stroke={color}
                strokeWidth={s.ring}
                strokeLinecap="round"
                opacity="0.9"
              />
            );
          })}
        </svg>

        {/* Counter-rotating inner pulse ring */}
        <svg
          width={s.outer * 0.72}
          height={s.outer * 0.72}
          viewBox={`0 0 ${s.outer * 0.72} ${s.outer * 0.72}`}
          className="absolute animate-spin"
          style={{ animationDuration: '3s', animationTimingFunction: 'linear', animationDirection: 'reverse' }}
        >
          <circle
            cx={s.outer * 0.36}
            cy={s.outer * 0.36}
            r={s.outer * 0.36 - s.ring / 2 - 2}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={s.ring * 0.5}
            strokeDasharray={`${s.ring * 2} ${s.ring * 4}`}
            strokeLinecap="round"
            opacity="0.35"
          />
        </svg>

        {/* Static Orbitan logo in center */}
        <img
          src={LOGO_URL}
          alt="Orbitan"
          width={s.logo}
          height={s.logo}
          className="relative z-10 object-contain drop-shadow-sm"
        />
      </div>

      {/* Message */}
      {message && (
        <div className="text-center">
          <p className={cn('font-body text-muted-foreground animate-pulse', s.text)}>
            {message}
          </p>
        </div>
      )}

      {/* Subtle brand text for fullscreen */}
      {isFullscreen && (
        <div className="text-center mt-1">
          <p className="text-[11px] font-display font-semibold text-foreground tracking-wide">
            Orbitan<span className="text-muted-foreground font-light">OS</span>
          </p>
          <p className="text-[9px] text-muted-foreground tracking-[0.15em] uppercase mt-0.5">
            Operating System
          </p>
        </div>
      )}
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        {loader}
      </div>
    );
  }

  return loader;
}