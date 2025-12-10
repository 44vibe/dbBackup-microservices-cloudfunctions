import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backup/:path*",
        destination: "http://localhost:3000/backup/:path*",
      },
    ];
  },
};

export default nextConfig;
