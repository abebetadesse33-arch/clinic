import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClinicProvider } from "../context/ClinicContext";
import { ThemeProvider } from "../context/ThemeContext";
import { LayerProvider } from "../context/LayerContext";
import { LanguageProvider } from "../lib/i18n/translations";
import QueryProvider from "../components/providers/QueryProvider";
import ApplicationChrome from "../components/layout/ApplicationChrome";
import SiteContent from "../components/layout/SiteContent";
import { withBasePath } from "../lib/base-path";

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
  manifest: withBasePath("/manifest.webmanifest"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NiniMed",
  },
  formatDetection: {
    telephone: true,
  },
  icons: {
    icon: withBasePath("/icons/icon-192.svg"),
    apple: withBasePath("/icons/icon-192.svg"),
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
                  <ApplicationChrome />
                  <SiteContent>{children}</SiteContent>
                </LayerProvider>
              </ClinicProvider>
            </LanguageProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
