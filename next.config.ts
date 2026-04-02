import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'standalone' creates a minimal .next folder suitable for Docker
  output: 'standalone',
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
