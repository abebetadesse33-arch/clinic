"use client";

import React from "react";
import Link from "next/link";
import {
  Smartphone,
  Download,
  QrCode,
  Share2,
  Chrome,
  Apple,
  CheckCircle2,
  ArrowRight,
  Wifi,
  Bell,
  Zap,
  Shield,
} from "lucide-react";

const FEATURES = [
  { icon: Wifi, label: "Works offline", desc: "View records without internet" },
  { icon: Bell, label: "Push alerts", desc: "Appointment & lab notifications" },
  { icon: Zap, label: "Instant triage", desc: "AI symptom check in seconds" },
  { icon: Shield, label: "Encrypted", label2: "secure", desc: "HIPAA-grade data protection" },
];

const STEPS_ANDROID = [
  'Open this page in <strong>Chrome</strong> on your Android phone',
  'Tap the <strong>⋮ menu</strong> (top-right corner)',
  'Select <strong>"Add to Home screen"</strong>',
  'Tap <strong>"Add"</strong> — done! The app icon appears on your home screen',
];

const STEPS_IOS = [
  'Open this page in <strong>Safari</strong> on your iPhone or iPad',
  'Tap the <strong>Share</strong> button (box with arrow pointing up)',
  'Scroll down and tap <strong>"Add to Home Screen"</strong>',
  'Tap <strong>"Add"</strong> — NiniMed is now installed as an app',
];

export default function DownloadsPage() {
  const handleInstallClick = () => {
    // Trigger the PWA install prompt if available
    const deferredPrompt = (window as unknown as { __pwaInstallPrompt?: { prompt: () => void } }).__pwaInstallPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0B2D26] to-slate-900 text-white">
      {/* Hero */}
      <div className="max-w-3xl mx-auto px-4 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-bold mb-6">
          <Smartphone className="w-3.5 h-3.5" />
          NiniMed Mobile App
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
          Get NiniMed on<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300">
            your device
          </span>
        </h1>

        <p className="text-slate-300 text-base sm:text-lg mb-8 leading-relaxed max-w-xl mx-auto">
          Install the NiniMed app for instant 24/7 care, lab results, appointments, and
          prescription refills — right from your home screen.
        </p>

        {/* Install / Download CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
          <button
            onClick={handleInstallClick}
            className="flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-sm shadow-lg shadow-teal-900/50 hover:from-teal-400 hover:to-emerald-400 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            Install App (Android)
          </button>

          <a
            href="/"
            className="flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-white/10 border border-white/20 text-white font-bold text-sm hover:bg-white/15 transition-all"
          >
            <Chrome className="w-4 h-4" />
            Open in Browser
          </a>
        </div>

        <p className="text-slate-500 text-xs">
          Free • No credit card required • Works offline
        </p>
      </div>

      {/* Features */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center"
            >
              <div className="w-10 h-10 mx-auto mb-2.5 rounded-xl bg-teal-500/15 flex items-center justify-center">
                <Icon className="w-5 h-5 text-teal-400" />
              </div>
              <div className="font-bold text-xs text-white mb-1">{label}</div>
              <div className="text-[11px] text-slate-400 leading-snug">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="grid sm:grid-cols-2 gap-5">
          {/* Android */}
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="font-bold text-sm">Android</div>
                <div className="text-[11px] text-slate-400">Chrome browser</div>
              </div>
            </div>
            <ol className="space-y-3">
              {STEPS_ANDROID.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span dangerouslySetInnerHTML={{ __html: step }} />
                </li>
              ))}
            </ol>
          </div>

          {/* iOS */}
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-slate-500/20 flex items-center justify-center">
                <Apple className="w-5 h-5 text-slate-300" />
              </div>
              <div>
                <div className="font-bold text-sm">iPhone / iPad</div>
                <div className="text-[11px] text-slate-400">Safari browser</div>
              </div>
            </div>
            <ol className="space-y-3">
              {STEPS_IOS.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span dangerouslySetInnerHTML={{ __html: step }} />
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* QR Code section */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="p-6 rounded-3xl bg-gradient-to-br from-teal-900/40 to-emerald-900/30 border border-teal-500/20 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-white p-3 flex items-center justify-center shrink-0">
            {/* Placeholder QR icon */}
            <QrCode className="w-16 h-16 text-slate-800" />
          </div>
          <div className="text-center sm:text-left">
            <div className="font-bold text-base mb-1">Scan to open on your phone</div>
            <p className="text-slate-400 text-sm mb-3 leading-relaxed">
              Scan this QR code with your phone camera to instantly open NiniMed
              and install it from there.
            </p>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start text-xs">
              <span className="flex items-center gap-1 text-teal-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> No app store needed
              </span>
              <span className="flex items-center gap-1 text-teal-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> Always up to date
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA footer */}
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-slate-400 text-sm mb-4">
          Already have an account?
        </p>
        <Link
          href="/signin"
          className="inline-flex items-center gap-2 text-teal-400 font-bold text-sm hover:text-teal-300 transition-colors"
        >
          Sign in to your account <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
