import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { MicrosoftIcon, AppleIcon } from "@/components/SSOIcons";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      // Build #28.2G.1 — Return to the originally requested page after login.
      // Checks URL params, then sessionStorage fallback from AuthContext.
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get("next") || urlParams.get("returnUrl");
      let destination = "/workspace";
      if (returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//")) {
        destination = returnUrl;
      } else {
        try {
          const stored = sessionStorage.getItem("orbitan_auth_return_url");
          if (stored && stored.startsWith("/") && !stored.startsWith("//") && !stored.startsWith("/login")) {
            destination = stored;
          }
        } catch {
          // sessionStorage unavailable — use default
        }
      }
      // Clear the stored return URL
      try { sessionStorage.removeItem("orbitan_auth_return_url"); } catch {}
      window.location.href = destination;
    } catch (err) {
      // Build #28.2G.1 — Never expose sensitive auth details. Show user-friendly messages.
      const msg = err?.message || "";
      if (msg.includes("rate") || msg.includes("too many") || msg.includes("429")) {
        setError("Too many login attempts. Please wait a moment and try again.");
      } else if (msg.includes("disabled") || msg.includes("banned") || msg.includes("suspended")) {
        setError("Your account has been suspended. Please contact your administrator.");
      } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("connection")) {
        setError("Unable to connect. Please check your internet connection and try again.");
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    // Build #28.2G.1 — Preserve return path for OAuth redirects
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get("next") || "/workspace";
    base44.auth.loginWithProvider("google", returnUrl);
  };

  const handleMicrosoft = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get("next") || "/workspace";
    base44.auth.loginWithProvider("microsoft", returnUrl);
  };

  const handleApple = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get("next") || "/workspace";
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

      {error && (
        <div role="alert" aria-live="assertive" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-blue-400 hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
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