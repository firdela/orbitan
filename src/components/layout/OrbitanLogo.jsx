import React from 'react';

export default function OrbitanLogo({ size = 'md', variant = 'dark', showOS = false }) {
  const sizes = {
    xs: { icon: 20, text: 'text-sm', sub: 'text-[9px]' },
    sm: { icon: 26, text: 'text-base', sub: 'text-[10px]' },
    md: { icon: 32, text: 'text-xl', sub: 'text-[11px]' },
    lg: { icon: 42, text: 'text-2xl', sub: 'text-xs' },
    xl: { icon: 56, text: 'text-4xl', sub: 'text-sm' },
  };
  const s = sizes[size] || sizes.md;
  const isLight = variant === 'light';

  return (
    <div className="flex items-center gap-2.5">
      {/* Icon mark */}
      <div
        className="relative flex-shrink-0 rounded-xl flex items-center justify-center orbitan-gradient shadow-sm"
        style={{ width: s.icon, height: s.icon }}
      >
        {/* O ring */}
        <svg viewBox="0 0 32 32" fill="none" style={{ width: s.icon * 0.75, height: s.icon * 0.75 }}>
          <circle cx="16" cy="16" r="10" stroke="white" strokeWidth="3" fill="none" opacity="0.9"/>
          <circle cx="16" cy="6.5" r="3" fill="white"/>
          <line x1="16" y1="9.5" x2="16" y2="22.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/>
        </svg>
      </div>
      {/* Wordmark */}
      <div className="flex flex-col leading-none">
        <span className={`font-display font-bold tracking-tight ${s.text} ${isLight ? 'text-white' : 'text-foreground'}`}>
          Orbitan{showOS && <span className={`font-light ml-0.5 ${isLight ? 'text-white/70' : 'text-muted-foreground'}`}>OS</span>}
        </span>
        {showOS && (
          <span className={`${s.sub} font-body tracking-wider uppercase ${isLight ? 'text-white/50' : 'text-muted-foreground'}`}>
            Workforce Operating System
          </span>
        )}
      </div>
    </div>
  );
}