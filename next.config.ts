import type { NextConfig } from "next";

const isHttpsForced = process.env.FORCE_HTTPS === "true";
const hstsHeader = isHttpsForced
  ? "max-age=31536000; includeSubDomains; preload"
  : "";

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
  async headers() {
    const headers = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "img-src 'self' https: data:",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "font-src 'self' https: data:",
          "connect-src 'self' https:",
          "frame-ancestors 'none'",
        ].join("; "),
      },
    ];

    if (hstsHeader) {
      headers.push({ key: "Strict-Transport-Security", value: hstsHeader });
    }

    return [
      {
        source: "/:path*",
        headers,
      },
    ];
  },
};

export default nextConfig;
