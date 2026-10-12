/* ═══════════════════════════════════════════════════════════
   CATEGORIES MODULE CONSTANTS
   ═══════════════════════════════════════════════════════════ */

import { LIST_MAX_LIMIT } from "@/src/lib/list-query";
import type { CategoryFormData } from "./types";

/** `sort=field` ascending, `-field` descending. `key` = label in admin.components.crud.sort.* */
export const CATEGORY_SORT_OPTIONS = [
  { value: "priority", key: "priority" },
  { value: "-createdAt", key: "newest" },
  { value: "createdAt", key: "oldest" },
  { value: "title", key: "titleAsc" },
  { value: "-title", key: "titleDesc" },
] as const;

/** Sort under which the on-screen order is the saved priority order (drag & drop is enabled). */
export const CATEGORY_PRIORITY_SORT = "priority";

/** The table loads every category on one page so drag & drop can reorder the whole list. */
export const CATEGORY_PAGE_SIZE = LIST_MAX_LIMIT;

export const EMPTY_CATEGORY_FORM: CategoryFormData = {
  slug: "",
  title: "",
  description: "",
  heroImage: "",
  priority: null,
  subcategories: [],
};
