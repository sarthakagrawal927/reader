import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Configure for serverless deployment with Playwright
  experimental: {
    serverComponentsExternalPackages: ['playwright'],
  },
  // Ensure proper handling of Playwright in serverless environments
  webpack: (config) => {
    // Exclude Playwright from client bundle
    config.externals = config.externals || [];
    config.externals.push('playwright');
    return config;
  },
};

export default nextConfig;
