/* ═══════════════════════════════════════════════════════════
   CUSTOMER REVIEWS — limits and options (mirror the BE rules)
   ═══════════════════════════════════════════════════════════ */

/** Largest photo the BE accepts (`413` above it) */
export const REVIEW_IMAGE_MAX_MB = 5;
export const REVIEW_IMAGE_MAX_BYTES = REVIEW_IMAGE_MAX_MB * 1024 * 1024;

/** Photo formats the BE accepts (it checks the real bytes, not just this) */
export const REVIEW_IMAGE_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
export const REVIEW_IMAGE_ACCEPT = REVIEW_IMAGE_TYPES.join(",");
/** Some browsers leave `File.type` empty for AVIF: fall back to the extension */
const REVIEW_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "avif"];

/** An `http(s)://` address or a `www.` one: the BE refuses reviews that contain it (1905) */
export const REVIEW_LINK_PATTERN = /(https?:\/\/|www\.)/i;

/** Order lines asked for at once: the BE caps a page at 200 and a customer rarely has that many to review */
export const PENDING_PAGE_LIMIT = 200;

/** "My reviews" page size */
export const MY_REVIEWS_PAGE_SIZE = 10;

/** Status filter of "My reviews"; `all` sends no filter */
export const MY_REVIEW_STATUS_FILTERS = ["all", "PUBLISHED", "HIDDEN"] as const;
export type MyReviewStatusFilter = (typeof MY_REVIEW_STATUS_FILTERS)[number];

export const REVIEW_TABS = ["pending", "mine"] as const;
export type ReviewTab = (typeof REVIEW_TABS)[number];

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isAcceptedReviewImage(file: File): boolean {
  if (REVIEW_IMAGE_TYPES.includes(file.type)) return true;
  if (file.type !== "") return false;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return REVIEW_IMAGE_EXTENSIONS.includes(ext);
}

/** Whole days left until `iso` (rounded up, so "a few hours" is still 1 day); `0` once it has passed */
export function daysUntil(iso: string, now: number = Date.now()): number {
  const left = new Date(iso).getTime() - now;
  return left <= 0 ? 0 : Math.ceil(left / MS_PER_DAY);
}
