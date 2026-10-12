/* ═══════════════════════════════════════════════════════════
   USERS MODULE CONSTANTS
   ═══════════════════════════════════════════════════════════ */

export const ROLE_OPTIONS = ["admin", "user"] as const;

export const STATUS_OPTIONS = ["active", "disabled"] as const;

/** `sort=field` ascending, `-field` descending. `key` = label in admin.components.crud.sort.* */
export const USER_SORT_OPTIONS = [
  { value: "-createdAt", key: "newest" },
  { value: "createdAt", key: "oldest" },
  { value: "name", key: "nameAsc" },
  { value: "-name", key: "nameDesc" },
  { value: "email", key: "emailAsc" },
  { value: "-email", key: "emailDesc" },
] as const;
