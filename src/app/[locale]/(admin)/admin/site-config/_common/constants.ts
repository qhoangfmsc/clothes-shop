/* ═══════════════════════════════════════════════════════════
   SITE CONFIG MODULE CONSTANTS
   Co-located with the module — NOT in src/types/.
   ═══════════════════════════════════════════════════════════ */

import type { BannerItem } from "@/src/types/site-config";

/* Display label + description of each config key live in messages: admin.siteConfig.keys.<KEY>.
   A key without a translation falls back to its raw name. */

export const EMPTY_BANNER_ITEM: BannerItem = {
  image: "",
  responsiveImages: {},
  label: "",
  title: "",
  subtitle: "",
  ctaLabel: "",
  ctaHref: "",
};
