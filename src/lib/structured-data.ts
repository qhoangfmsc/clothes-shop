import type { AppLocale } from "@/src/i18n/routing";
import type { Product } from "@/src/types/product";
import { SITE_URL } from "./site-url";
import { SOCIALS } from "./socials";

/** Schema.org needs absolute URLs; API images arrive as site-relative `/media/...` paths. */
export function absoluteUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** Absolute, locale-prefixed URL of a page. `path` is locale-less ("" = home). */
export function pageUrl(locale: AppLocale, path = ""): string {
  return `${SITE_URL}/${locale}${path}`;
}

export interface BreadcrumbEntry {
  name: string;
  /** Locale-less path; omit for the current (last) page only when it has no own URL. */
  path: string;
}

/** `BreadcrumbList` — lets Google show "DOOVAN › Shop › Tops" instead of the raw URL. */
export function breadcrumbJsonLd(locale: AppLocale, crumbs: BreadcrumbEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: pageUrl(locale, crumb.path),
    })),
  };
}

/** `Product` with one `Offer`. Prices are always USD (the shop never converts currencies).
 *  The public API only returns `active` products and has no stock levels, so every listed
 *  product is advertised as in stock. No `aggregateRating`: it must reflect real reviews. */
export function productJsonLd(locale: AppLocale, product: Product, path: string) {
  const url = pageUrl(locale, path);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    image: product.images.map(absoluteUrl),
    url,
    brand: { "@type": "Brand", name: "DOOVAN" },
    ...(product.category && { category: product.category.title }),
    ...(product.material && { material: product.material }),
    ...(product.colors.length > 0 && { color: product.colors.map((c) => c.name).join(", ") }),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "USD",
      price: Number(product.price).toFixed(2), // the API sends decimals as strings
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

/** Names the brand is actually known by. Search is case-insensitive, so one casing is enough;
 *  only list domains we own. */
const BRAND_ALTERNATE_NAMES = ["Doovan", "doovan.vn"];

/** `WebSite` + `Organization` for the home page (the brand name is never translated). */
export function siteJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "DOOVAN",
      alternateName: BRAND_ALTERNATE_NAMES,
      url: SITE_URL,
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "DOOVAN",
      alternateName: BRAND_ALTERNATE_NAMES,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
      sameAs: SOCIALS.map((social) => social.href),
    },
  ];
}
