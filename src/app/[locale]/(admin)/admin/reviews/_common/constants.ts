/* ═══════════════════════════════════════════════════════════
   ADMIN REVIEWS — constants
   ═══════════════════════════════════════════════════════════ */

/** BE sort whitelist: `createdAt`, `rating`, `helpfulCount` (`-` = descending). `key` = label in admin.components.crud.sort.* */
export const REVIEW_SORT_OPTIONS = [
  { value: "-createdAt", key: "newest" },
  { value: "createdAt", key: "oldest" },
  { value: "-rating", key: "ratingDesc" },
  { value: "rating", key: "ratingAsc" },
  { value: "-helpfulCount", key: "helpfulDesc" },
] as const;

/** Suggested hide reasons: one tap fills the note; `key` = label in admin.reviews.hide.reasons.*.
 *  There is deliberately no "low rating" reason: only content that breaks the rules is hidden. */
export const HIDE_REASON_KEYS = ["link", "personal", "language", "spam"] as const;
export type HideReasonKey = (typeof HIDE_REASON_KEYS)[number];

export const REVIEW_TABS = ["pending", "all"] as const;
export type ReviewTab = (typeof REVIEW_TABS)[number];
