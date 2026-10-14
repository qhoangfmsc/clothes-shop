/* ── Review Types — Matches BE schema (docs/modules/review.md in the API repo) ── */

export const REVIEW_FITS = ["small", "true_to_size", "large"] as const;
export type ReviewFit = (typeof REVIEW_FITS)[number];

export const REVIEW_STATUSES = ["PUBLISHED", "HIDDEN"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** Limits the BE enforces; the forms check them first so the user never meets the 400 */
export const REVIEW_LIMITS = {
  titleMax: 255,
  contentMax: 2000,
  imagesMax: 5,
  /** Admin reply */
  replyMax: 1000,
  /** Admin hide reason (the author reads it) */
  hideNoteMax: 500,
} as const;

/** The shop's public answer under a review */
export interface ReviewReply {
  content: string;
  /** ISO */
  repliedAt: string;
}

/** A review as the product page shows it: no user id, status or moderation note */
export interface PublicReview {
  id: string;
  author: string;
  /** Can be an empty string */
  avatar: string;
  rating: number;
  /** Legacy free text on old sample data: show `createdAt` instead and never parse this */
  date: string;
  /** ISO */
  createdAt: string;
  title: string;
  content: string;
  verified: boolean;
  fit: ReviewFit | null;
  /** `[]` when there is none */
  images: string[];
  size: string;
  color: string;
  helpfulCount: number;
  /** The author changed it once */
  edited: boolean;
  reply: ReviewReply | null;
}

export interface ReviewProduct {
  id: string;
  name: string;
  slug: string;
  image: string;
}

/** A review as its author sees it (`POST`/`PATCH` responses and `/api/my-reviews`) */
export interface AuthorReview extends PublicReview {
  productId: string;
  orderItemId: string;
  product: ReviewProduct | null;
  status: ReviewStatus;
  /** Only has a value while `HIDDEN`: the reason the shop gave */
  moderationNote: string | null;
  editedAt: string | null;
  canEdit: boolean;
  /** `null` once the right to edit is gone */
  editableUntil: string | null;
}

/** A review as an admin sees it */
export interface AdminReview extends PublicReview {
  productId: string;
  orderItemId: string;
  userId: string | null;
  product: ReviewProduct | null;
  status: ReviewStatus;
  moderationNote: string | null;
  moderatedBy: string | null;
  moderatedAt: string | null;
  editedAt: string | null;
  repliedBy: string | null;
}

/** `GET /api/reviews/:productId/summary` — the numbers come from the BE, never recomputed here */
export interface ReviewSummary {
  productId: string;
  ratingCount: number;
  /** `null` while there is no review: show an empty state, not zero stars */
  ratingAverage: number | null;
  /** Reviews with at least one photo */
  withImages: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  fit: Record<ReviewFit, number> & { total: number };
}

/** One order line still waiting for the customer's review (`GET /api/my-reviews/pending`) */
export interface PendingReviewItem {
  orderItemId: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage: string;
  size: string;
  color: string;
  quantity: number;
  /** ISO */
  deliveredAt: string;
  /** ISO: the last moment the line can be reviewed */
  reviewDeadline: string;
}
