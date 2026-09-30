/* ═══════════════════════════════════════════════════════════
   COLLECTIONS MODULE CONSTANTS
   ═══════════════════════════════════════════════════════════ */

import type { CollectionFormData } from "./types";

export const SEASONS = ["Limited Edition"] as const;

export const EMPTY_COLLECTION_FORM: CollectionFormData = {
  slug: "",
  name: "",
  subtitle: "",
  description: "",
  image: "",
  productIds: [],
  season: "",
};
