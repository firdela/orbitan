import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LogIn, UserPlus, Search, Shield, ChevronRight
} from 'lucide-react';

const LOGO_URL = 'https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39/10527badf_bluecircularlogoonblac.png';

const PRINCIPLES = ['Renew', 'Relate', 'Respond', 'Refine', 'Regulate', 'Reach'];

const GATEWAY_CARDS = [
  {
    id: 'login',
    title: 'Sign In',
    subtitle: 'Returning member? Access your workspace.',
    icon: LogIn,
    glow: '#3B82F6',
    gradient: 'from-blue-600/20 via-blue-500/5 to-transparent',
    border: 'border-blue-500/20 hover:border-blue-400/40',
    bg: 'bg-blue-500/[0.03] hover:bg-blue-500/[0.06]',
    action: '/login',
    badge: 'Orbitan Shield™ Verified',
  },
  {
    id: 'join',
    title: 'Join Organization',
    subtitle: 'Have an invitation? Activate your account.',
    icon: UserPlus,
    glow: '#10B981',
    gradient: 'from-emerald-600/20 via-emerald-500/5 to-transparent',
    border: 'border-emerald-500/20 hover:border-emerald-400/40',
    bg: 'bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06]',
    action: '/join',
    badge: 'Secure Invitation',
  },
  {
    id: 'request',
    title: 'Request Access',
    subtitle: 'New here? Find your workplace and get started.',
    icon: Search,
    glow: '#7C3AED',
    gradient: 'from-violet-600/20 via-violet-500/5 to-transparent',
    border: 'border-violet-500/20 hover:border-violet-400/40',
    bg: 'bg-violet-500/[0.03] hover:bg-violet-500/[0.06]',
    action: '/request-access',
    badge: 'Open Registration',
  },
];

export default function AuthGateway() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [phase, setPhase] = useState('boot');
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('shield'), 600);
    const t2 = setTimeout(() => setPhase('cards'), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

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

  return (
    <div className="min-h-screen bg-[#0A0F1A] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Luminous Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] rounded-full bg-blue-600/[0.03] blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[35rem] h-[35rem] rounded-full bg-violet-600/[0.03] blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] rounded-full bg-emerald-600/[0.02] blur-[150px]" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />

      <div className="relative z-10 w-full max-w-2xl mx-auto px-6 flex flex-col items-center gap-10">
        {/* Boot phase — Logo spin */}
        <AnimatePresence mode="wait">
          {phase === 'boot' && (
            <motion.div
              key="boot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.img
                src={LOGO_URL}
                alt="Orbitan"
                className="w-20 h-20"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
              <p className="text-slate-500 text-[11px] tracking-[0.25em] uppercase font-medium">Initialising</p>
            </motion.div>
          )}

          {phase === 'shield' && (
            <motion.div
              key="shield"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
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
                <p className="text-xs tracking-[0.2em] uppercase text-red-400 font-bold mb-1">Orbitan Shield™</p>
                <p className="text-slate-500 text-[11px]">Powered by Regulate</p>
              </div>
              <motion.div
                animate={{ width: ['0%', '100%'] }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
                className="h-[1px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent w-32"
              />
            </motion.div>
          )}

          {phase === 'cards' && (
            <motion.div
              key="cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7 }}
              className="w-full flex flex-col items-center gap-10"
            >
              {/* Header */}
              <div className="text-center space-y-2">
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex items-center justify-center gap-2 mb-1"
                >
                  <img src={LOGO_URL} alt="Orbitan" className="w-7 h-7 opacity-80" />
                  <span className="font-display font-bold text-white text-sm tracking-tight">
                    Orbitan
                  </span>
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight"
                >
                  Welcome to <span className="text-[#3B82F6]">Orbitan</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="text-slate-500 text-sm"
                >
                  Select your entry point to continue
                </motion.p>
              </div>

              {/* Gateway Cards */}
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                {GATEWAY_CARDS.map((card, i) => {
                  const Icon = card.icon;
                  const isHovered = hoveredCard === card.id;
                  return (
                    <motion.button
                      key={card.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.35 + i * 0.1 }}
                      onMouseEnter={() => setHoveredCard(card.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      onClick={() => navigate(card.action)}
                      className={`relative group w-full text-left rounded-2xl border ${card.border} ${card.bg} p-6 transition-all duration-300 cursor-pointer overflow-hidden`}
                    >
                      {/* Glow effect */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-b ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                      />
                      {/* Orb */}
                      {isHovered && (
                        <motion.div
                          layoutId="gateway-orb"
                          className="absolute -top-16 -right-16 w-32 h-32 rounded-full opacity-20 pointer-events-none"
                          style={{ background: `radial-gradient(circle, ${card.glow}, transparent 70%)` }}
                          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                        />
                      )}

                      <div className="relative z-10 space-y-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
                          style={{ backgroundColor: `${card.glow}15` }}
                        >
                          <Icon className="w-5 h-5 transition-colors duration-300" style={{ color: card.glow }} />
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

              {/* Trust Tier — 6R Principles */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-red-400/60" />
                  <span className="text-[9px] tracking-[0.15em] uppercase text-slate-600 font-medium">Secured by the Orbitan Shield</span>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {PRINCIPLES.map((p) => (
                    <span
                      key={p}
                      className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.02] border border-white/[0.04] text-slate-500 font-medium tracking-wide"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Footer */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 1 }}
                className="text-[10px] text-slate-600 text-center"
              >
                Run Your Business. Connect Everything.
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}