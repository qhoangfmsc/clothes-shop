/* ═══════════════════════════════════════════════════════════
   RETURNS MODULE CONSTANTS
   ═══════════════════════════════════════════════════════════ */

/** BE sort whitelist: `createdAt`, `updatedAt` (`-` = descending). `key` = label in admin.components.crud.sort.* */
export const RETURN_SORT_OPTIONS = [
  { value: "-createdAt", key: "newest" },
  { value: "createdAt", key: "oldest" },
  { value: "-updatedAt", key: "updatedDesc" },
  { value: "updatedAt", key: "updatedAsc" },
] as const;

/** Longest `note` the BE accepts */
export const RETURN_NOTE_MAX = 500;
