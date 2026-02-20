import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/sign-to-text',
  assetPrefix: '/sign-to-text',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
