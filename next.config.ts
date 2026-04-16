import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev'],
};

module.exports = {
  allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev', '100.93.168.24'],
}