import type { Metadata } from "next";
import { BRAND_NAME } from "@/src/lib/brand";
import { LOCALE_LABELS, routing, type AppLocale } from "./routing";

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
export const withBrand = (title: string) => `${title} — ${BRAND_NAME}`;

/** Share-card image used when a page has no image of its own (also set site-wide in the root layout). */
const DEFAULT_SHARE_IMAGE = { url: "/brand/brand_og.png", width: 1200, height: 630 };

interface SocialMetadataInput {
  locale: AppLocale;
  /** Locale-less path, e.g. "/shop/tops" or "" for the home page. */
  path?: string;
  title: string;
  description: string;
  /** Page-specific image (site-relative `/media/...` or absolute). Falls back to the brand image. */
  image?: string | null;
  imageAlt?: string;
}

/** Open Graph + Twitter cards for one page. A page-level `openGraph` replaces the root layout's
 *  entirely (Next does not deep-merge), so every page sets the full card through this helper. */
export function buildSocialMetadata({
  locale,
  path = "",
  title,
  description,
  image,
  imageAlt,
}: SocialMetadataInput): Pick<Metadata, "openGraph" | "twitter"> {
  const images = [
    image
      ? { url: image, alt: imageAlt ?? title }
      : { ...DEFAULT_SHARE_IMAGE, alt: imageAlt ?? title },
  ];

  return {
    openGraph: {
      type: "website",
      siteName: BRAND_NAME,
      locale: LOCALE_LABELS[locale].ogLocale,
      alternateLocale: routing.locales
        .filter((l) => l !== locale)
        .map((l) => LOCALE_LABELS[l].ogLocale),
      url: `/${locale}${path}`,
      title,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((img) => img.url),
    },
  };
}
