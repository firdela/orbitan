import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, MapPin, Building2, ChevronRight, Loader2
} from 'lucide-react';

const LOGO_URL = 'https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39/9673d29b5_ORBITANbluelogo.png';

const PRINCIPLES = [
  { key: 'Renew',   desc: 'Continuous Learning & Innovation' },
  { key: 'Relate',  desc: 'People & Workforce Engagement' },
  { key: 'Respond', desc: 'Daily Operations & Execution' },
  { key: 'Refine',  desc: 'Analytics & Intelligence' },
  { key: 'Regulate',desc: 'Governance & Orbitan Shield™' },
  { key: 'Reach',   desc: 'Growth & Expansion' },
];

export default function WelcomeGateway() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const userEmail = user?.email || '';

  // Animation phases
  const [phase, setPhase] = useState('logo'); // logo | content
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOutlet, setSelectedOutlet] = useState(null);

  // Auto-advance from logo spin to content
  useEffect(() => {
    const timer = setTimeout(() => setPhase('content'), 2200);
    return () => clearTimeout(timer);
  }, []);

  // Fetch all active outlets globally
  const { data: outlets = [], isLoading: outletsLoading } = useQuery({
    queryKey: ['welcome-outlets-global'],
    queryFn: () => base44.entities.Outlet.filter({ status: 'active' }),
    enabled: phase === 'content',
  });

  // Fetch tenants for display names
  const { data: tenants = [] } = useQuery({
    queryKey: ['welcome-tenants-global'],
    queryFn: () => base44.entities.Tenant.filter({ status: 'active' }),
    enabled: phase === 'content',
  });

  // Fetch user's existing requests
  const { data: existingRequests = [] } = useQuery({
    queryKey: ['welcome-existing-requests', userEmail],
    queryFn: () => base44.entities.AccessRequest.filter({ email: userEmail }),
    enabled: !!userEmail && isAuthenticated,
  });

  const pendingRequest = existingRequests.find(r => r.status === 'pending');

  const filteredOutlets = outlets.filter(o => {
    if (!searchQuery.trim()) return outlets.slice(0, 8);
    const q = searchQuery.toLowerCase();
    return (
      o.name?.toLowerCase().includes(q) ||
      o.address?.toLowerCase().includes(q) ||
      o.type?.toLowerCase().includes(q)
    );
  });

  const getTenantName = (tenantId) => {
    return tenants.find(t => t.id === tenantId)?.name || '';
  };

  const getOutletTypeIcon = (type) => {
    if (type === 'restaurant' || type === 'retail_store') return Building2;
    return MapPin;
  };

  const handleSelectOutlet = (outlet) => {
    setSelectedOutlet(outlet);
    // Navigate to access request with pre-filled outlet context
    const params = new URLSearchParams({
      outlet_id: outlet.id,
      outlet_name: outlet.name || '',
      tenant_id: outlet.tenant_id || '',
      company_name: getTenantName(outlet.tenant_id),
    });
    navigate(`/request-access?${params.toString()}`);
  };

  // Show pending request state
  if (pendingRequest && isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0F1A] flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="max-w-sm w-full space-y-6"
        >
          <motion.img
            src={LOGO_URL}
            alt="Orbitan"
            className="w-16 h-16 mx-auto"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
          <div>
            <h2 className="font-display font-bold text-xl text-white mb-2">Access Request Pending</h2>
            <p className="text-slate-400 text-sm">
              Your request to join <span className="text-white font-semibold">{pendingRequest.company_name}</span> is under review.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-orbitan-blue" />
              <div className="text-left">
                <p className="text-sm font-semibold text-white">{pendingRequest.company_name}</p>
                <p className="text-xs text-slate-400">Role: {pendingRequest.role_requested?.replace(/_/g, ' ') || 'worker'}</p>
              </div>
              <span className="ml-auto px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">
                Under Review
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => base44.auth.logout()}
            className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5 w-full"
          >
            Try a Different Account
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1A] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Subtle background radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.08)_0%,transparent_70%)]" />

      {/* ── Phase 1: Logo Spin Entrance ── */}
      <AnimatePresence>
        {phase === 'logo' && (
          <motion.div
            key="logo-phase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8, filter: 'blur(8px)' }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-6 z-10"
          >
            <motion.img
              src={LOGO_URL}
              alt="Orbitan"
              className="w-28 h-28 md:w-36 md:h-36 drop-shadow-[0_0_40px_rgba(37,99,235,0.3)]"
              initial={{ scale: 0.3, rotate: -180, opacity: 0 }}
              animate={{ scale: 1, rotate: 360, opacity: 1 }}
              transition={{ duration: 1.8, ease: [0.25, 0.1, 0.25, 1] }}
            />
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="text-slate-400 text-xs tracking-[0.2em] uppercase font-medium"
            >
              Initialising
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phase 2: Content ── */}
      <AnimatePresence>
        {phase === 'content' && (
          <motion.div
            key="content-phase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="z-10 w-full max-w-lg mx-auto px-6 flex flex-col items-center gap-8"
          >
            {/* Logo — subtle persistent */}
            <motion.img
              src={LOGO_URL}
              alt="Orbitan"
              className="w-12 h-12 opacity-80"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 0.8, y: 0 }}
              transition={{ duration: 0.6 }}
            />

            {/* Headline block */}
            <div className="text-center space-y-2">
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight"
              >
                Welcome to <span className="text-[#3B82F6]">Orbitan</span>
                <span className="font-light text-white/40 ml-1">OS</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-lg font-display font-semibold text-white/80"
              >
                Build Momentum. Navigate Growth.
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="text-xs text-slate-500 tracking-[0.15em] uppercase"
              >
                The Workforce Operating System
              </motion.p>
            </div>

            {/* Workplace Search */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="w-full space-y-3"
            >
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Search for your workplace..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-[#3B82F6]/50 focus:ring-[#3B82F6]/20 rounded-xl text-sm"
                />
              </div>

              {/* Search results */}
              {searchOpen && (
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  {outletsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                    </div>
                  ) : filteredOutlets.length === 0 ? (
                    <div className="py-8 text-center">
                      <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">No workplaces found</p>
                      <p className="text-xs text-slate-600 mt-1">Try a different search term</p>
                    </div>
                  ) : (
                    filteredOutlets.map((outlet) => {
                      const Icon = getOutletTypeIcon(outlet.type);
                      const tenantName = getTenantName(outlet.tenant_id);
                      return (
                        <button
                          key={outlet.id}
                          onClick={() => handleSelectOutlet(outlet)}
                          className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-white/[0.05] transition-colors border-b border-white/[0.04] last:border-b-0 group"
                        >
                          <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-[#3B82F6]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{outlet.name}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {tenantName}{outlet.address ? ` · ${outlet.address}` : ''}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-[#3B82F6] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </motion.div>

            {/* 6R Principles strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1 }}
              className="flex flex-wrap justify-center gap-2"
            >
              {PRINCIPLES.map((p, i) => (
                <span
                  key={p.key}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-500 font-medium tracking-wide"
                >
                  {p.key}
                </span>
              ))}
            </motion.div>

            {/* Footer note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              className="text-[10px] text-slate-600 text-center max-w-xs"
            >
              OrbitanOS serves as the Workforce Plexus that connects people, operations, knowledge, compliance, communication, and growth across the organisation.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}