import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  turbopack: {
    root: fileURLToPath(new URL('.', import.meta.url)),
  },
  experimental: {
    // `next dev` / `next build` remind about security upgrades only
    agentUpgrade: 'security',
  },
};

export default {...nextConfig, images: {unoptimized: true}};
