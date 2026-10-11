import type { MetadataRoute } from "next";
import { routing } from "@/src/i18n/routing";
import { SITE_URL } from "@/src/lib/site-url";

/* Locale-less paths that must never appear in search results (account, checkout, admin…). */
const PRIVATE_PATHS = ["/admin", "/login", "/cart", "/checkout", "/account", "/orders", "/wishlist", "/unauthorized"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", ...routing.locales.flatMap((locale) => PRIVATE_PATHS.map((path) => `/${locale}${path}`))],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
