"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  Mail,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Lock,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  identifier: string; // e.g. "user@example.com" or "+251911234567"
  initialChannel?: "email" | "sms";
  purpose?: string;
  fullName?: string;
  onVerified: (verificationToken: string) => void;
  onClose: () => void;
}

export default function OtpVerificationModal({
  isOpen,
  identifier,
  initialChannel = "email",
  purpose = "account_registration",
  fullName,
  onVerified,
  onClose,
}: Props) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [channel, setChannel] = useState<"email" | "sms">(initialChannel);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [debugCode, setDebugCode] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Send initial OTP when modal opens
  useEffect(() => {
    if (isOpen && identifier) {
      sendOtp(channel);
    }
  }, [isOpen, identifier]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Focus first input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 200);
    }
  }, [isOpen]);

  const sendOtp = async (ch: "email" | "sms") => {
    setIsResending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/v1/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          channel: ch,
          purpose,
          fullName,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to dispatch verification code.");
      }

      if (data.bypassed) {
        setSuccessMsg(data.message);
        setTimeout(() => onVerified("vtoken_admin_bypassed"), 800);
        return;
      }

      setSuccessMsg(data.message || `Verification code sent via ${ch.toUpperCase()}!`);
      if (data.data?.debugCode) {
        setDebugCode(data.data.debugCode);
      }
      setCountdown(60);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to dispatch verification code.");
    } finally {
      setIsResending(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    // Only allow single numeric character
    const cleaned = value.replace(/[^0-9]/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleaned;
    setDigits(newDigits);
    setErrorMsg(null);

    // Auto-advance focus to next input
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // If all 6 digits entered, auto-verify
    if (cleaned && index === 5 && newDigits.every((d) => d.length === 1)) {
      verifyCode(newDigits.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (pastedData.length === 6) {
      const newDigits = pastedData.split("");
      setDigits(newDigits);
      inputRefs.current[5]?.focus();
      verifyCode(pastedData);
    }
  };

  const verifyCode = async (codeToVerify?: string) => {
    const code = codeToVerify || digits.join("");
    if (code.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          code,
          purpose,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Invalid verification code.");
      }

      setSuccessMsg("Identity verified successfully!");
      setTimeout(() => {
        onVerified(data.verificationToken || `vtoken_${Date.now()}`);
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify code.");
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDebugCode = () => {
    if (debugCode) {
      const newDigits = debugCode.split("");
      setDigits(newDigits);
      verifyCode(debugCode);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-slide-up relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30 flex items-center justify-center mx-auto shadow-lg shadow-teal-950/40">
          <ShieldCheck className="w-8 h-8 text-teal-400" />
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Security Verification Required
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            We sent a 6-digit verification code to{" "}
            <strong className="text-teal-300 font-mono block mt-0.5">{identifier}</strong>
          </p>
        </div>

        {/* Channel Switcher */}
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              setChannel("email");
              sendOtp("email");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              channel === "email"
                ? "bg-teal-500/20 border border-teal-500/40 text-teal-300"
                : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
            }`}
          >
            <Mail className="w-3.5 h-3.5" /> Email OTP
          </button>
          <button
            type="button"
            onClick={() => {
              setChannel("sms");
              sendOtp("sms");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              channel === "sms"
                ? "bg-teal-500/20 border border-teal-500/40 text-teal-300"
                : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> SMS OTP
          </button>
        </div>

        {/* 6-Digit Pin Input */}
        <div className="flex justify-center gap-2 sm:gap-3 my-4">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={isSubmitting}
              className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-mono font-black rounded-2xl border transition-all ${
                digit
                  ? "border-teal-400 bg-teal-500/10 text-white shadow-lg shadow-teal-500/10"
                  : "border-slate-700 bg-slate-950/80 text-slate-300 focus:border-teal-500 focus:bg-slate-900"
              } focus:outline-none`}
            />
          ))}
        </div>

        {/* Debug / Demo Quick-fill Pill */}
        {debugCode && (
          <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-teal-950/40 border border-teal-500/30 text-xs">
            <span className="text-slate-400 font-medium">Demo Code:</span>
            <span className="font-mono font-bold text-teal-300">{debugCode}</span>
            <button
              onClick={fillDebugCode}
              className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-teal-500 hover:bg-teal-400 text-slate-950 transition-colors ml-1"
            >
              Autofill
            </button>
          </div>
        )}

        {/* Messages */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && !errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Verify Action Button */}
        <button
          onClick={() => verifyCode()}
          disabled={isSubmitting || digits.some((d) => !d)}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm transition-all shadow-xl shadow-teal-900/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
          {isSubmitting ? "Verifying Code..." : "Verify & Complete Registration"}
          {!isSubmitting && <ArrowRight className="w-4 h-4" />}
        </button>

        {/* Resend OTP Timer */}
        <div className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <span>Didn&apos;t receive the code?</span>
          {countdown > 0 ? (
            <span className="font-mono text-teal-400 font-bold">Resend in {countdown}s</span>
          ) : (
            <button
              onClick={() => sendOtp(channel)}
              disabled={isResending}
              className="font-bold text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-1"
            >
              {isResending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Resend Code Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
