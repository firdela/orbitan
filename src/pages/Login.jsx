import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import AuthAlert from "@/components/auth/AuthAlert";
import PasswordInput from "@/components/auth/PasswordInput";
import GoogleIcon from "@/components/GoogleIcon";
import { MicrosoftIcon, AppleIcon } from "@/components/SSOIcons";
import { classifyLoginError, AUTH_ERROR_TYPES } from "@/lib/auth-errors";
import { navigateToReturnUrl, consumeSessionExpiredFlag, resolveReturnUrl } from "@/lib/auth-redirects";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef(null);

  // Show "session expired" message if the user was redirected here by AuthContext
  useEffect(() => {
    const expired = consumeSessionExpiredFlag();
    if (expired) {
      setInfo("Your session has expired. Please sign in again to continue.");
    }
  }, []);

  // Focus the first field on mount for keyboard users
  useEffect(() => {
    const timer = setTimeout(() => {
      const firstField = formRef.current?.querySelector('input[type="email"]');
      if (firstField) firstField.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      // Use the canonical redirect utility — validates and sanitizes the return URL
      navigateToReturnUrl("/workspace");
    } catch (err) {
      const authError = classifyLoginError(err);

      // If verification is required, show a helpful message with a link to resend
      if (authError.type === AUTH_ERROR_TYPES.VERIFICATION_REQUIRED) {
        setError(authError.message);
        setInfo("");
      } else {
        setError(authError.message);
      }

      // Focus the form for screen readers after error
      setTimeout(() => {
        const errorEl = formRef.current?.querySelector('[role="alert"]');
        errorEl?.focus();
      }, 50);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="text-blue-400 font-medium hover:underline">
            Create one
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

      {info && <AuthAlert variant="warning" message={info} />}
      {error && <AuthAlert variant="error" message={error} />}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
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
          autoComplete="current-password"
          autoFocus={false}
        />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-blue-400 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}