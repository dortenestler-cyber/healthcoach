import type { NextConfig } from "next";

// Kennung des Builds: die App vergleicht sie mit /version und meldet eine neue Version (Konzept Datenaktualisierung A7)
const build = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || "lokal"; // lokal: keine Meldung

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BUILD_ID: build },
};

export default nextConfig;
