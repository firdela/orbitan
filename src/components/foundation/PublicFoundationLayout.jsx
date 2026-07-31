import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import OrbitanWordmark from '@/components/brand/OrbitanWordmark';
import { useAuth } from '@/lib/AuthContext';
import { LOGO_ASSETS } from '@/lib/orbitan-identity';
import { PLATFORM_IDENTITY } from '@/lib/orbitan-config';

const FOOTER_LINKS = [
  { label: 'About', to: '/about-orbitan' },
  { label: 'Legal', to: '/legal' },
  { label: 'Support', to: '/support' },
  { label: 'Status', to: '/status' },
  { label: 'Governance', to: '/governance' },
  { label: 'Security', to: '/governance' },
  { label: 'Pricing', to: '/checkout' },
];

export default function PublicFoundationLayout({ children, activeTab }) {
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-marketing-bg text-white overflow-x-hidden flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-marketing-gold focus:text-marketing-bg focus:rounded-md focus:shadow">
        Skip to main content
      </a>
      <nav aria-label="Main" className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 pt-[env(safe-area-inset-top)] ${scrolled ? 'bg-marketing-bg/95 backdrop-blur-md border-b border-white/[0.06]' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <OrbitanWordmark size="sm" variant="light" showOS={false} />
          </Link>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link to="/workspace">
                <Button variant="outline" className="border-marketing-gold/30 text-marketing-gold hover:bg-marketing-gold/10 text-xs font-bold px-5 h-9 rounded-lg">
                  Workspace
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth/gateway">
                  <Button variant="outline" className="border-white/20 text-white/80 hover:bg-white/10 text-xs font-bold px-4 h-9 rounded-lg">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth/gateway">
                  <Button className="bg-marketing-gold hover:bg-marketing-gold/90 text-marketing-bg text-xs font-bold px-5 h-9 rounded-lg">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main id="main-content" className="flex-1 pt-16">
        {children}
      </main>

      <footer className="py-10 px-6 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={LOGO_ASSETS.mark3D} alt="Orbitan" className="w-5 h-5 opacity-50" />
            <span className="text-xs text-slate-300">{PLATFORM_IDENTITY.copyright}</span>
          </div>
          <div className="flex items-center gap-5 flex-wrap justify-center">
            {FOOTER_LINKS.map((link) => (
              <Link key={link.label} to={link.to} className="text-xs text-slate-300 hover:text-white transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}