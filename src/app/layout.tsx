import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClinicProvider } from "../context/ClinicContext";
import { ThemeProvider } from "../context/ThemeContext";
import { LayerProvider } from "../context/LayerContext";
import { LanguageProvider } from "../lib/i18n/translations";
import QueryProvider from "../components/providers/QueryProvider";
import NavigationHeader from "../components/NavigationHeader";
import PwaRegistrar from "../components/mobile/PwaRegistrar";
import MobileBottomNav from "../components/mobile/MobileBottomNav";
import AppFooter from "../components/layout/AppFooter";
import NotificationBell from "../components/layout/NotificationBell";
import { EffectLayer } from "../components/hud/EffectLayer";
import { HudGridLayer } from "../components/hud/HudGridLayer";
import { HudScanlines } from "../components/hud/HudScanlines";
import { HudVignette } from "../components/hud/HudVignette";
import { HudParticles } from "../components/hud/HudParticles";
import { HudCursorGlow } from "../components/hud/HudCursorGlow";
import { HudBootSequence } from "../components/hud/HudBootSequence";
import { GlassFilter } from "../components/hud/GlassFilter";
import { XRayPanel } from "../components/debug/XRayPanel";

export const viewport: Viewport = {
  themeColor: "#075985",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "NiniMed | 24/7 Primary & Urgent Healthcare Network",
  description: "Doctor's appointments you might actually look forward to. In-office visits, 24/7 on-demand virtual care, on-site labs, and dedicated primary care physicians.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NiniMed",
  },
  formatDetection: {
    telephone: true,
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="hud-mode">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen flex flex-col antialiased pb-24 md:pb-0 transition-colors duration-200 bg-transparent text-slate-800 dark:text-slate-100">
        <QueryProvider>
          <ThemeProvider>
            <LanguageProvider>
              <ClinicProvider>
                <LayerProvider>
                  <GlassFilter />
                  <EffectLayer name="grid">
                    <HudGridLayer />
                  </EffectLayer>
                  <EffectLayer name="scanlines">
                    <HudScanlines />
                  </EffectLayer>
                  <EffectLayer name="vignette">
                    <HudVignette />
                  </EffectLayer>
                  <EffectLayer name="particles">
                    <HudParticles />
                  </EffectLayer>
                  <EffectLayer name="cursor-glow">
                    <HudCursorGlow />
                  </EffectLayer>
                  <HudBootSequence />
                  <PwaRegistrar />
                  <NavigationHeader />
                  <div className="md:hidden fixed top-[calc(env(safe-area-inset-top)+0.75rem)] right-3 z-[300]">
                    <NotificationBell />
                  </div>
                  <main className="flex-1 min-w-0 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
                    <div className="w-full min-w-0 overflow-x-hidden">
                      {children}
                    </div>
                  </main>
                  <MobileBottomNav />
                  <AppFooter />
                  <XRayPanel />
                </LayerProvider>
              </ClinicProvider>
            </LanguageProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
