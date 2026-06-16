import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus, Search, Shield, ChevronRight } from 'lucide-react';
import { SIX_R_PRINCIPLES, SHIELD_BRAND, TAGLINES, resolveTenantBrand, getTenantBackgroundTint } from '@/lib/orbitan-identity';
import SixRSequence from '@/components/brand/SixRSequence';
import OrbitanWordmark from '@/components/brand/OrbitanWordmark';

// ─────────────────────────────────────────────────────────────
// GATEWAY ENTRY CARDS
// ─────────────────────────────────────────────────────────────
const GATEWAY_CARDS = [
  {
    id: 'login',
    title: 'Sign In',
    subtitle: 'Returning member? Access your workspace.',
    icon: LogIn,
    defaultGlow: '#3B82F6',
    gradient: 'from-blue-600/15 via-blue-500/5 to-transparent',
    border: 'border-blue-500/15 hover:border-blue-400/30',
    bg: 'bg-blue-500/[0.02] hover:bg-blue-500/[0.05]',
    action: '/login',
    badge: 'Orbitan Shield™ Verified',
  },
  {
    id: 'join',
    title: 'Join Organization',
    subtitle: 'Have an invitation? Activate your account.',
    icon: UserPlus,
    defaultGlow: '#10B981',
    gradient: 'from-emerald-600/15 via-emerald-500/5 to-transparent',
    border: 'border-emerald-500/15 hover:border-emerald-400/30',
    bg: 'bg-emerald-500/[0.02] hover:bg-emerald-500/[0.05]',
    action: '/join',
    badge: 'Secure Invitation',
  },
  {
    id: 'request',
    title: 'Request Access',
    subtitle: 'New here? Find your workplace and get started.',
    icon: Search,
    defaultGlow: '#7C3AED',
    gradient: 'from-violet-600/15 via-violet-500/5 to-transparent',
    border: 'border-violet-500/15 hover:border-violet-400/30',
    bg: 'bg-violet-500/[0.02] hover:bg-violet-500/[0.05]',
    action: '/request-access',
    badge: 'Open Registration',
  },
];

// ─────────────────────────────────────────────────────────────
// AUTH GATEWAY — Intent-Aware Entry Hub
// ─────────────────────────────────────────────────────────────
export default function AuthGateway() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [phase, setPhase] = useState('boot');    // boot → shield → cards
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tenantContext, setTenantContext] = useState(null);

  // Resolve tenant context from URL params (e.g. ?org=taqueria_pte_ltd)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const org = params.get('org');
    if (org) {
      const ctx = resolveTenantBrand(org);
      if (ctx) setTenantContext(ctx);
    }
  }, []);

  // Phase sequencing
  const handleBootComplete = () => setPhase('shield');
  useEffect(() => {
    if (phase === 'shield') {
      const t = setTimeout(() => setPhase('cards'), 1600);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Redirect authenticated users
  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      navigate('/workspace', { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#0A0F1A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  const tint = getTenantBackgroundTint(tenantContext?.id_ref);
  const accentColor = tenantContext?.accent || '#3B82F6';

  return (
    <div className="min-h-screen bg-[#0A0F1A] flex flex-col items-center justify-center relative overflow-hidden">
      {/* ── Background Ambient Orbs ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] rounded-full bg-blue-600/[0.03] blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[35rem] h-[35rem] rounded-full bg-violet-600/[0.03] blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        {/* Tenant-specific orb */}
        {tenantContext && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] rounded-full blur-[130px]"
            style={{ backgroundColor: `${accentColor}08` }}
          />
        )}
      </div>

      {/* ── Grid Overlay ── */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />

      {/* ── Content ── */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-6 flex flex-col items-center gap-10">
        <AnimatePresence mode="wait">
          {/* Phase 1: Boot — 6R Sequence */}
          {phase === 'boot' && (
            <SixRSequence key="boot" onComplete={handleBootComplete} tenantBrand={tenantContext} />
          )}

          {/* Phase 2: Shield — Orbitan Shield™ verification */}
          {phase === 'shield' && (
            <motion.div
              key="shield"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.div
                animate={{ rotate: [0, 2, -2, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 flex items-center justify-center"
              >
                <Shield className="w-8 h-8 text-red-400" />
              </motion.div>
              <div className="text-center">
                <p className="text-xs tracking-[0.2em] uppercase text-red-400 font-bold mb-1">{SHIELD_BRAND.label}</p>
                <p className="text-slate-500 text-[11px]">Powered by {SHIELD_BRAND.poweredBy}</p>
              </div>
              <motion.div
                animate={{ width: ['0%', '100%'] }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
                className="h-[1px] bg-gradient-to-r from-transparent via-red-500/30 to-transparent w-28"
              />
            </motion.div>
          )}

          {/* Phase 3: Cards — Gateway Entry Points */}
          {phase === 'cards' && (
            <motion.div
              key="cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="w-full flex flex-col items-center gap-10"
            >
              {/* ── Header ── */}
              <div className="text-center space-y-3">
                <OrbitanWordmark size="md" variant="light" showOS={false} />
                <motion.h1
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight"
                >
                  Welcome to the{' '}
                  <span style={{ color: accentColor }}>Operating System</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-slate-500 text-sm"
                >
                  Select your entry point to continue
                </motion.p>
                {/* Tenant context indicator */}
                {tenantContext && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.25 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
                    style={{ backgroundColor: `${accentColor}12`, border: `1px solid ${accentColor}25` }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                    <span className="text-[10px] font-medium" style={{ color: accentColor }}>
                      {tenantContext.brand}
                    </span>
                  </motion.div>
                )}
              </div>

              {/* ── Gateway Cards ── */}
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                {GATEWAY_CARDS.map((card, i) => {
                  const Icon = card.icon;
                  const isHovered = hoveredCard === card.id;
                  const glow = tenantContext ? accentColor : card.defaultGlow;
                  return (
                    <motion.button
                      key={card.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
                      onMouseEnter={() => setHoveredCard(card.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      onClick={() => navigate(card.action)}
                      className={`relative group w-full text-left rounded-2xl border ${card.border} ${card.bg} p-5 transition-all duration-300 cursor-pointer overflow-hidden`}
                    >
                      {/* Hover glow */}
                      <div className={`absolute inset-0 bg-gradient-to-b ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                      {isHovered && (
                        <motion.div
                          layoutId="gateway-orb"
                          className="absolute -top-12 -right-12 w-28 h-28 rounded-full opacity-15 pointer-events-none"
                          style={{ background: `radial-gradient(circle, ${glow}, transparent 70%)` }}
                          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                        />
                      )}

                      <div className="relative z-10 space-y-3.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300"
                          style={{ backgroundColor: `${glow}12` }}>
                          <Icon className="w-4.5 h-4.5 transition-colors duration-300" style={{ color: glow }} />
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-white text-sm mb-1 group-hover:translate-x-0.5 transition-transform duration-300">
                            {card.title}
                          </h3>
                          <p className="text-slate-500 text-[11px] leading-relaxed">{card.subtitle}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-slate-500 font-medium">
                            {card.badge}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-300" />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* ── 6R Trust Tier ── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-red-400/60" />
                  <span className="text-[9px] tracking-[0.15em] uppercase text-slate-600 font-medium">
                    Secured by the {SHIELD_BRAND.label}
                  </span>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {SIX_R_PRINCIPLES.map((p) => (
                    <span key={p.key}
                      className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.02] border border-white/[0.04] text-slate-500 font-medium tracking-wide"
                    >
                      {p.label}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* ── Footer ── */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.85 }}
                className="text-[10px] text-slate-600 text-center"
              >
                {TAGLINES.primary}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}