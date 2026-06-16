import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import OrbitanLogo from '@/components/layout/OrbitanLogo';
import { Button } from '@/components/ui/button';
import {
  Building2, MapPin, User, Shield, Send, CheckCircle2, Loader2,
  ChevronRight, ArrowLeft, IdCard, Clock, Users, Sparkles, ArrowRight
} from 'lucide-react';

const ROLES = [
  { value: 'worker', label: 'Team Member', desc: 'Clock in, complete tasks, daily operations', icon: User },
  { value: 'supervisor', label: 'Supervisor', desc: 'Oversee shifts, assign tasks, quality checks', icon: Shield },
  { value: 'outlet_manager', label: 'Outlet Manager', desc: 'Manage outlet operations, inventory, compliance', icon: Building2 },
];

export default function AccessRequestView() {
  const { user, logout } = useAuth();
  const userEmail = user?.email || '';
  const userFullName = user?.full_name || 'Worker';

  const [step, setStep] = useState(1); // 1=select tenant, 2=select role, 3=confirm & submit, 4=done
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [selectedRole, setSelectedRole] = useState('worker');
  const [submitted, setSubmitted] = useState(false);

  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ['access-request-tenants'],
    queryFn: () => base44.entities.Tenant.list(),
  });

  const activeTenants = tenants.filter(t => t.status === 'active');

  const { data: outlets = [] } = useQuery({
    queryKey: ['access-request-outlets', selectedTenant?.id],
    queryFn: () => base44.entities.Outlet.filter({ tenant_id: selectedTenant?.id }),
    enabled: !!selectedTenant?.id,
  });

  // Check if user already has a pending request
  const { data: existingRequests = [] } = useQuery({
    queryKey: ['access-request-existing', userEmail],
    queryFn: () => base44.entities.AccessRequest.filter({ email: userEmail }),
    enabled: !!userEmail,
  });

  const pendingRequest = existingRequests.find(r => r.status === 'pending');
  const [liveRequest, setLiveRequest] = useState(null);

  const submitMutation = useMutation({
    mutationFn: (data) => base44.entities.AccessRequest.create(data),
    onSuccess: () => {
      setSubmitted(true);
      setStep(4);
    },
  });

  const handleSubmit = () => {
    if (!selectedTenant) return;
    submitMutation.mutate({
      email: userEmail,
      tenant_id: selectedTenant.id,
      outlet_id: selectedOutlet?.id || null,
      company_name: selectedTenant.name,
      outlet_name: selectedOutlet?.name || null,
      role_requested: selectedRole,
      status: 'pending',
    });
  };

  // ── Real-time subscription: listen for AccessRequest status changes ──
  useEffect(() => {
    if (!userEmail) return;
    const unsubscribe = base44.entities.AccessRequest.subscribe((event) => {
      if (event.type === 'update' && event.data?.email === userEmail && event.data?.status === 'approved') {
        setLiveRequest(event.data);
      }
    });
    return unsubscribe;
  }, [userEmail]);

  // If subscription detected approval, show celebration state
  if (liveRequest?.status === 'approved') {
    const approvedRole = (liveRequest.role_requested || 'worker').replace(/_/g, ' ');
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-20 h-20 rounded-full bg-orbitan-green-light flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-orbitan-green" />
          </div>
          <h2 className="font-display font-bold text-2xl text-foreground mb-2">Welcome to Orbitan</h2>
          <p className="text-muted-foreground text-sm mb-1">
            Your access to <span className="font-semibold text-foreground">{liveRequest.company_name}</span> has been approved.
          </p>
          <p className="text-muted-foreground text-xs mb-8">
            You've been onboarded as <span className="font-medium text-foreground capitalize">{approvedRole}</span>.
          </p>
          <div className="bg-card border border-border rounded-xl p-4 w-full mb-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-foreground">{liveRequest.company_name}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{approvedRole}</p>
              </div>
            </div>
          </div>
          <Button onClick={() => window.location.href = '/workspace'} className="gap-2 w-full">
            Continue to Workspace <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // If there's already a pending request, show that instead
  if (pendingRequest && !submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-amber-50 flex items-center justify-center mb-6">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="font-display font-bold text-2xl text-foreground mb-3">Access Request Pending</h2>
          <p className="text-muted-foreground text-sm mb-2">
            Your request to join <span className="font-semibold text-foreground">{pendingRequest.company_name}</span> has been submitted.
          </p>
          <p className="text-muted-foreground text-xs mb-8">
            A manager will review your request soon. You'll receive an email when approved.
          </p>
          <div className="bg-card border border-border rounded-xl p-4 w-full mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">{pendingRequest.company_name}</p>
                <p className="text-xs text-muted-foreground">
                  Role: <span className="font-medium">{pendingRequest.role_requested?.replace('_', ' ') || 'worker'}</span>
                </p>
              </div>
              <div className="ml-auto px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
                Under Review
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => logout(true)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Try a Different Account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <OrbitanLogo size="sm" />
          {step > 1 && step < 4 && (
            <button onClick={() => setStep(prev => Math.max(1, prev - 1))}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
        {/* Step 1 — Select Company */}
        {step === 1 && (
          <div className="w-full animate-fade-in space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl orbitan-gradient flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="font-display font-bold text-2xl text-foreground mb-2">Request Access</h1>
              <p className="text-muted-foreground text-sm">Welcome, {userFullName}. Select your company to begin.</p>
              <p className="text-muted-foreground text-xs mt-1">{userEmail}</p>
            </div>

            {tenantsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {activeTenants.map(tenant => (
                  <button key={tenant.id} onClick={() => { setSelectedTenant(tenant); setStep(2); }}
                    className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-4 text-left hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.99] group">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0 text-white font-bold font-display text-sm">
                      {tenant.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{tenant.industry?.replace(/_/g, ' ')}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground text-center">
              Don't see your company? Ask your manager to set up your OrbitanOS tenant first.
            </p>
          </div>
        )}

        {/* Step 2 — Select Role + Outlet */}
        {step === 2 && (
          <div className="w-full animate-fade-in space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center mx-auto mb-3 text-white font-bold font-display">
                {selectedTenant?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <h2 className="font-display font-bold text-xl text-foreground">{selectedTenant?.name}</h2>
              <p className="text-xs text-muted-foreground capitalize">{selectedTenant?.industry?.replace(/_/g, ' ')}</p>
            </div>

            {/* Outlet selection (if outlets exist) */}
            {outlets.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Select Outlet
                </p>
                {outlets.map(outlet => (
                  <button key={outlet.id} onClick={() => setSelectedOutlet(outlet)}
                    className={`w-full border rounded-xl p-3.5 flex items-center gap-3 text-left transition-all active:scale-[0.99] ${
                      selectedOutlet?.id === outlet.id ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border bg-card hover:border-primary/20'
                    }`}>
                    <MapPin className={`w-4 h-4 flex-shrink-0 ${selectedOutlet?.id === outlet.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{outlet.name}</p>
                      {outlet.address && <p className="text-[11px] text-muted-foreground truncate">{outlet.address}</p>}
                    </div>
                  </button>
                ))}
                <button onClick={() => setSelectedOutlet(null)}
                  className={`w-full border rounded-xl p-3.5 flex items-center gap-3 text-left transition-all active:scale-[0.99] ${
                    !selectedOutlet ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border bg-card hover:border-primary/20'
                  }`}>
                  <Building2 className={`w-4 h-4 flex-shrink-0 ${!selectedOutlet ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="text-sm font-semibold text-foreground">Any Outlet</p>
                </button>
              </div>
            )}

            {/* Role selection */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5" /> Your Role
              </p>
              {ROLES.map(role => {
                const Icon = role.icon;
                return (
                  <button key={role.value} onClick={() => { setSelectedRole(role.value); setStep(3); }}
                    className="w-full border border-border bg-card rounded-xl p-4 flex items-center gap-4 text-left hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.99] group">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{role.label}</p>
                      <p className="text-xs text-muted-foreground">{role.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3 — Confirm & Submit */}
        {step === 3 && (
          <div className="w-full animate-fade-in space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-display font-bold text-xl text-foreground mb-1">Confirm Your Request</h2>
              <p className="text-sm text-muted-foreground">Review the details below before submitting.</p>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
              <div className="px-4 py-3.5 flex items-center gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Company</p>
                  <p className="text-sm font-semibold text-foreground">{selectedTenant?.name}</p>
                </div>
              </div>
              {selectedOutlet && (
                <div className="px-4 py-3.5 flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Outlet</p>
                    <p className="text-sm font-semibold text-foreground">{selectedOutlet?.name}</p>
                  </div>
                </div>
              )}
              <div className="px-4 py-3.5 flex items-center gap-3">
                <IdCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Role Requested</p>
                  <p className="text-sm font-semibold text-foreground capitalize">{selectedRole?.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <div className="px-4 py-3.5 flex items-center gap-3">
                <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Your Email</p>
                  <p className="text-sm font-medium text-foreground">{userEmail}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1 gap-2" onClick={handleSubmit} disabled={submitMutation.isPending}>
                {submitMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 — Confirmation */}
        {step === 4 && (
          <div className="w-full animate-fade-in space-y-6 text-center">
            <div className="w-20 h-20 rounded-full bg-orbitan-green-light flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-orbitan-green" />
            </div>
            <div>
              <h2 className="font-display font-bold text-2xl text-foreground mb-2">Request Submitted</h2>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                Your access request has been sent to <span className="font-semibold text-foreground">{selectedTenant?.name}</span> management.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-foreground">What happens next?</p>
                  <p className="text-[11px] text-muted-foreground">A manager will review your request and approve it. You'll receive an email notification.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-foreground">After approval</p>
                  <p className="text-[11px] text-muted-foreground">Refresh this page or log out and back in to access your dashboard.</p>
                </div>
              </div>
            </div>

            <Button variant="outline" onClick={() => logout(true)} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Button>
          </div>
        )}

        {/* Error state if mutation fails */}
        {submitMutation.isError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
            Something went wrong. Please try again or contact support.
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center">
        <p className="text-[10px] text-muted-foreground">
          OrbitanOS · Access Registry · Regulate Principle
        </p>
      </footer>
    </div>
  );
}