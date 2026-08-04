import React, { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import AuthAlert from "@/components/auth/AuthAlert";
import PasswordInput from "@/components/auth/PasswordInput";
import { classifyResetError } from "@/lib/auth-errors";
import { clearReturnUrl } from "@/lib/auth-redirects";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const formRef = useRef(null);

  // Focus first field on mount
  useEffect(() => {
    if (resetToken && !success) {
      const timer = setTimeout(() => {
        const firstField = formRef.current?.querySelector('input');
        if (firstField) firstField.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [resetToken, success]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please ensure both fields are identical.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken, newPassword });
      setSuccess(true);
      // replace() removes the token-bearing URL from browser history so the
      // reset link cannot be reused via the back button or history navigation.
      // The platform auth backend invalidates the token server-side; this
      // client-side measure prevents the token URL from lingering in history.
      clearReturnUrl();
      setTimeout(() => window.location.replace("/login"), 2000);
    } catch (err) {
      const authError = classifyResetError(err);
      setError(authError.message);

      // Focus the error alert for screen readers
      setTimeout(() => {
        const errorEl = formRef.current?.querySelector('[role="alert"]');
        errorEl?.focus();
      }, 50);
    } finally {
      setLoading(false);
    }
  };

  // ── Missing Token ──
  if (!resetToken) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title="Invalid reset link"
        subtitle="This password reset link is missing or incomplete"
        footer={
          <Link to="/forgot-password" className="text-blue-400 font-medium hover:underline">
            Request a new link
          </Link>
        }
      >
        <div className="space-y-4">
          <AuthAlert
            variant="warning"
            message="The link you used appears to be incomplete or invalid. Please request a new password reset email."
            autoFocus={true}
          />
          <Link to="/forgot-password">
            <Button variant="outline" className="w-full h-11 border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] rounded-xl gap-2">
              Request new link
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // ── Success State ──
  if (success) {
    return (
      <AuthLayout
        icon={CheckCircle2}
        title="Password updated"
        subtitle="Your password has been changed successfully"
        footer={
          <Link to="/login" className="text-blue-400 font-medium hover:underline">
            Go to login
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="w-12 h-12 text-orbitan-green" aria-hidden="true" />
          <p className="text-sm text-slate-200">
            Your password was changed successfully. You will be redirected to the login page shortly.
          </p>
        </div>
      </AuthLayout>
    );
  }

  // ── Reset Form ──
  return (
    <AuthLayout
      icon={Lock}
      title="New password"
      subtitle="Enter your new password below"
      footer={
        <Link to="/login" className="text-blue-400 font-medium hover:underline">
          Back to log in
        </Link>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        {error && <AuthAlert variant="error" message={error} />}

        <PasswordInput
          id="password"
          label="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          autoFocus={true}
          showRequirements={true}
          showStrength={true}
        />
        <PasswordInput
          id="confirm"
          label="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          autoFocus={false}
          error={confirmPassword && newPassword !== confirmPassword ? "Passwords do not match" : ""}
        />
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Resetting...
            </>
          ) : (
            "Reset password"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}