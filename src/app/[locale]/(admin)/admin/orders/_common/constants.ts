/* ═══════════════════════════════════════════════════════════
   ORDERS MODULE CONSTANTS
   ═══════════════════════════════════════════════════════════ */

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipping",
  "delivered",
  "completed",
  "cancelled",
] as const;

/** `sort=field` ascending, `-field` descending. `key` = label in admin.components.crud.sort.* */
export const ORDER_SORT_OPTIONS = [
  { value: "-createdAt", key: "newest" },
  { value: "createdAt", key: "oldest" },
  { value: "-total", key: "totalDesc" },
  { value: "total", key: "totalAsc" },
] as const;
