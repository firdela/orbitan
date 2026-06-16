import React from 'react';

// The real Orbitan 3D logo mark
const LOGO_URL = 'https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39/4fb495aab_OrbitonLogowebsite.png';

const SIZES = {
  xs: { icon: 18, text: 'text-[13px]', sub: 'text-[8px]'  },
  sm: { icon: 24, text: 'text-[15px]', sub: 'text-[9px]'  },
  md: { icon: 32, text: 'text-[18px]', sub: 'text-[10px]' },
  lg: { icon: 44, text: 'text-[24px]', sub: 'text-xs'     },
  xl: { icon: 58, text: 'text-[32px]', sub: 'text-sm'     },
};

/**
 * OrbitanLogo
 * @param {string} size     — xs | sm | md | lg | xl
 * @param {string} variant  — 'dark' (on light bg) | 'light' (on dark bg)
 * @param {boolean} showOS  — show "OS" suffix and tagline
 */
export default function OrbitanLogo({ size = 'md', variant = 'dark', showOS = false }) {
  const s = SIZES[size] || SIZES.md;
  const isLight = variant === 'light';

  return (
    <div className="flex items-center gap-2 select-none">
      {/* Logo mark */}
      <img
        src={LOGO_URL}
        alt="Orbitan"
        width={s.icon}
        height={s.icon}
        className="flex-shrink-0 object-contain drop-shadow-sm"
      />

      {/* Wordmark */}
      <div className="flex flex-col leading-none">
        <span
          className={`font-display font-bold tracking-tight ${s.text}`}
          style={{ color: isLight ? '#FFFFFF' : 'hsl(var(--foreground))' }}
        >
          Orbitan
          {showOS && (
            <span
              className="font-light ml-[3px]"
              style={{ color: isLight ? 'rgba(255,255,255,0.55)' : 'hsl(var(--muted-foreground))' }}
            >
              OS
            </span>
          )}
        </span>
        {showOS && (
          <span
            className={`${s.sub} font-body tracking-[0.1em] uppercase mt-0.5`}
            style={{ color: isLight ? 'rgba(255,255,255,0.35)' : 'hsl(var(--muted-foreground))' }}
          >
            Operating System
          </span>
        )}
      </div>
    </div>
  );
}