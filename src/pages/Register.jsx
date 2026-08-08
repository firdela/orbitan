import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import AuthAlert from "@/components/auth/AuthAlert";
import PasswordInput from "@/components/auth/PasswordInput";
import GoogleIcon from "@/components/GoogleIcon";
import { MicrosoftIcon, AppleIcon } from "@/components/SSOIcons";
import { classifyRegisterError, classifyVerifyError, AUTH_ERROR_TYPES } from "@/lib/auth-errors";
import { navigateToReturnUrl, resolveReturnUrl } from "@/lib/auth-redirects";
import { validatePassword } from "@/lib/auth-password-policy";

const RESEND_COOLDOWN_SECONDS = 30;

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpFormRef = useRef(null);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Focus first OTP slot when OTP view shows
  useEffect(() => {
    if (showOtp) {
      const timer = setTimeout(() => {
        const firstSlot = otpFormRef.current?.querySelector('input');
        firstSlot?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showOtp]);

  // Mask email for display (e.g., f***@example.com)
  const maskedEmail = (() => {
    if (!email) return "";
    const [localPart, domain] = email.split("@");
    if (!domain) return email;
    if (localPart.length <= 2) return `${localPart[0]}***@${domain}`;
    return `${localPart[0]}${"*".repeat(Math.min(localPart.length - 1, 3))}@${domain}`;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const passwordCheck = validatePassword(password, confirmPassword);
    if (!passwordCheck.valid) {
      setError(passwordCheck.message);
      return;
    }

    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const authError = classifyRegisterError(err);
      setError(authError.message);

      // If already verified, show a success state with link to login
      if (authError.type === AUTH_ERROR_TYPES.ACCOUNT_EXISTS) {
        setError(authError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      // Use canonical redirect utility
      navigateToReturnUrl("/workspace");
    } catch (err) {
      const authError = classifyVerifyError(err);
      setError(authError.message);

      // If already verified, redirect to login after showing the message
      if (authError.type === AUTH_ERROR_TYPES.ACCOUNT_ALREADY_VERIFIED) {
        setTimeout(() => { window.location.href = '/login'; }, 2000);
        return;
      }

      // Focus the error alert for screen readers
      setTimeout(() => {
        const errorEl = otpFormRef.current?.querySelector('[role="alert"]');
        errorEl?.focus();
      }, 50);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || resendLoading) return;

    setError("");
    setResendSuccess(false);
    setResendLoading(true);
    try {
      await base44.auth.resendOtp(email);
      setResendSuccess(true);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);

      // Clear success message after 5 seconds
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err) {
      const authError = classifyVerifyError(err);
      setError(authError.message);
    } finally {
      setResendLoading(false);
    }
  }, [email, resendCooldown, resendLoading]);

  const handleGoogle = () => {
    const returnUrl = resolveReturnUrl("/workspace");
    base44.auth.loginWithProvider("google", returnUrl);
  };

  const handleMicrosoft = () => {
    const returnUrl = resolveReturnUrl("/workspace");
    base44.auth.loginWithProvider("microsoft", returnUrl);
  };

  const handleApple = () => {
    const returnUrl = resolveReturnUrl("/workspace");
    base44.auth.loginWithProvider("apple", returnUrl);
  };

  // ── OTP Verification View ──
  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title="Verify your email"
        subtitle={`We sent a 6-digit code to ${maskedEmail}`}
        footer={
          <Link to="/login" className="text-blue-400 font-medium hover:underline">
            Back to log in
          </Link>
        }
      >
        <div ref={otpFormRef}>
          {error && <AuthAlert variant="error" message={error} />}
          {resendSuccess && (
            <AuthAlert variant="success" message="A new verification code has been sent to your email." />
          )}

          <div className="flex justify-center mb-6">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={setOtpCode}
              autoFocus
              autoComplete="one-time-code"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            className="w-full h-12 font-medium"
            onClick={handleVerify}
            disabled={loading || otpCode.length < 6}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify email"
            )}
          </Button>

          <p className="text-center text-sm text-slate-400 mt-4">
            {resendCooldown > 0 ? (
              <>Resend available in {resendCooldown}s</>
            ) : (
              <>
                Didn't receive the code?{" "}
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-blue-400 font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendLoading ? "Sending..." : "Resend code"}
                </button>
              </>
            )}
          </p>
        </div>
      </AuthLayout>
    );
  }

  // ── Registration Form View ──
  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Sign up to get started"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-blue-400 font-medium hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Button
          variant="outline"
          className="w-full h-12 text-sm font-medium border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white"
          onClick={handleGoogle}
        >
          <GoogleIcon className="w-5 h-5 mr-2" />
          Google
        </Button>
        <Button
          variant="outline"
          className="w-full h-12 text-sm font-medium border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white"
          onClick={handleMicrosoft}
        >
          <MicrosoftIcon className="w-5 h-5 mr-2" />
          Microsoft
        </Button>
        <Button
          variant="outline"
          className="w-full h-12 text-sm font-medium border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white"
          onClick={handleApple}
        >
          <AppleIcon className="w-5 h-5 mr-2" />
          Apple
        </Button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.08]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white/[0.03] px-3 text-slate-500">or</span>
        </div>
      </div>

      {error && <AuthAlert variant="error" message={error} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
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
            />
          </div>
        </div>
        <PasswordInput
          id="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          autoFocus={false}
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
          error={confirmPassword && password !== confirmPassword ? "Passwords do not match" : ""}
        />
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}