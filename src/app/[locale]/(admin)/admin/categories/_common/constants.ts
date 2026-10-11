/* ═══════════════════════════════════════════════════════════
   CATEGORIES MODULE CONSTANTS
   ═══════════════════════════════════════════════════════════ */

import type { CategoryFormData } from "./types";

/** `key` points to a label in messages: admin.components.crud.sort.* or admin.categories.table.sort.* */
export const CATEGORY_SORT_OPTIONS = [
  { value: "createdAt", key: "newest" },
  { value: "-createdAt", key: "oldest" },
  { value: "title", key: "titleAsc" },
  { value: "-title", key: "titleDesc" },
] as const;

export const EMPTY_CATEGORY_FORM: CategoryFormData = {
  slug: "",
  title: "",
  description: "",
  heroImage: "",
  subcategories: [],
};
