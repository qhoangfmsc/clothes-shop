/* ═══════════════════════════════════════════════════════════
   COLLECTIONS MODULE CONSTANTS
   ═══════════════════════════════════════════════════════════ */

import type { CollectionFormData } from "./types";

export const SEASONS = ["Spring/Summer 2027", "Fall/Winter 2027"] as const;

export const EMPTY_COLLECTION_FORM: CollectionFormData = {
  slug: "",
  name: "",
  subtitle: "",
  description: "",
  image: "",
  productIds: [],
  season: "",
};
