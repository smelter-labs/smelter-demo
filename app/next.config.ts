import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: ['debug.smelter.live'],
    },
  },
};

export default nextConfig;
