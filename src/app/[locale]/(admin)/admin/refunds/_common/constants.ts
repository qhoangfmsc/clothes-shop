/* ═══════════════════════════════════════════════════════════
   REFUNDS MODULE CONSTANTS
   ═══════════════════════════════════════════════════════════ */

/** BE sort whitelist: `createdAt`, `processedAt`, `amount` (`-` = descending). `key` = label in admin.components.crud.sort.* */
export const REFUND_SORT_OPTIONS = [
  { value: "-createdAt", key: "newest" },
  { value: "createdAt", key: "oldest" },
  { value: "-processedAt", key: "processedDesc" },
  { value: "processedAt", key: "processedAsc" },
  { value: "-amount", key: "amountDesc" },
  { value: "amount", key: "amountAsc" },
] as const;

/** Longest `reference` / `note` the BE accepts */
export const REFUND_REFERENCE_MAX = 64;
export const REFUND_NOTE_MAX = 500;
