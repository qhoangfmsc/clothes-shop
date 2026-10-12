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

/** `sort=field` ascending, `-field` descending. `key` = label in admin.components.crud.sort.* */
export const COLLECTION_SORT_OPTIONS = [
  { value: "-createdAt", key: "newest" },
  { value: "createdAt", key: "oldest" },
  { value: "name", key: "nameAsc" },
  { value: "-name", key: "nameDesc" },
] as const;
