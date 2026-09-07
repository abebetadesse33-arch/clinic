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
import AppFooter from "../components/layout/AppFooter";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen flex flex-col antialiased pb-16 md:pb-0 transition-colors duration-200 bg-transparent text-slate-800 dark:text-slate-100">
        <QueryProvider>
          <ThemeProvider>
            <LanguageProvider>
              <ClinicProvider>
              <PwaRegistrar />
              <NavigationHeader />
              <main className="flex-1 min-w-0 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
                <div className="w-full min-w-0 overflow-x-hidden">
                  {children}
                </div>
              </main>
              <ClinicalAiCopilot />
              <MobileBottomNav />
              <AppFooter />
            </ClinicProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryProvider>
      </body>
    </html>
  );
}
