import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  /* Dev only: Next serves /_next/static/media with `immutable, max-age=1y` and keeps the same URL when a
     font file is replaced under the same name, so the browser would keep showing the old font.
     Never cache media in dev; production URLs are content-hashed, so they are unaffected. */
  async headers() {
    if (!isDev) return [];
    return [
      {
        source: "/_next/static/media/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.higgs.ai",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "d8j0ntlcm91z4.cloudfront.net",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
