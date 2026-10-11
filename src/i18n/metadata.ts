import type { Metadata } from "next";
import { routing, type AppLocale } from "./routing";

/** Canonical + hreflang links for a page, so search engines serve each language to the right audience.
 *  `path` is the locale-less path, e.g. "/shop" or "" for the home page. */
export function buildAlternates(locale: AppLocale, path = ""): Metadata["alternates"] {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}${path}`])),
      "x-default": `/${routing.defaultLocale}${path}`,
    },
  };
}

/** Page titles end with the brand — "Shop — DOOVAN". The brand is never translated. */
export const withBrand = (title: string) => `${title} — DOOVAN`;
