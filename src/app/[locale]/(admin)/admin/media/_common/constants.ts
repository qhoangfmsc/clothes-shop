/* ═══════════════════════════════════════════════════════════
   MEDIA MODULE CONSTANTS
   ═══════════════════════════════════════════════════════════ */

/** errorCode the BE returns while Supabase Storage isn't configured yet. */
export const MEDIA_NOT_CONFIGURED_CODE = 1601;

/** `sort=field` ascending, `-field` descending. `key` = label in admin.components.crud.sort.* */
export const MEDIA_SORT_OPTIONS = [
  { value: "-createdAt", key: "newest" },
  { value: "createdAt", key: "oldest" },
  { value: "name", key: "nameAsc" },
  { value: "-name", key: "nameDesc" },
  { value: "-size", key: "sizeDesc" },
  { value: "size", key: "sizeAsc" },
] as const;
