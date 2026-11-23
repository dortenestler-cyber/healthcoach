import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import AuthGate from "@/components/AuthGate";
import ServiceWorker from "@/components/ServiceWorker";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Health Coach",
  description: "Training, Erholung und Perimenopause in einer App",
  applicationName: "Health Coach",
  appleWebApp: { capable: true, title: "Health Coach", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/icons/icon-dark.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0d10", // immer dunkel
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={inter.variable} suppressHydrationWarning>
      <body>
        <main className="shell">
          <ServiceWorker />
          <AuthGate>{children}</AuthGate>
        </main>
      </body>
    </html>
  );
}
