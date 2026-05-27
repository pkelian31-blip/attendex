import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "AttendX PRO",
  description: "Smart Attendance Platform — QR codes, live tracking, PDF reports · by KЭL ♛ PHANTOM · VALIDE EdTech",
  manifest: "/manifest.json",
  authors: [{ name: "KЭL ♛ PHANTOM", url: "https://valide.tech" }],
  keywords: ["attendance", "QR", "education", "VALIDE", "EdTech"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AttendX PRO",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#3B6FE8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // Critical for iPhone notch + home bar
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* PWA / Capacitor */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* Capacitor bridge — loaded by native shell, no-op on web */}
        <script src="capacitor.js" async />
      </head>
      <body>
        <ToastProvider>
          {children}
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}
