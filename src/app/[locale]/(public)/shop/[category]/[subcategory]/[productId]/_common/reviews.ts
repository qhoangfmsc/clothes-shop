/* ═══════════════════════════════════════════════════════════
   PRODUCT REVIEWS (product page) — constants and types
   ═══════════════════════════════════════════════════════════ */

import type { ReviewFit } from "@/src/types/review";

/** Reviews fetched and revealed per step: the first 5 newest, then 5 more for every "Show more" */
export const REVIEW_PAGE_SIZE = 5;

/** BE sort whitelist for `GET /api/reviews/:productId`; `key` = label in public.product.reviews.sort.* */
export const REVIEW_SORT_OPTIONS = [
  { value: "-createdAt", key: "newest" },
  { value: "-rating", key: "ratingHigh" },
  { value: "rating", key: "ratingLow" },
  { value: "-helpfulCount", key: "helpful" },
] as const;

export type ReviewSort = (typeof REVIEW_SORT_OPTIONS)[number]["value"];

export const DEFAULT_REVIEW_SORT: ReviewSort = "-createdAt";

export interface ReviewFilters {
  /** 1–5, `null` = any */
  rating: number | null;
  fit: ReviewFit | null;
  /** `true` = only reviews with photos */
  hasImages: boolean;
  sort: ReviewSort;
}

export const EMPTY_REVIEW_FILTERS: ReviewFilters = {
  rating: null,
  fit: null,
  hasImages: false,
  sort: DEFAULT_REVIEW_SORT,
};

export function hasActiveReviewFilters(filters: ReviewFilters): boolean {
  return filters.rating !== null || filters.fit !== null || filters.hasImages;
}
