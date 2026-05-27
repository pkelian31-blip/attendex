import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",          // Static HTML/CSS/JS → out/ folder for Capacitor
  trailingSlash: true,       // /student/[sid]/ → works correctly on mobile webview
  images: { unoptimized: true }, // Static export doesn't support Next Image optimization
};

export default nextConfig;
