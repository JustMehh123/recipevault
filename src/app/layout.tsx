import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import { BottomNav } from "@/components/bottom-nav";
import { PwaRegister } from "@/components/pwa-register";
import { InstallPrompt } from "@/components/install-prompt";
import { OfflineBanner } from "@/components/offline-banner";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: "RecipeVault — Ad-free, local-first recipe manager",
    template: "%s — RecipeVault",
  },
  description:
    "Import recipes from any website, plan your week, and generate smart grocery lists — all stored privately on your device. Installable as an app.",
  applicationName: "RecipeVault",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RecipeVault",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#161311" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        <ThemeProvider>
          <PwaRegister />
          <Navbar />
          <OfflineBanner />
          <div className="mx-auto max-w-6xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 md:pb-24">
            {children}
          </div>
          <BottomNav />
          <InstallPrompt />
          <Toaster richColors position="bottom-right" theme="system" />
        </ThemeProvider>
      </body>
    </html>
  );
}
