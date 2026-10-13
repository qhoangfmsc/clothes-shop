import type { AppLocale } from "@/src/i18n/routing";
import type { Product } from "@/src/types/product";
import { BRAND_ALTERNATE_NAME, BRAND_DOMAIN, BRAND_FOUNDING_YEAR, BRAND_NAME } from "./brand";
import { CONTACT_ADDRESS_PARTS, CONTACT_EMAIL, CONTACT_PHONE_E164 } from "./contact";
import { SITE_URL } from "./site-url";
import { hasPublicPrice } from "./product-purchase";
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

/** `Product` with one `Offer` (none for custom-order products). Prices are always USD (the shop never converts currencies).
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
    brand: { "@type": "Brand", name: BRAND_NAME },
    ...(product.category && { category: product.category.title }),
    ...(product.material && { material: product.material }),
    ...(product.colors.length > 0 && { color: product.colors.map((c) => c.name).join(", ") }),
    /* Custom-order products have no public price, so they are not advertised as an Offer */
    ...(hasPublicPrice(product.badge) && {
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: "USD",
        price: Number(product.price).toFixed(2), // the API sends decimals as strings
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
      },
    }),
  };
}

/** Names the brand is actually known by. Search is case-insensitive, so one casing is enough;
 *  only list domains we own. */
const BRAND_ALTERNATE_NAMES = [BRAND_ALTERNATE_NAME, BRAND_DOMAIN];

/** Stable id of the brand entity, so the WebSite and any other page can point at the same Organization. */
const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/** `WebSite` + `Organization` for the home page (the brand name is never translated).
 *  `description` is the localized site description; `identity` is one line that tells this DOOVAN
 *  apart from other businesses with a similar name (what it is, where it is). */
export function siteJsonLd(locale: AppLocale, description: string, identity: string) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: BRAND_NAME,
      alternateName: BRAND_ALTERNATE_NAMES,
      url: SITE_URL,
      description,
      inLanguage: locale,
      publisher: { "@id": ORGANIZATION_ID },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: BRAND_NAME,
      alternateName: BRAND_ALTERNATE_NAMES,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
      description,
      disambiguatingDescription: identity,
      foundingDate: BRAND_FOUNDING_YEAR,
      email: CONTACT_EMAIL,
      telephone: CONTACT_PHONE_E164,
      address: { "@type": "PostalAddress", ...CONTACT_ADDRESS_PARTS },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: CONTACT_EMAIL,
        telephone: CONTACT_PHONE_E164,
        availableLanguage: ["vi", "en"],
      },
      sameAs: SOCIALS.map((social) => social.href),
    },
  ];
}
