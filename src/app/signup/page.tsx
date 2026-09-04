"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClinic } from "@/context/ClinicContext";
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Heart,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  Phone,
  Loader2,
} from "lucide-react";
import OtpVerificationModal from "@/components/auth/OtpVerificationModal";
import DigitalPatientCard, { PatientCardData } from "@/components/patient/DigitalPatientCard";

export default function SignUpPage() {
  const router = useRouter();
  const { login, setCurrentRole } = useClinic();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("+251 9");

  const [nationalId, setNationalId] = useState("");
  const [isVerifyingNid, setIsVerifyingNid] = useState(false);
  const [nidVerified, setNidVerified] = useState(false);
  const [nidError, setNidError] = useState<string | null>(null);

  const [preferredClinicBranch, setPreferredClinicBranch] = useState("habitat-main");
  const [dateOfBirth, setDateOfBirth] = useState("1995-04-12");
  const [gender, setGender] = useState<"male" | "female" | "other">("female");
  const [bloodType, setBloodType] = useState("O+");
  const [mrn, setMrn] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpIdentifier, setOtpIdentifier] = useState("");
  const [otpChannel, setOtpChannel] = useState<"email" | "sms">("email");
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  const [issuedCard, setIssuedCard] = useState<PatientCardData | null>(null);
  const [redirectDestination, setRedirectDestination] = useState("/patient/dashboard");

  const getPasswordStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };
  const pwdScore = getPasswordStrength();

  const handleVerifyNationalId = async () => {
    if (!nationalId.trim()) {
      setNidError("Please enter your Ethiopian National ID or Fayda number.");
      return;
    }

    setIsVerifyingNid(true);
    setNidError(null);

    try {
      const res = await fetch("/api/v1/auth/verify-national-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nationalId, fullName, dateOfBirth }),
      });

      const data = await res.json();
      if (!data.success) {
        setNidError(data.error || "National ID verification failed.");
        setNidVerified(false);
      } else {
        setNidVerified(true);
        setNidError(null);
      }
    } catch (err: any) {
      setNidError(err.message || "Failed to verify National ID with registry.");
      setNidVerified(false);
    } finally {
      setIsVerifyingNid(false);
    }
  };

  const handleSignUp = async (e?: React.FormEvent, tokenOverride?: string) => {
    if (e) e.preventDefault();
    if (!agreedToTerms) {
      setErrorMsg("Please accept the HIPAA compliance terms and privacy policy.");
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    const base = pendingPayload || {
      accountType: "patient",
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: "patient",
      nationalId: nationalId.trim() || undefined,
      preferredClinicBranch,
      phone: phone.trim() || undefined,
      dateOfBirth,
      gender,
      bloodType,
      mrn: mrn || `MRN-${Math.floor(10000 + Math.random() * 90000)}`,
    };

    const activeToken = tokenOverride || base.verificationToken;
    const payload = { ...base, verificationToken: activeToken };

    try {
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.requireVerification && !activeToken) {
        setPendingPayload(payload);
        setOtpIdentifier(data.identifier || email);
        setOtpChannel(data.channel || "email");
        setShowOtpModal(true);
        setIsLoading(false);
        return;
      }

      if (!data.success) {
        setErrorMsg(data.error || "Failed to create account.");
        setIsLoading(false);
        return;
      }

      if (data.user) {
        login(data.user);
        setCurrentRole(data.user.role);
      }

      setPendingPayload(null);
      const dest = data.redirectUrl || "/patient/dashboard";
      setRedirectDestination(dest);

      if (data.patientCard) {
        setIssuedCard(data.patientCard);
        setSuccessMsg("Account verified! Your Digital Patient Card and Login Code have been generated.");
      } else {
        setSuccessMsg(`Welcome to NiniMed, ${data.user?.fullName || "Patient"}! Redirecting to your dashboard...`);
        setTimeout(() => router.push(dest), 1000);
      }
    } catch {
      setErrorMsg("Network error occurred during registration. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerified = (token: string) => {
    setShowOtpModal(false);
    handleSignUp(undefined, token);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4">
      <div className="max-w-4xl w-full">
        {issuedCard ? (
          <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-emerald-500/40 bg-slate-900/95 backdrop-blur-2xl shadow-2xl space-y-6 text-center animate-fade-in">
            <div className="max-w-md mx-auto space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Account & National ID Verified
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Your NiniMed Digital Patient Card</h1>
              <p className="text-xs text-slate-400">
                Your patient account and digital card are ready. Use your login passcode for instant self-check-in.
              </p>
            </div>

            <DigitalPatientCard
              card={issuedCard}
              onProceed={() => router.push(redirectDestination)}
              showProceedButton={true}
            />

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="px-4 py-2.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 text-xs font-bold hover:bg-cyan-500/20"
              >
                Need immediate intake form?
              </button>
              <button
                type="button"
                onClick={() => router.push(redirectDestination)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 text-xs font-extrabold"
              >
                Go to my dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-slate-800/90 bg-slate-900/90 backdrop-blur-2xl shadow-2xl space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-bold uppercase">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                Patient Access Portal
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Create Your Patient Account</h1>
              <p className="text-xs text-slate-400">
                Register once to access your care record, digital card, and case submission flow.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Abebe Tadesse Bekele"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. abebe.t@example.com"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create secure password"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-teal-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden flex gap-1">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pwdScore >= 1
                              ? pwdScore === 1
                                ? "bg-red-400 w-1/4"
                                : pwdScore === 2
                                ? "bg-amber-400 w-2/4"
                                : pwdScore === 3
                                ? "bg-cyan-400 w-3/4"
                                : "bg-emerald-400 w-full"
                              : "w-0"
                          }`}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {pwdScore <= 1 ? "Weak" : pwdScore <= 3 ? "Medium" : "Strong ✓"}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+251 911 234 567"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Ethiopian National ID / Fayda Number Verification</span>
                  </div>
                  {nidVerified && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase">
                      ID Authenticated ✓
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8">
                    <input
                      type="text"
                      value={nationalId}
                      onChange={(e) => {
                        setNationalId(e.target.value);
                        setNidVerified(false);
                        setNidError(null);
                      }}
                      placeholder="e.g. FIN-8492-4910-4829 or ETH-928174"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-white placeholder:text-slate-600 uppercase focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <button
                      type="button"
                      onClick={handleVerifyNationalId}
                      disabled={isVerifyingNid || !nationalId.trim() || nidVerified}
                      className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
                        nidVerified
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                      }`}
                    >
                      {isVerifyingNid ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : nidVerified ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      {isVerifyingNid ? "Verifying..." : nidVerified ? "Verified" : "Verify National ID"}
                    </button>
                  </div>
                </div>

                {nidError && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {nidError}
                  </p>
                )}
                <p className="text-[10px] text-slate-400">
                  Your National ID links your digital medical record across all 4 Debre Birhan clinic branches.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                  <Heart className="w-4 h-4" />
                  <span>Patient Profile & Preferred Clinic Branch</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other / Undisclosed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Blood Type</label>
                    <select
                      value={bloodType}
                      onChange={(e) => setBloodType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    >
                      <option value="O+">O Positive (O+)</option>
                      <option value="O-">O Negative (O-)</option>
                      <option value="A+">A Positive (A+)</option>
                      <option value="A-">A Negative (A-)</option>
                      <option value="B+">B Positive (B+)</option>
                      <option value="B-">B Negative (B-)</option>
                      <option value="AB+">AB Positive (AB+)</option>
                      <option value="AB-">AB Negative (AB-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Primary Clinic Branch</label>
                    <select
                      value={preferredClinicBranch}
                      onChange={(e) => setPreferredClinicBranch(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-300 font-bold"
                    >
                      <option value="habitat-main">Habitat (Main 24/7 ER)</option>
                      <option value="tebasse-branch">Tebasse Clinic</option>
                      <option value="atakilt-branch">Atakilt Clinic</option>
                      <option value="liche-branch">Liche Health Center</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">MRN / Patient Identifier</label>
                    <input
                      type="text"
                      value={mrn}
                      onChange={(e) => setMrn(e.target.value)}
                      placeholder="Optional - auto-generated if empty"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-400 hover:text-slate-300">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 bg-slate-950 text-teal-500 focus:ring-teal-400"
                  />
                  <span>
                    I agree to the <strong className="text-teal-300">NiniMed Terms of Service</strong>, HIPAA & National Health Data Directives, and consent to Digital Patient Card issuance.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold transition-all shadow-xl shadow-teal-950/40 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Verify National ID & Issue Digital Patient Card</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
              <div>
                Already have a patient account? {" "}
                <Link href="/signin" className="text-teal-400 font-bold hover:underline">Sign in</Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <OtpVerificationModal
        isOpen={showOtpModal}
        identifier={otpIdentifier}
        initialChannel={otpChannel}
        purpose="account_registration"
        fullName={fullName}
        onVerified={handleOtpVerified}
        onClose={() => setShowOtpModal(false)}
      />
    </div>
  );
}
