import type { ListResult } from "@/src/lib/list-query";
import type { AuthorReview, PendingReviewItem, ReviewFit } from "@/src/types/review";

/** What the review form is for: a new review of an order line, or the one allowed edit of an existing review */
export type ReviewFormTarget =
  | { mode: "create"; item: PendingReviewItem }
  | { mode: "edit"; review: AuthorReview };

/** A photo in the form: either already on the review (edit) or picked in this session */
export interface ImageSlot {
  /** Stable React key and de-duplication key (`name:size:lastModified` for picked files) */
  id: string;
  /** What the BE sent or answered: the only value sent back in `images`. Empty until the photo is uploaded (on submit). */
  url: string;
  /** What to draw: a local object URL for picked files, the `/media` URL for existing ones */
  preview: string;
  /** `local` = picked, only previewed; `uploading` = being sent as part of a submit; `done` = the BE holds it; `error` = its upload failed (tried again on the next submit) */
  status: "local" | "uploading" | "done" | "error";
  /** The picked file, uploaded on submit */
  file?: File;
  /** BE error code of a failed upload, for the message under the photos */
  errorCode?: number;
}

export interface ReviewFormState {
  /** 0 = not chosen yet */
  rating: number;
  title: string;
  content: string;
  fit: ReviewFit | null;
  images: ImageSlot[];
}

export type MyReviewsResult = ListResult<AuthorReview>;
export type PendingReviewsResult = ListResult<PendingReviewItem>;
