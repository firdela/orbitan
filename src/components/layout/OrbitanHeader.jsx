import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Integrated Orbitan logo — icon + wordmark as single asset
const INTEGRATED_LOGO_URL = 'https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39/98e374e08_generated_image.png';

// Fallback: icon-only mark for compact views
const LOGO_MARK_URL = 'https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39/7b205f7ab_Orbitan_3d_logo_transparent.png';

const NAV_LINKS = [
  { href: '#framework', label: 'Framework' },
  { href: '#packs', label: 'Packs' },
  { href: '#stories', label: 'Stories' },
  { href: '#plans', label: 'Plans' },
  { href: '#shield', label: 'Security' },
];

export default function OrbitanHeader({
  variant = 'dark',      // 'dark' (on dark bg) | 'light' (on light bg)
  transparent = true,     // start transparent, get solid on scroll
  showNav = true,         // show public nav links (for Landing)
  className,
}) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const isLight = variant === 'light';

  useEffect(() => {
    if (!transparent) { setScrolled(true); return; }
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [transparent]);

  const isLanding = location.pathname === '/';

  return (
    <nav
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300 h-16',
        scrolled
          ? isLight
            ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/60'
            : 'bg-[#0A0F1A]/95 backdrop-blur-md border-b border-white/[0.06]'
          : 'bg-transparent',
        className,
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        {/* Logo — integrated wordmark on landing, mark-only elsewhere */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
          {isLanding ? (
            <img
              src={INTEGRATED_LOGO_URL}
              alt="Orbitan"
              className="h-8 w-auto object-contain"
            />
          ) : (
            <>
              <img
                src={LOGO_MARK_URL}
                alt="Orbitan"
                className="w-7 h-7 object-contain drop-shadow-sm"
              />
              <span
                className="font-display font-bold tracking-tight text-sm"
                style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}
              >
                Orbitan
              </span>
            </>
          )}
        </Link>

        {/* Desktop nav links (Landing only) */}
        {showNav && isLanding && (
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  'text-xs font-medium transition-colors',
                  isLight
                    ? 'text-slate-500 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white',
                )}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}

        {/* CTA / Workspace button */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {isAuthenticated ? (
            <Link to="/workspace">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'text-xs font-bold px-5 h-9 rounded-lg',
                  isLight
                    ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    : 'border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10',
                )}
              >
                Workspace
              </Button>
            </Link>
          ) : (
            <Link to="/auth/gateway">
              <Button
                size="sm"
                className={cn(
                  'text-xs font-bold px-5 h-9 rounded-lg',
                  isLight
                    ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
                    : 'bg-[#D4AF37] hover:bg-[#C09C2E] text-[#0A0F1A]',
                )}
              >
                Join Orbitan
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}