import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import AuthAlert from "@/components/auth/AuthAlert";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const formRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch {
      // Always show the same success response regardless of whether
      // the email exists or not. This prevents account enumeration —
      // an attacker cannot determine if an email is registered by
      // observing different responses.
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  // ── Success State ──
  if (sent) {
    return (
      <AuthLayout
        icon={CheckCircle2}
        title="Check your email"
        subtitle="If an account exists, a reset link is on its way"
        footer={
          <Link to="/login" className="text-blue-400 font-medium hover:underline">
            <ArrowLeft className="w-3 h-3 inline mr-1" />
            Back to log in
          </Link>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-12 h-12 text-orbitan-green" aria-hidden="true" />
            <p className="text-sm text-slate-200">
              If an account exists with that email, you'll receive a password reset link shortly.
            </p>
            <p className="text-xs text-slate-400">
              Didn't receive an email? Check your spam folder, or{" "}
              <Link to="/forgot-password" className="text-blue-400 hover:underline">
                try again
              </Link>
              .
            </p>
          </div>
          <Link to="/login">
            <Button variant="outline" className="w-full h-11 border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] rounded-xl gap-2">
              <ArrowLeft className="w-4 h-4" />
              Return to login
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // ── Request Form ──
  return (
    <AuthLayout
      icon={Mail}
      title="Reset password"
      subtitle="We'll send you a link to reset it"
      footer={
        <Link to="/login" className="text-blue-400 font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" />
          Back to log in
        </Link>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
              aria-describedby="email-help"
            />
          </div>
          <p id="email-help" className="text-xs text-slate-400">
            Enter the email associated with your account. We'll send a secure reset link.
          </p>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}