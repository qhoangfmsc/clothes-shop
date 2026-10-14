"use client";

import ReviewAvatar from "@/src/app/[locale]/_components/ReviewAvatar";
import ReviewContent from "@/src/app/[locale]/_components/ReviewContent";
import type { PublicReview } from "@/src/types/review";
import HelpfulButton from "./HelpfulButton";

interface ReviewItemProps {
  review: PublicReview;
  /** Count the BE returned after the visitor's last vote (older than `review.helpfulCount`) */
  helpfulCount?: number;
  voted: boolean;
  busy: boolean;
  own: boolean;
  onToggleHelpful: (reviewId: string) => void;
}

/** One review card on the product page: author, the review itself, then the "Helpful" button */
export default function ReviewItem({ review, helpfulCount, voted, busy, own, onToggleHelpful }: ReviewItemProps) {
  return (
    <article className="flex flex-col gap-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 sm:p-5">
      <header className="flex items-center gap-3">
        <ReviewAvatar avatar={review.avatar} author={review.author} />
        <span className="min-w-0 truncate font-primary text-sm font-medium text-[var(--text-primary)] tracking-[-0.02em]">
          {review.author}
        </span>
      </header>
      <ReviewContent review={review} />
      <footer>
        <HelpfulButton
          count={helpfulCount ?? review.helpfulCount}
          voted={voted}
          busy={busy}
          own={own}
          onToggle={() => onToggleHelpful(review.id)}
        />
      </footer>
    </article>
  );
}
