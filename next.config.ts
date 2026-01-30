import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "steamcdn-a.akamaihd.net",
      },
      {
        protocol: "https",
        hostname: "avatars.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "distribution.faceit-cdn.net",
      },
      {
        protocol: "https",
        hostname: "cdn.faceit.com",
      },
      {
        protocol: "https",
        hostname: "assets.faceit-cdn.net",
      },
      {
        protocol: "https",
        hostname: "csrep.gg",
      },
    ],
  },
};

export default nextConfig;
