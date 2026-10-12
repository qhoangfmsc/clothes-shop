/* ═══════════════════════════════════════════════════════════
   USERS MODULE CONSTANTS
   ═══════════════════════════════════════════════════════════ */

/** `sort=field` ascending, `-field` descending. `key` = label in admin.components.crud.sort.* */
export const USER_SORT_OPTIONS = [
  { value: "-createdAt", key: "newest" },
  { value: "createdAt", key: "oldest" },
  { value: "name", key: "nameAsc" },
  { value: "-name", key: "nameDesc" },
  { value: "email", key: "emailAsc" },
  { value: "-email", key: "emailDesc" },
] as const;
