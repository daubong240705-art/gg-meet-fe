import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const allowedDevOrigins = process.env.NEXT_ALLOWED_DEV_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean) ?? ["local-origin.dev", "*.local-origin.dev"];

// BUILD_TARGET=desktop builds the static SPA bundle served by the Electron
// shell (scripts/build-desktop.mjs); the web build stays on "standalone".
const isDesktop = process.env.BUILD_TARGET === "desktop";

const nextConfig: NextConfig = {
  output: isDesktop ? "export" : "standalone",
  allowedDevOrigins,
  ...(isDesktop ? { images: { unoptimized: true } } : {}),
};

// Run `npm run analyze` (ANALYZE=true) to emit the interactive bundle report.
// A normal `next build` is unaffected because the plugin is a no-op when disabled.
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default bundleAnalyzer(nextConfig);
