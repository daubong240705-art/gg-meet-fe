import type { NextConfig } from "next";

const allowedDevOrigins = process.env.NEXT_ALLOWED_DEV_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean) ?? ["local-origin.dev", "*.local-origin.dev"];

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins,
};

export default nextConfig;
