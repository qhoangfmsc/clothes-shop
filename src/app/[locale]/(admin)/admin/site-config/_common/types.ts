/* ═══════════════════════════════════════════════════════════
   SITE CONFIG MODULE TYPES
   Co-located with the module — NOT in src/types/.
   ═══════════════════════════════════════════════════════════ */

import type { SiteConfig, SiteConfigType } from "@/src/types/site-config";

/** A merged row: a key the BE knows about + whatever is currently saved for it (if any). */
export interface SiteConfigRow {
  key: string;
  type: SiteConfigType;
  config: SiteConfig | null;
  /** Parsed array length when config.value is a valid JSON array, else 0. */
  bannerCount: number;
}
