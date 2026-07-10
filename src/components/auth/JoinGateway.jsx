import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, ArrowRight, ArrowLeft, Shield, Search, Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import OrbitanWordmark from '@/components/brand/OrbitanWordmark';

export default function JoinGateway() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const userEmail = user?.email || '';
  const [inviteCode, setInviteCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);

  // Check if user already has an Employee record
  const { data: employee, isLoading: empLoading } = useQuery({
    queryKey: ['join-gateway-employee', userEmail],
    queryFn: async () => {
      if (!userEmail) return null;
      const results = await base44.entities.Employee.filter({ email: userEmail });
      return results.length > 0 ? results[0] : null;
    },
    enabled: !!userEmail && isAuthenticated,
  });

  // Redirect to workspace if employee record exists
  useEffect(() => {
    if (employee && isAuthenticated) {
      navigate('/workspace', { replace: true });
    }
  }, [employee, isAuthenticated, navigate]);

  const validateAndNavigate = async (codeInput) => {
    const code = (codeInput || inviteCode).trim().toUpperCase();
    if (!code) return;
    setCheckingCode(true);
    setCodeError('');

    try {
      // ── Step 1: Check formal Invitation entity (Enterprise Registry) ──
      const invitations = await base44.entities.Invitation.filter({
        invite_code: code,
        status: 'active',
      });

      if (invitations.length > 0) {
        const inv = invitations[0];

        if (inv.expiry_date && new Date(inv.expiry_date) < new Date()) {
          setCodeError('This invitation has expired. Please contact your manager.');
          return;
        }

        if (inv.max_uses && inv.use_count >= inv.max_uses) {
          setCodeError('This invitation has already been used the maximum number of times.');
          return;
        }

        const params = new URLSearchParams({
          tenant_id: inv.tenant_id || '',
          outlet_id: inv.outlet_id || '',
          company_name: inv.company_id || '',
          invite_code: code,
        });
        if (inv.invited_role) {
          params.set('role', inv.invited_role);
        }
        navigate(`/request-access?${params.toString()}`);
        return;
      }

      // ── Step 2: Check Outlet-level invite codes ──
      const outlets = await base44.entities.Outlet.filter({ invite_code: code });
      if (outlets.length > 0) {
        const outlet = outlets[0];

        if (outlet.invite_code_expiry && new Date(outlet.invite_code_expiry) < new Date()) {
          setCodeError('This outlet invitation has expired. Please contact your manager.');
          return;
        }

        const params = new URLSearchParams({
          outlet_id: outlet.id,
          outlet_name: outlet.name || '',
          tenant_id: outlet.tenant_id || '',
          invite_code: code,
        });
        if (outlet.invite_code_role) {
          params.set('role', outlet.invite_code_role);
        }
        navigate(`/request-access?${params.toString()}`);
        return;
      }

      // ── Step 3: Check Tenant-level invite codes ──
      const tenants = await base44.entities.Tenant.filter({ invite_code: code });
      if (tenants.length > 0) {
        const tenant = tenants[0];

        if (tenant.invite_code_expiry && new Date(tenant.invite_code_expiry) < new Date()) {
          setCodeError('This organisation invitation has expired. Please contact your administrator.');
          return;
        }

        const params = new URLSearchParams({
          tenant_id: tenant.id,
          company_name: tenant.name || '',
          invite_code: code,
        });
        navigate(`/request-access?${params.toString()}`);
        return;
      }

      setCodeError('Invalid invitation code. Please check and try again.');
    } catch {
      setCodeError('Something went wrong. Please try again.');
    } finally {
      setCheckingCode(false);
    }
  };

  const handleInviteCheck = () => validateAndNavigate();

  // Auto-detect ?code= from deep links (e.g. orbitan.sg/join?code=LBT-NBR-001)
  // Must run before early returns to satisfy React Hooks rules.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('code');
    if (codeFromUrl) {
      setInviteCode(codeFromUrl);
      validateAndNavigate(codeFromUrl);
    }
  }, []);

  if (isLoadingAuth || empLoading) {
    return (
      <div className="min-h-screen bg-[#0A0F1A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (employee) return null;

  return (
    <div className="min-h-screen bg-[#0A0F1A] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.05)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />

      <div className="relative z-10 w-full max-w-md mx-auto px-6 flex flex-col items-center gap-8">
        <div className="w-full flex items-center justify-between">
          <OrbitanWordmark size="md" variant="light" showOS={false} />
          <Link to="/" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-3"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
            Join Your Organization
          </h1>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            Enter the invitation code your manager shared with you.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full space-y-4"
        >
          <div className="space-y-2">
            <div className="relative">
              <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
              <Input
                placeholder="Enter invitation code (e.g. LBT-NBR-001)"
                value={inviteCode}
                onChange={e => { setInviteCode(e.target.value); setCodeError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleInviteCheck()}
                className="pl-10 h-12 bg-white/[0.05] border-white/[0.10] text-white placeholder:text-slate-500 focus:border-emerald-500/40 rounded-xl text-sm font-mono tracking-wider uppercase"
              />
            </div>
            {codeError && (
              <p className="text-xs text-red-400 px-1">{codeError}</p>
            )}
          </div>

          <Button
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2"
            onClick={handleInviteCheck}
            disabled={checkingCode || !inviteCode.trim()}
          >
            {checkingCode ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {checkingCode ? 'Verifying...' : 'Continue with Invitation'}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0A0F1A] px-3 text-slate-600">or</span>
            </div>
          </div>

          <Link to="/request-access" className="block">
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl border-white/[0.10] text-slate-400 hover:text-white hover:bg-white/[0.04] font-medium gap-2"
            >
              <Search className="w-4 h-4" />
              Find Your Workplace
              <ArrowRight className="w-3.5 h-3.5 ml-auto" />
            </Button>
          </Link>
        </motion.div>

        <p className="text-[10px] text-slate-600 text-center max-w-xs">
          Secured by the Orbitan Shield™ — Powered by Regulate
        </p>
      </div>
    </div>
  );
}