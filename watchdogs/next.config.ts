import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Direct API calls with CORS - no proxy needed
  output: 'standalone',
};

export default nextConfig;
