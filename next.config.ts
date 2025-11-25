import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents: true, // Temporarily disabled - causes PPR issues with ThemeProvider
  images: {
    remotePatterns: [
      {
        hostname: "ui-avatars.com",
      },
      {
        protocol: "https",
        //https://nextjs.org/docs/messages/next-image-unconfigured-host
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
