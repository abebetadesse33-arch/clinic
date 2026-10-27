"use client";

import React, { useEffect, useState } from "react";
import { Download, X, Smartphone, WifiOff, Send } from "lucide-react";

export default function PwaRegistrar() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showTelegramBanner, setShowTelegramBanner] = useState(false);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const telegramBotUsername = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "Ninimedbot").replace(/^@/, "");
  const telegramBotUrl = `https://t.me/${encodeURIComponent(telegramBotUsername)}`;

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    // 1. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("NiniMed PWA ServiceWorker registered with scope:", reg.scope);
          void reg.update();
        })
        .catch((err) => {
          console.warn("ServiceWorker registration failed:", err);
        });
    }

    // 2. Check if already installed
    setIsInstalled(isStandalone);

    // 3. Capture PWA Install Prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show banner if not already dismissed in this session
      if (!sessionStorage.getItem("ninimed_pwa_banner_dismissed")) {
        setShowInstallBanner(true);
        setShowTelegramBanner(false);
      }
    };

    // 4. Show the Telegram bot notice on Android devices
    const userAgent = navigator.userAgent || "";
    const isAndroid = /Android/i.test(userAgent);
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
    if (
      isAndroid &&
      isMobile &&
      !isStandalone &&
      !sessionStorage.getItem("ninimed_telegram_banner_dismissed") &&
      !sessionStorage.getItem("ninimed_pwa_banner_dismissed")
    ) {
      setShowTelegramBanner(true);
    }

    const installHintTimer = window.setTimeout(() => {
      if (
        isMobile &&
        !isAndroid &&
        !isStandalone &&
        !sessionStorage.getItem("ninimed_install_hint_dismissed") &&
        !sessionStorage.getItem("ninimed_pwa_banner_dismissed")
      ) {
        setShowInstallHint(true);
      }
    }, 1800);

    // 5. Online/Offline Listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial online state
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.clearTimeout(installHintTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
    sessionStorage.setItem("ninimed_pwa_banner_dismissed", "true");
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem("ninimed_pwa_banner_dismissed", "true");
  };

  const handleTelegramDismiss = () => {
    setShowTelegramBanner(false);
    sessionStorage.setItem("ninimed_telegram_banner_dismissed", "true");
  };

  const handleInstallHintDismiss = () => {
    setShowInstallHint(false);
    sessionStorage.setItem("ninimed_install_hint_dismissed", "true");
  };

  return (
    <>
      {/* Offline Toast Banner */}
      {isOffline && (
        <div className="fixed top-0 inset-x-0 z-50 bg-rose-600 text-white text-xs font-bold py-2 px-4 flex items-center justify-center gap-2 shadow-lg animate-bounce">
          <WifiOff className="w-4 h-4" />
          <span>You are currently offline. NiniMed is running in offline mode.</span>
        </div>
      )}

      {/* PWA Install Smart Floating Banner (Mobile Viewports) */}
      {showInstallBanner && !isInstalled && (
        <div className="install-prompt fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:bottom-6 inset-x-3 sm:left-auto sm:right-6 z-50 w-auto max-w-sm bg-[#0A1612]/95 backdrop-blur-xl border border-[#005C4B]/40 p-4 rounded-2xl shadow-2xl text-white space-y-3 animate-slide-up">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#005C4B] to-[#0D8268] flex items-center justify-center shadow-md">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-white">Install NiniMed Mobile App</h4>
                <p className="text-[10px] text-[#A2B3AD]">Fast 24/7 care, offline access, & GPS clinic routing</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#005C4B] hover:bg-[#0D8268] text-white font-bold text-xs transition-all shadow-md active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Install on Device
            </button>
            <button
              onClick={handleDismiss}
              className="py-2 px-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Android Telegram Bot Floating Notification */}
      {showTelegramBanner && !showInstallBanner && !isInstalled && (
        <div className="install-prompt fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:bottom-6 inset-x-3 sm:right-6 sm:left-auto z-50 w-auto max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-[#005C4B]/20 shadow-2xl rounded-2xl p-3.5 text-slate-900 dark:text-slate-100 animate-slide-up">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#005C4B] to-[#14b8a6] flex items-center justify-center shadow-md">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#005C4B] dark:text-emerald-300">NiniMed on Telegram</p>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Chat with our Telegram bot</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-300">Open the bot for appointments, care updates, and help</p>
              </div>
            </div>
            <button
              onClick={handleTelegramDismiss}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg transition-colors"
              aria-label="Dismiss Telegram notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <a
              href={telegramBotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#005C4B] hover:bg-[#0D8268] text-white font-bold text-xs py-2.5 px-3 transition-all shadow-md"
              aria-label="Open NiniMed Telegram bot"
            >
              <Send className="w-3.5 h-3.5" />
              Open Telegram Bot
            </a>
            <button
              onClick={handleTelegramDismiss}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {showInstallHint && !showInstallBanner && !showTelegramBanner && !isInstalled && (
        <div className="install-prompt fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] inset-x-3 z-50 rounded-2xl border border-[#005C4B]/20 bg-white/95 p-4 text-slate-900 shadow-2xl backdrop-blur-xl dark:bg-slate-900/95 dark:text-slate-100 sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#005C4B] text-white">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#005C4B] dark:text-emerald-300">NiniMed App</p>
                  <h4 className="text-sm font-bold">Add NiniMed to your home screen</h4>
                </div>
                <button onClick={handleInstallHintDismiss} className="shrink-0 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white" aria-label="Dismiss app install guidance">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Use your browser menu and choose “Add to Home Screen” for faster access and offline support.</p>
              <button onClick={handleInstallHintDismiss} className="mt-3 w-full rounded-xl bg-[#005C4B] px-3 py-2 text-xs font-bold text-white">Got it</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
