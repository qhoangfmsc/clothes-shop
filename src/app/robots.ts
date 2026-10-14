import type { MetadataRoute } from "next";
import { routing } from "@/src/i18n/routing";
import { SITE_URL } from "@/src/lib/site-url";

/* Locale-less paths that must never appear in search results (account, checkout, admin…). */
const PRIVATE_PATHS = [
  "/admin",
  "/login",
  "/cart",
  "/checkout",
  "/account",
  "/orders",
  "/returns",
  "/reviews",
  "/wishlist",
  "/unauthorized",
];

/* Vercel preview / development deployments must never be indexed (they would compete
   with, or duplicate, the production site). `VERCEL_ENV` is unset outside Vercel. */
const isNonProductionDeploy =
  Boolean(process.env.VERCEL_ENV) && process.env.VERCEL_ENV !== "production";

export default function robots(): MetadataRoute.Robots {
  if (isNonProductionDeploy) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          ...routing.locales.flatMap((locale) => PRIVATE_PATHS.map((path) => `/${locale}${path}`)),
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
