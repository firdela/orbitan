import React from 'react';

const LOGO_URL = 'https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39/9673d29b5_ORBITANbluelogo.png';

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
      {/* Real Orbitan logo mark */}
      <img
        src={LOGO_URL}
        alt="Orbitan"
        style={{ width: s.icon, height: s.icon }}
        className="flex-shrink-0 object-contain"
      />
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