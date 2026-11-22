import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import AuthGate from "@/components/AuthGate";
import "./globals.css";

// Setzt die gewählte Darstellung vor dem ersten Zeichnen, damit nichts aufblitzt
const THEME_SCRIPT =
  "try{var t=localStorage.getItem('hc_theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Health Coach",
  description: "Training, Erholung und Perimenopause in einer App",
  applicationName: "Health Coach",
  appleWebApp: { capable: true, title: "Health Coach", statusBarStyle: "default" },
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#111113" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <main className="shell">
          <AuthGate>{children}</AuthGate>
        </main>
      </body>
    </html>
  );
}
