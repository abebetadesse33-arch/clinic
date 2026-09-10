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
  Stethoscope,
  ArrowLeft,
} from "lucide-react";

function getSafeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/patient/dashboard";
  }
  return value;
}

function getDestinationLabel(path: string): string {
  if (path.startsWith("/services/virtual-urgent-care/triage")) return "Virtual urgent care triage";
  if (path.startsWith("/patient/")) return "your patient workspace";
  return "your requested care workspace";
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#071521] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-sky-300 animate-spin" />
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
  const returnTo = getSafeReturnPath(searchParams.get("redirect"));
  const destinationLabel = getDestinationLabel(returnTo);

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
                ? getSafeReturnPath(json.redirectTo)
                : returnTo || (json.user?.role === "patient" ? "/patient/dashboard" : "/");
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

      setSuccessMsg(`Welcome, ${data.user.fullName}. Redirecting to ${destinationLabel}...`);
      login(data.user);

      setTimeout(() => {
        const destination =
          data.redirectTo && data.redirectTo !== "/"
            ? getSafeReturnPath(data.redirectTo)
            : returnTo || (data.user.role === "patient" ? "/patient/dashboard" : "/");
        router.push(destination);
      }, 600);
    } catch {
      setErrorMsg("Network error occurred during sign in. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 sm:py-10 px-3 sm:px-6">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
        {/* Left Clinical Branding (hidden or compact on small screens for instant native login) */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-6">
          <div className="space-y-2.5 sm:space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Secure Clinical Gateway
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Sign in to <span className="text-[#005C4B] dark:text-teal-400">NiniMed</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Protected authentication for patients, physicians, and care teams with integrated HIPAA audit trails.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-teal-500/20 bg-teal-500/5 dark:bg-teal-500/10 p-3.5 sm:p-4">
            <Stethoscope className="mt-0.5 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#005C4B] dark:text-teal-400" />
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Preserved Destination</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                You will be redirected to <strong className="text-slate-900 dark:text-white font-medium">{destinationLabel}</strong> upon verification.
              </p>
            </div>
          </div>

          {/* Clinical Assurance Pills (Hidden on mobile to keep login fast) */}
          <div className="hidden lg:grid gap-2.5 pt-1">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">HIPAA & 21 CFR Part 11</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Role-scoped encryption with cryptographic session tokens</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-[#005C4B] dark:text-teal-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Universal Health Identity</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Single credentials for patient portal and clinician workstations</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Authentication Card */}
        <div className="lg:col-span-7">
          <div className="p-5 sm:p-8 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 space-y-5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">Credentials</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Protected Session
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your registered clinical email, phone, or MRN.
              </p>
            </div>

            {/* Segmented Mode Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLoginMethod("password")}
                className={`py-2 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  loginMethod === "password"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-[#005C4B] dark:text-teal-400" />
                <span>Password</span>
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod("qr_scan")}
                className={`py-2 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  loginMethod === "qr_scan"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-[#005C4B] dark:text-teal-400" />
                <span>Scan App QR</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {loginMethod === "qr_scan" ? (
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-teal-500/30 text-center space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#005C4B] dark:text-teal-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <Smartphone className="w-4 h-4" /> Instant Mobile Sign In
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Scan with the NiniMed mobile app to authorize this session immediately.
                  </p>
                </div>

                <div className="w-48 h-48 mx-auto p-4 rounded-2xl bg-white flex flex-col items-center justify-center shadow-lg border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                  {isCreatingQr ? (
                    <Loader2 className="w-9 h-9 text-[#005C4B] animate-spin" />
                  ) : qrChallenge ? (
                    <>
                      <QrCode className="w-36 h-36 text-slate-950" />
                      <span className="text-[9px] font-mono font-bold text-slate-600 uppercase mt-1">Scan to authorize</span>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <p className="text-xs font-bold text-slate-900">QR Expired</p>
                      <button
                        type="button"
                        onClick={generateQrChallenge}
                        className="mt-2 px-3 py-1.5 bg-[#005C4B] hover:bg-[#00483B] text-white rounded-xl text-xs font-bold flex items-center gap-1 mx-auto transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" /> Refresh
                      </button>
                    </div>
                  )}
                </div>

                {qrChallenge && (
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span className="flex items-center gap-1 text-[#005C4B] dark:text-teal-400 font-mono">
                      <Loader2 className="w-3 h-3 animate-spin text-[#005C4B] dark:text-teal-400" /> Awaiting authorization...
                    </span>
                    <span className="font-mono">{qrSecondsLeft}s remaining</span>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Email, Phone, or MRN
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="name@ninimed.org or +251..."
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#005C4B] dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-500/15 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-[11px] text-[#005C4B] hover:text-[#00483B] dark:text-teal-400 dark:hover:text-teal-300 font-medium transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#005C4B] dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-500/15 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-[#005C4B] focus:ring-teal-500"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400">Remember credentials on this browser</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-[#005C4B] hover:bg-[#00483B] dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-900/10 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
              <div>
                New to NiniMed?{" "}
                <Link
                  href={`/signup?redirect=${encodeURIComponent(returnTo)}`}
                  className="text-[#005C4B] dark:text-teal-400 font-bold hover:underline"
                >
                  Create patient account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Reset Account Password</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Enter your registered clinical email to receive reset authorization instructions.
            </p>
            {resetSent ? (
              <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs text-[#005C4B] dark:text-teal-300">
                Reset instructions dispatched. Please check your inbox.
              </div>
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#005C4B] dark:focus:border-teal-400"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#005C4B] hover:bg-[#00483B] text-white text-xs font-extrabold"
                  >
                    Send Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
