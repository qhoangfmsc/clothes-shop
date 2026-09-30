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

/** Parsed shape of a BANNER-type config value (array item). */
export interface BannerItem {
  image: string;
  label?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
}
