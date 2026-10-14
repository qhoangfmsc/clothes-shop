/* ═══════════════════════════════════════════════════════════
   ADMIN REVIEWS — list params
   The review shapes themselves are shared with the storefront: `src/types/review.ts`.
   ═══════════════════════════════════════════════════════════ */

import type { ListParams, ListResult } from "@/src/lib/list-query";
import type { AdminReview, ReviewFit, ReviewStatus } from "@/src/types/review";

export interface ReviewListParams extends ListParams {
  status?: ReviewStatus;
  rating?: number;
  fit?: ReviewFit;
  /** `"true"` = with photos, `"false"` = without; anything else is a 400 */
  hasImages?: "true" | "false";
  /** Product slug (an unknown slug gives an empty list) */
  product?: string;
  userId?: string;
  /** `"true"` = the store replied, `"false"` = not yet */
  replied?: "true" | "false";
}

export type ReviewListResult = ListResult<AdminReview>;
