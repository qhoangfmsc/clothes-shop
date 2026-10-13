/* ═══════════════════════════════════════════════════════════
   PAYMENTS MODULE CONSTANTS
   ═══════════════════════════════════════════════════════════ */

/** `sort=field` ascending, `-field` descending (BE whitelist: `receivedAt`, `amount`). `key` = label in admin.components.crud.sort.* */
export const PAYMENT_SORT_OPTIONS = [
  { value: "-receivedAt", key: "newest" },
  { value: "receivedAt", key: "oldest" },
  { value: "-amount", key: "amountDesc" },
  { value: "amount", key: "amountAsc" },
] as const;

/** `GET /api/admin/payments/attempts` sorts by `createdAt`, `expiresAt` or `amount` (`-` = descending) */
export const ATTEMPT_SORT_OPTIONS = [
  { value: "-createdAt", key: "newest" },
  { value: "createdAt", key: "oldest" },
  { value: "-expiresAt", key: "expiryDesc" },
  { value: "expiresAt", key: "expiryAsc" },
  { value: "-amount", key: "amountDesc" },
  { value: "amount", key: "amountAsc" },
] as const;

/** BE code of "the received amount differs from what the session expects" */
export const AMOUNT_MISMATCH_CODE = 1710;

/** Longest `note` / `reference` the BE accepts */
export const CONFIRM_NOTE_MAX = 500;
export const CONFIRM_REFERENCE_MAX = 64;
export const CONFIRM_TRANSFER_CONTENT_MAX = 500;

/** Orders offered in the picker */
export const ORDER_PICKER_LIMIT = 10;
