import React from 'react';
import OrbitanLogo from '@/components/layout/OrbitanLogo';
import { Shield, Clock, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function MaintenanceView({ settings = {} }) {
  const {
    maintenance_title = 'Scheduled Maintenance',
    maintenance_message = 'OrbitanOS is currently undergoing scheduled maintenance to improve platform performance and security. We will be back shortly.',
    expected_resume_at,
  } = settings;

  return (
    <div className="min-h-screen bg-[#0A0F1A] flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#1D4ED8]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-[#D4AF37]/5 blur-3xl" />
      </div>

      {/* Orbiting ring decoration */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[520px] h-[520px] rounded-full border border-white/[0.03] animate-[spin_40s_linear_infinite]" />
        <div className="absolute w-[360px] h-[360px] rounded-full border border-white/[0.05] animate-[spin_25s_linear_infinite_reverse]" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-8">

        {/* Logo */}
        <div className="flex justify-center">
          <OrbitanLogo size="lg" theme="dark" showOS />
        </div>

        {/* Shield icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1F2937] to-[#111827] border border-[#D4AF37]/20 flex items-center justify-center shadow-2xl">
            <Shield className="w-9 h-9 text-[#D4AF37]" />
          </div>
        </div>

        {/* Content card */}
        <div className="bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-2xl px-8 py-8 space-y-5">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-1.5 rounded-full text-xs font-semibold mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
              Orbitan Shield™ — System Governance Active
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-3">
              {maintenance_title}
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              {maintenance_message}
            </p>
          </div>

          {/* Expected Resume */}
          {expected_resume_at && (
            <div className="flex items-center justify-center gap-2 bg-white/[0.04] rounded-xl px-4 py-3 border border-white/[0.06]">
              <Clock className="w-4 h-4 text-[#2563EB]" />
              <span className="text-sm text-slate-300">
                Expected back:{' '}
                <span className="font-semibold text-white">
                  {format(new Date(expected_resume_at), 'dd MMM yyyy, h:mm a')}
                </span>
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 border-white/10 text-slate-300 hover:text-white hover:border-white/20 bg-transparent gap-2"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4" /> Check Again
            </Button>
            <Button
              className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-2"
              onClick={() => window.location.href = 'mailto:support@orbitan.net'}
            >
              <Mail className="w-4 h-4" /> Contact Support
            </Button>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs text-slate-600">
          OrbitanOS · Powered by the Regulate Principle · All data is secure
        </p>
      </div>
    </div>
  );
}