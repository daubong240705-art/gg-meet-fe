import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const allowedDevOrigins = process.env.NEXT_ALLOWED_DEV_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean) ?? ["local-origin.dev", "*.local-origin.dev"];

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins,
};

// Run `npm run analyze` (ANALYZE=true) to emit the interactive bundle report.
// A normal `next build` is unaffected because the plugin is a no-op when disabled.
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default bundleAnalyzer(nextConfig);
