/* ── Site Config Types — Matches BE schema ──
   `value` is always a JSON.stringify'd string; BE does not interpret its
   shape. FE parses it according to `type`. */

export type SiteConfigType = "BANNER" | "TEXT";

/** Known config keys — mirrors BE's SiteConfigKey enum. */
export const SITE_CONFIG_KEYS = {
  SHOP_HERO_BANNERS: "SHOP_HERO_BANNERS",
  NEW_IN_HERO_BANNERS: "NEW_IN_HERO_BANNERS",
  COLLECTIONS_HERO_BANNERS: "COLLECTIONS_HERO_BANNERS",
  NAV_MENU_BANNERS: "NAV_MENU_BANNERS",
} as const;

export interface SiteConfig {
  id: string;
  key: string;
  type: SiteConfigType;
  value: string;
  createdAt: string;
  updatedAt: string;
}

/** Key the BE knows about, whether or not it has been configured yet. */
export interface SiteConfigKeyMeta {
  key: string;
  type: SiteConfigType;
}

/** Screen-size tiers a banner image can be swapped per. Mirrors the
 *  breakpoints already used across the site's Tailwind classes (sm/lg). */
export type BannerBreakpoint = "mobile" | "tablet" | "desktop";

/** Optional image overrides for the smaller tiers. There's no `desktop` key
 *  here — `BannerItem.image` *is* the desktop image. Any tier left out falls
 *  back to the next-larger configured tier, and ultimately to `image`. */
export interface BannerResponsiveImages {
  mobile?: string; // < 640px — phones
  tablet?: string; // 640–1023px — tablets / iPad
}

/** Parsed shape of a BANNER-type config value (array item). */
export interface BannerItem {
  /** The desktop image — also the fallback for tablet/mobile when unset. */
  image: string;
  /** Tablet/mobile image overrides (all optional). */
  responsiveImages?: BannerResponsiveImages;
  label?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

/** Metadata for the admin UI — order to render breakpoint fields in (mobile
 *  first, ascending by viewport width — this order also drives the
 *  mobile-first CSS tiering in ResponsiveBannerImage), with human-readable
 *  labels and the viewport range each tier covers. */
export const BANNER_BREAKPOINTS: { key: BannerBreakpoint; label: string; hint: string }[] = [
  { key: "mobile", label: "Mobile", hint: "Phones, < 640px" },
  { key: "tablet", label: "Tablet", hint: "iPad / tablets, ≥ 640px" },
  { key: "desktop", label: "Desktop", hint: "Laptop / PC, ≥ 1024px" },
];

/** Resolves the image to show for a given breakpoint: its own override, the
 *  next-larger configured tier, and ultimately the desktop `image`. Desktop
 *  always resolves to `image` directly — it has no override of its own. */
export function resolveBannerImage(banner: BannerItem, breakpoint: BannerBreakpoint): string {
  if (breakpoint === "desktop") return banner.image;
  const overrides = banner.responsiveImages;
  if (!overrides) return banner.image;
  if (breakpoint === "mobile" && overrides.mobile) return overrides.mobile;
  if (overrides.tablet) return overrides.tablet;
  return banner.image;
}
