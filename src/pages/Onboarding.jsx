import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus, ArrowLeft } from 'lucide-react';
import OrbitanWordmark from '@/components/brand/OrbitanWordmark';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';

// Dedicated "Business Installation Wizard" page.
// Requires an authenticated user — the founder is stamped as tenant_admin
// of the workspace they provision.
export default function Onboarding() {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#0A0F1A] flex items-center justify-center pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>);

  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0F1A] flex flex-col items-center justify-center px-6 relative pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {/* Top nav bar */}
        <div className="absolute top-0 inset-x-0 h-16 flex items-center justify-between px-6 max-w-sm w-full mx-auto pt-[env(safe-area-inset-top)]">
          <OrbitanWordmark size="sm" variant="light" showOS={false} />
          <Link to="/" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </Link>
        </div>
        <div className="max-w-sm w-full text-center">
          <h1 className="text-xl font-display font-bold text-white mb-2">Create your account first</h1>
          <p className="text-slate-400 text-sm mb-6">
            You'll need an Orbitan account before setting up your organisation. It only takes a moment.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link to="/register">
              <Button className="w-full h-11 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl gap-2">
                <UserPlus className="w-4 h-4" /> Create Account
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" className="w-full h-11 border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] rounded-xl gap-2">
                <LogIn className="w-4 h-4" /> Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>);

  }

  return <OnboardingWizard />;
}