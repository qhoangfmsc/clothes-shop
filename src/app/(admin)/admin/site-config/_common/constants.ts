/* ═══════════════════════════════════════════════════════════
   SITE CONFIG MODULE CONSTANTS
   Co-located with the module — NOT in src/types/.
   ═══════════════════════════════════════════════════════════ */

import type { BannerItem } from "@/src/types/site-config";

/** Friendly display label per key — falls back to the raw key if missing. */
export const SITE_CONFIG_KEY_LABELS: Record<string, string> = {
  SHOP_HERO_BANNERS: "Shop — Hero Banner",
  NEW_IN_HERO_BANNERS: "New In — Hero Banner",
  COLLECTIONS_HERO_BANNERS: "Collections — Hero Banner",
  NAV_MENU_BANNERS: "Menu — Featured Banner",
};

export const SITE_CONFIG_KEY_DESCRIPTIONS: Record<string, string> = {
  SHOP_HERO_BANNERS: "Shop banners.",
  NEW_IN_HERO_BANNERS: "New in banners.",
  COLLECTIONS_HERO_BANNERS: "Collections banners.",
  NAV_MENU_BANNERS: "Menu banners.",
};

export const EMPTY_BANNER_ITEM: BannerItem = {
  image: "",
  label: "",
  title: "",
  subtitle: "",
  ctaLabel: "",
  ctaHref: "",
};
