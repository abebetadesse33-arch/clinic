import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClinicProvider } from "../context/ClinicContext";
import { ThemeProvider } from "../context/ThemeContext";
import { LanguageProvider } from "../lib/i18n/translations";
import QueryProvider from "../components/providers/QueryProvider";
import NavigationHeader from "../components/NavigationHeader";
import PwaRegistrar from "../components/mobile/PwaRegistrar";
import MobileBottomNav from "../components/mobile/MobileBottomNav";
import ClinicalAiCopilot from "../components/ui/ClinicalAiCopilot";

export const viewport: Viewport = {
  themeColor: "#005C4B",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen flex flex-col overflow-x-hidden antialiased pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0 transition-colors duration-200 bg-transparent text-slate-800 dark:text-slate-100">
        <QueryProvider>
          <ThemeProvider>
            <LanguageProvider>
              <ClinicProvider>
              <PwaRegistrar />
              <NavigationHeader />
              <main className="flex-1 min-w-0 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
                <div className="w-full overflow-x-hidden">
                  {children}
                </div>
              </main>
              <ClinicalAiCopilot />
              <MobileBottomNav />
              <footer className="border-t border-slate-200 bg-white/80 py-8 mt-auto hidden md:block backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-950/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-600 gap-4 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#14b8a6]"></span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">NiniMed Clinical Network</span>
                <span>•</span>
                <span>Care designed around your life</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
                <a href="/services/primary-care" className="hover:text-[#0f766e] transition-colors dark:hover:text-emerald-300">Primary Care</a>
                <span>•</span>
                <a href="/patient/treat-me-now" className="hover:text-[#0f766e] transition-colors dark:hover:text-emerald-300">24/7 Virtual Triage</a>
                <span>•</span>
                <a href="/locations" className="hover:text-[#0f766e] transition-colors dark:hover:text-emerald-300">Find an Office</a>
                <span>•</span>
                <a href="/membership" className="hover:text-[#0f766e] transition-colors dark:hover:text-emerald-300">Membership & Insurance</a>
                <span>•</span>
                <span>HIPAA & SOC-2 Certified</span>
              </div>
            </div>
          </footer>
            </ClinicProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryProvider>
      </body>
    </html>
  );
}
