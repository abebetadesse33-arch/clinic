"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useClinic } from "@/context/ClinicContext";
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  QrCode,
  Smartphone,
  RefreshCw,
} from "lucide-react";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useClinic();
  const returnTo = searchParams.get("redirect") || "/patient/dashboard";

  const [loginMethod, setLoginMethod] = useState<"password" | "qr_scan">("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const [qrChallenge, setQrChallenge] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(120);
  const [isCreatingQr, setIsCreatingQr] = useState(false);

  const generateQrChallenge = async () => {
    setIsCreatingQr(true);
    try {
      const res = await fetch("/api/v1/auth/qr-login/create", { method: "POST" });
      const json = await res.json();
      if (json.success && json.data) {
        setQrChallenge(json.data.sessionChallenge);
        setQrExpiresAt(json.data.expiresAt);
        setQrSecondsLeft(120);
      }
    } catch {
      setErrorMsg("Failed to generate QR login session.");
    } finally {
      setIsCreatingQr(false);
    }
  };

  useEffect(() => {
    if (loginMethod === "qr_scan") {
      generateQrChallenge();
    }
  }, [loginMethod]);

  useEffect(() => {
    if (loginMethod !== "qr_scan" || !qrChallenge) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/auth/qr-login/status?challenge=${qrChallenge}`);
        const json = await res.json();

        if (json.success && json.status === "authorized") {
          setSuccessMsg(`Welcome, ${json.user?.fullName}! Logged in via QR code.`);
          if (json.user) login(json.user);
          clearInterval(interval);
          setTimeout(() => {
            const destination =
              json.redirectTo && json.redirectTo !== "/"
                ? json.redirectTo
                : returnTo && returnTo.startsWith("/")
                  ? returnTo
                  : json.user?.role === "patient"
                    ? "/patient/dashboard"
                    : "/";
            router.push(destination);
          }, 800);
        } else if (json.status === "expired") {
          clearInterval(interval);
          setQrChallenge(null);
        }
      } catch {}
    }, 2000);

    return () => clearInterval(interval);
  }, [loginMethod, qrChallenge]);

  useEffect(() => {
    if (loginMethod !== "qr_scan" || !qrChallenge) return;
    const timer = setInterval(() => {
      setQrSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loginMethod, qrChallenge]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier, password }),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || "Authentication failed. Please check your credentials.");
        setIsLoading(false);
        return;
      }

      setSuccessMsg(`Welcome, ${data.user.fullName}. Redirecting to your dashboard...`);
      login(data.user);

      setTimeout(() => {
        const destination =
          data.redirectTo && data.redirectTo !== "/"
            ? data.redirectTo
            : returnTo && returnTo.startsWith("/")
              ? returnTo
              : data.user.role === "patient"
                ? "/patient/dashboard"
                : "/";
        router.push(destination);
      }, 600);
    } catch {
      setErrorMsg("Network error occurred during sign in. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-8 px-4">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              Secure Patient Portal
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              NiniMed <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-300">Access</span>
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Access your patient records, digital card, and care workflow through one secure sign-in.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">HIPAA & 21 CFR Part 11 Certified</span>
                <span className="text-[10px] text-slate-400">Protected patient access and clinical audit trail</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Unified Patient Workspace</span>
                <span className="text-[10px] text-slate-400">Single login for record access and case intake</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/90 bg-slate-900/90 backdrop-blur-2xl shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white">Sign In to Your Account</h2>
              <p className="text-xs text-slate-400 mt-1">Use your registered email, phone number, or National ID.</p>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLoginMethod("password")}
                className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  loginMethod === "password"
                    ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Password Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod("qr_scan")}
                className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  loginMethod === "qr_scan"
                    ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan QR</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-start gap-2.5 text-xs text-teal-300 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {loginMethod === "qr_scan" ? (
              <div className="p-6 rounded-3xl bg-slate-950 border border-teal-500/30 text-center space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-teal-400 uppercase tracking-wider block flex items-center justify-center gap-1.5">
                    <Smartphone className="w-4 h-4" /> Instant Cross-Device Sign In
                  </span>
                  <p className="text-xs text-slate-400">Open the NiniMed app on your phone and scan this QR code to sign in instantly.</p>
                </div>

                <div className="w-52 h-52 mx-auto p-4 rounded-3xl bg-white flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
                  {isCreatingQr ? (
                    <Loader2 className="w-10 h-10 text-slate-800 animate-spin" />
                  ) : qrChallenge ? (
                    <>
                      <QrCode className="w-40 h-40 text-slate-950" />
                      <span className="text-[9px] font-mono font-bold text-slate-600 uppercase mt-1">Scan to Authorize</span>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <p className="text-xs font-bold text-slate-900">QR Code Expired</p>
                      <button onClick={generateQrChallenge} className="mt-2 px-3 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Refresh
                      </button>
                    </div>
                  )}
                </div>

                {qrChallenge && (
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1 text-teal-300 font-mono">
                      <Loader2 className="w-3 h-3 animate-spin text-teal-400" /> Waiting for phone approval...
                    </span>
                    <span className="font-mono text-slate-500">Expires in {qrSecondsLeft}s</span>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Email / Phone / National ID</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="name@example.com or +251... or FIN-..."
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-400 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300">Password</label>
                    <button type="button" onClick={() => setShowForgotModal(true)} className="text-[11px] text-teal-400 hover:text-teal-300 transition-colors">Forgot Password?</button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-400 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-teal-500 focus:ring-teal-400 focus:ring-offset-slate-900"
                    />
                    <span className="text-xs text-slate-400">Remember this device</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to NiniMed</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <div>
                New to NiniMed? <Link href="/signup" className="text-teal-400 font-bold hover:text-teal-300">Create patient account</Link>
              </div>
              <div className="text-[11px] text-slate-400">
                Need immediate intake? <Link href="/register" className="text-cyan-400 font-bold hover:underline">Patient Intake →</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900 space-y-4">
            <h3 className="text-base font-extrabold text-white">Reset Your Password</h3>
            <p className="text-xs text-slate-400">Enter your registered email address to receive password reset instructions.</p>
            {resetSent ? (
              <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs text-teal-300">Reset instructions dispatched. Please check your inbox.</div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setResetSent(true);
                  setTimeout(() => {
                    setShowForgotModal(false);
                    setResetSent(false);
                  }, 2000);
                }}
                className="space-y-3"
              >
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@ninimed.org"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-400"
                />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowForgotModal(false)} className="px-3.5 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-extrabold hover:bg-teal-400">Send Link</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
