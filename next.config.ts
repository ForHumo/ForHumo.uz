import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/:locale/ai/:path*',
        destination: 'https://humo-ai-forhumo-projects.vercel.app/:path*',
      },
      {
        source: '/:locale/ai',
        destination: 'https://humo-ai-forhumo-projects.vercel.app',
      },
    ];
  },
};

export default withNextIntl(nextConfig);