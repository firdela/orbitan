import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, MapPin, Building2, Store, Factory, Warehouse, ChevronRight,
  Loader2, ArrowLeft, IdCard, User, Shield, Send, CheckCircle2,
  Clock, Users, Sparkles, ArrowRight
} from 'lucide-react';
import OrbitanWordmark from '@/components/brand/OrbitanWordmark';

const OUTLET_ICONS = {
  restaurant: Store,
  retail_store: Store,
  warehouse: Warehouse,
  processing_facility: Factory,
  office: Building2,
  default: MapPin,
};

const ROLES = [
  { value: 'worker', label: 'Team Member', desc: 'Clock in, complete tasks, daily operations', icon: User },
  { value: 'supervisor', label: 'Supervisor', desc: 'Oversee shifts, assign tasks, quality checks', icon: Shield },
  { value: 'outlet_manager', label: 'Outlet Manager', desc: 'Manage outlet operations, inventory, compliance', icon: Building2 },
];

// ── Phase 1: Workplace Discovery ──
function WorkplaceSearch({ onSelect }) {
  const searchRef = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: workplaces = [], isLoading: wpLoading } = useQuery({
    queryKey: ['welcome-workplaces'],
    queryFn: async () => {
      const res = await base44.functions.invoke('discoverWorkplaces', {});
      return res.data || [];
    },
  });

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredWorkplaces = (() => {
    if (!workplaces.length) return [];
    if (!searchQuery.trim()) return workplaces.slice(0, 8);
    const q = searchQuery.toLowerCase();
    return workplaces.filter(w =>
      w.name?.toLowerCase().includes(q) ||
      w.address?.toLowerCase().includes(q) ||
      w.tenant_name?.toLowerCase().includes(q) ||
      w.type?.toLowerCase().includes(q)
    );
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-3"
    >
      <div className="relative" ref={searchRef}>
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
        <Input
          placeholder="Search for your workplace..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
          onFocus={() => setSearchOpen(true)}
          className="pl-10 h-12 bg-white/[0.05] border-white/[0.10] text-white placeholder:text-slate-500 focus:border-[#3B82F6]/40 rounded-xl text-sm"
        />
      </div>

      {searchOpen && (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden max-h-72 overflow-y-auto">
          {wpLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            </div>
          ) : filteredWorkplaces.length === 0 ? (
            <div className="py-8 text-center">
              <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No workplaces found</p>
              <p className="text-xs text-slate-600 mt-1">Try a different search term</p>
            </div>
          ) : (
            filteredWorkplaces.map((w) => {
              const Icon = OUTLET_ICONS[w.type] || OUTLET_ICONS.default;
              return (
                <button key={w.id}
                  onClick={() => onSelect(w)}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-b-0 group"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[#3B82F6]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{w.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {w.tenant_name}{w.address ? ` · ${w.address}` : w.is_pending_setup ? ' · Pending Setup' : ''}
                    </p>
                  </div>
                  {w.is_pending_setup && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold flex-shrink-0">Pending Setup</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-[#3B82F6] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              );
            })
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── Phase 2: Role & Outlet Selection ──
function RoleSelection({ workplace, onBack, onConfirm, initialRole }) {
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [selectedRole, setSelectedRole] = useState(initialRole || 'worker');
  const [step, setStep] = useState(1); // 1=outlet+role, 2=confirm

  const { data: outlets = [] } = useQuery({
    queryKey: ['access-request-outlets', workplace.tenant_id],
    queryFn: () => base44.entities.Outlet.filter({ tenant_id: workplace.tenant_id }),
    enabled: !!workplace.tenant_id,
  });

  if (step === 2) {
    return (
      <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} className="w-full space-y-5">
        <button onClick={() => setStep(1)} className="text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back
        </button>

        <div className="text-center">
          <h2 className="font-display font-bold text-xl text-white mb-1">Confirm Your Request</h2>
          <p className="text-slate-400 text-sm">Review the details below before submitting.</p>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden divide-y divide-white/[0.05]">
          <div className="px-4 py-3.5 flex items-center gap-3">
            <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Company</p>
              <p className="text-sm font-semibold text-white">{workplace.tenant_name || workplace.name}</p>
            </div>
          </div>
          {selectedOutlet && (
            <div className="px-4 py-3.5 flex items-center gap-3">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Outlet</p>
                <p className="text-sm font-semibold text-white">{selectedOutlet.name}</p>
              </div>
            </div>
          )}
          <div className="px-4 py-3.5 flex items-center gap-3">
            <IdCard className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Role</p>
              <p className="text-sm font-semibold text-white capitalize">{selectedRole.replace(/_/g, ' ')}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 border-white/[0.10] text-slate-400" onClick={() => setStep(1)}>Back</Button>
          <Button className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] gap-2" onClick={() => onConfirm({ workplace, selectedOutlet, selectedRole })}>
            <Send className="w-4 h-4" /> Submit Request
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} className="w-full space-y-5">
      <button onClick={onBack} className="text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors">
        <ArrowLeft className="w-3 h-3" /> Back to Search
      </button>

      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center mx-auto mb-3">
          <Building2 className="w-6 h-6 text-[#3B82F6]" />
        </div>
        <h2 className="font-display font-bold text-lg text-white">{workplace.tenant_name || workplace.name}</h2>
        {workplace.name && workplace.name !== workplace.tenant_name && (
          <p className="text-xs text-slate-500">{workplace.name}</p>
        )}
      </div>

      {/* Outlet selection */}
      {outlets.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> Select Outlet
          </p>
          {outlets.map(outlet => (
            <button key={outlet.id} onClick={() => setSelectedOutlet(outlet)}
              className={`w-full border rounded-xl p-3.5 flex items-center gap-3 text-left transition-all ${
                selectedOutlet?.id === outlet.id ? 'border-[#3B82F6]/40 bg-[#3B82F6]/[0.06]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]'
              }`}>
              <MapPin className={`w-4 h-4 flex-shrink-0 ${selectedOutlet?.id === outlet.id ? 'text-[#3B82F6]' : 'text-slate-500'}`} />
              <p className="text-sm font-semibold text-white">{outlet.name}</p>
            </button>
          ))}
        </div>
      )}

      {/* Role selection */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
          <IdCard className="w-3 h-3" /> Your Role
        </p>
        {ROLES.map(role => {
          const Icon = role.icon;
          return (
            <button key={role.value} onClick={() => { setSelectedRole(role.value); setStep(2); }}
              className="w-full border border-white/[0.08] bg-white/[0.02] rounded-xl p-4 flex items-center gap-4 text-left hover:border-[#3B82F6]/30 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-[#3B82F6]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{role.label}</p>
                <p className="text-xs text-slate-500">{role.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Success / Pending Views ──
function SuccessView({ workplace, submittedRole, onDone }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5 w-full">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
      </div>
      <div>
        <h2 className="font-display font-bold text-xl text-white mb-2">Request Submitted</h2>
        <p className="text-slate-400 text-sm">
          Your request to join <span className="text-white font-semibold">{workplace.tenant_name || workplace.name}</span> has been sent.
        </p>
      </div>
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-3 text-left">
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-slate-400">A manager will review your request and you'll receive an email notification.</p>
        </div>
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-[#3B82F6] flex-shrink-0" />
          <p className="text-xs text-slate-400">Once approved, log back in to access your workspace.</p>
        </div>
      </div>
      <Button variant="outline" className="border-white/[0.10] text-slate-400" onClick={onDone}>
        Back to Gateway
      </Button>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// REQUEST ACCESS PAGE — Unified workplace discovery + role selection
// ════════════════════════════════════════════════════════════════════
export default function RequestAccessPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const userEmail = user?.email || '';
  const userFullName = user?.full_name || 'Worker';

  // Check URL params for invitation-based entry (from JoinGateway)
  const urlParams = new URLSearchParams(window.location.search);
  const urlTenantId = urlParams.get('tenant_id');
  const urlOutletId = urlParams.get('outlet_id');
  const urlOutletName = urlParams.get('outlet_name');
  const urlCompanyName = urlParams.get('company_name');
  const urlInviteCode = urlParams.get('invite_code');
  const urlRole = urlParams.get('role');

  const initialWorkplace = urlTenantId ? {
    tenant_id: urlTenantId,
    name: urlOutletName || urlCompanyName,
    tenant_name: urlCompanyName,
    id: urlOutletId,
  } : null;

  const [phase, setPhase] = useState(initialWorkplace ? 'role' : 'search');
  const [selectedWorkplace, setSelectedWorkplace] = useState(initialWorkplace);
  const [submittedRole, setSubmittedRole] = useState('');
  const [liveRequest, setLiveRequest] = useState(null);

  // Check for existing pending request
  const { data: existingRequests = [] } = useQuery({
    queryKey: ['access-request-existing', userEmail],
    queryFn: () => base44.entities.AccessRequest.filter({ email: userEmail }),
    enabled: !!userEmail && isAuthenticated,
  });

  const pendingRequest = existingRequests.find(r => r.status === 'pending');

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: (data) => base44.entities.AccessRequest.create(data),
    onSuccess: () => setPhase('success'),
  });

  // Real-time subscription: listen for AccessRequest status changes
  useEffect(() => {
    if (!userEmail) return;
    const unsubscribe = base44.entities.AccessRequest.subscribe((event) => {
      if (event.type === 'update' && event.data?.email === userEmail && event.data?.status === 'approved') {
        setLiveRequest(event.data);
      }
    });
    return unsubscribe;
  }, [userEmail]);

  const handleWorkplaceSelect = (workplace) => {
    setSelectedWorkplace(workplace);
    setPhase('role');
  };

  const handleConfirm = ({ workplace, selectedOutlet, selectedRole }) => {
    setSubmittedRole(selectedRole);
    submitMutation.mutate({
      email: userEmail,
      tenant_id: workplace.tenant_id,
      outlet_id: selectedOutlet?.id || workplace.id || null,
      company_name: workplace.tenant_name || workplace.name,
      outlet_name: selectedOutlet?.name || workplace.name || null,
      role_requested: selectedRole,
      invite_code: urlInviteCode || null,
      status: 'pending',
    });
  };

  // ── Loading ──
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#0A0F1A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  // ── Approved! ──
  if (liveRequest?.status === 'approved') {
    return (
      <div className="min-h-screen bg-[#0A0F1A] flex flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm w-full space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="font-display font-bold text-2xl text-white">Welcome to OrbitanOS</h2>
          <p className="text-slate-400 text-sm">
            Your access to <span className="text-white font-semibold">{liveRequest.company_name}</span> has been approved as <span className="text-white capitalize">{(liveRequest.role_requested || 'worker').replace(/_/g, ' ')}</span>.
          </p>
          <Button onClick={() => window.location.href = '/workspace'} className="bg-[#3B82F6] hover:bg-[#2563EB] gap-2">
            Continue to Workspace <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Pending ──
  if (pendingRequest) {
    return (
      <div className="min-h-screen bg-[#0A0F1A] flex flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm w-full space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="font-display font-bold text-xl text-white">Access Request Pending</h2>
          <p className="text-slate-400 text-sm">
            Your request to join <span className="text-white font-semibold">{pendingRequest.company_name}</span> is under review.
          </p>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-[#3B82F6] flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-semibold text-white">{pendingRequest.company_name}</p>
              <p className="text-xs text-slate-500 capitalize">{(pendingRequest.role_requested || 'worker').replace(/_/g, ' ')}</p>
            </div>
            <span className="ml-auto px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">Under Review</span>
          </div>
          <Button variant="outline" onClick={() => base44.auth.logout()} className="border-white/[0.10] text-slate-400 w-full">
            Try a Different Account
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Main Flow ──
  return (
    <div className="min-h-screen bg-[#0A0F1A] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.05)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />

      <div className="relative z-10 w-full max-w-lg mx-auto px-6 flex flex-col items-center gap-8">
        <div className="w-full flex items-center justify-between">
          <OrbitanWordmark size="md" variant="light" showOS={false} />
          <Link to="/" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </Link>
        </div>

        <AnimatePresence mode="wait">
          {phase === 'search' && (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -40 }} className="w-full space-y-5">
              <div className="text-center space-y-2">
                <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
                  Find Your Workplace
                </h1>
                <p className="text-slate-400 text-sm">
                  Welcome, {userFullName}. Search for your company to get started.
                </p>
              </div>
              <WorkplaceSearch onSelect={handleWorkplaceSelect} />

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.06]" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-[#0A0F1A] px-3 text-slate-600">or</span></div>
              </div>

              <Link to="/join" className="block">
                <Button variant="outline" className="w-full h-12 rounded-xl border-white/[0.10] text-slate-400 hover:text-white hover:bg-white/[0.04] font-medium gap-2">
                  <Shield className="w-4 h-4" />
                  I Have an Invitation Code
                  <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                </Button>
              </Link>
            </motion.div>
          )}

          {phase === 'role' && selectedWorkplace && (
            <motion.div key="role" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="w-full">
              <RoleSelection
                workplace={selectedWorkplace}
                onBack={() => setPhase('search')}
                onConfirm={handleConfirm}
                initialRole={urlRole}
              />
            </motion.div>
          )}

          {phase === 'success' && selectedWorkplace && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full">
              <SuccessView
                workplace={selectedWorkplace}
                submittedRole={submittedRole}
                onDone={() => navigate('/auth/gateway')}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[10px] text-slate-600 text-center">
          Secured by the Orbitan Shield™ — Powered by Regulate
        </p>
      </div>
    </div>
  );
}