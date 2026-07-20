/* ═══════════════════════════════════════════════════════════
   CATEGORIES MODULE CONSTANTS
   ═══════════════════════════════════════════════════════════ */

import type { CategoryFormData } from "./types";

export const CATEGORY_SORT_OPTIONS = [
  { value: "createdAt", label: "Newest" },
  { value: "-createdAt", label: "Oldest" },
  { value: "title", label: "Title A-Z" },
  { value: "-title", label: "Title Z-A" },
] as const;

export const EMPTY_CATEGORY_FORM: CategoryFormData = {
  slug: "",
  title: "",
  description: "",
  subcategories: [],
};
