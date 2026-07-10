import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import OrbitanWordmark from "@/components/brand/OrbitanWordmark";

/**
 * AuthLayout — Dark marketing-themed wrapper for all auth pages.
 * Provides Orbitan wordmark, "Back to Home" nav, glass-card form container,
 * and Orbit Shield™ footer. Used by Login, Register, ForgotPassword, ResetPassword.
 */
export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen bg-marketing-bg flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[30rem] h-[30rem] rounded-full bg-marketing-blue/[0.04] blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[25rem] h-[25rem] rounded-full bg-marketing-gold/[0.03] blur-[100px]" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Top nav */}
        <div className="flex items-center justify-between mb-8">
          <OrbitanWordmark size="sm" variant="light" showOS={false} />
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          {Icon && (
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-marketing-blue/10 border border-marketing-blue/20 mb-4">
              <Icon className="w-6 h-6 text-marketing-blue" aria-hidden="true" />
            </div>
          )}
          <h1 className="text-2xl font-display font-bold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="text-slate-400 mt-1.5 text-sm">{subtitle}</p>}
        </div>

        {/* Glass card form container */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-8 shadow-2xl">
          {children}
        </div>

        {/* Footer link */}
        {footer && (
          <p className="text-center text-sm text-slate-400 mt-6">{footer}</p>
        )}

        {/* Shield footer */}
        <p className="text-center text-[10px] text-slate-600 mt-8">
          Secured by the Orbit Shield™ — Powered by Regulate
        </p>
      </div>
    </div>
  );
}