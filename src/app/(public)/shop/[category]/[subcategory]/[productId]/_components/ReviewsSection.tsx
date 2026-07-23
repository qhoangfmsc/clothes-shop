"use client";

import { useState, useCallback } from "react";
import { Star, Check } from "lucide-react";
import { useReviews } from "@/src/hooks/use-api";

interface ReviewsSectionProps {
  productId: string;
}

/* Star renderer */
function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          fill={star <= rating ? "currentColor" : "none"}
          className={star <= rating ? "text-[var(--color-champagne-gold)]" : "text-[var(--text-disabled)]"}
        />
      ))}
    </div>
  );
}

export default function ReviewsSection({ productId }: ReviewsSectionProps) {
  const { reviews, average, total, isLoading } = useReviews(productId);
  const [showAll, setShowAll] = useState(false);

  const toggleShowAll = useCallback(() => {
    setShowAll((prev) => !prev);
  }, []);

  if (isLoading) return null;
  if (total === 0) return null;

  const displayedReviews = showAll ? reviews : reviews.slice(0, 3);

  return (
    <section
      className="border-t border-[var(--border-subtle)] bg-[var(--bg-section-1)] pb-16 pt-12 sm:pt-16"
    >
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="flex flex-col gap-2 mb-8">
          <span className="text-[var(--text-accent)] uppercase text-xs tracking-[0.12em] font-primary font-medium">
            Customer Reviews
          </span>
          <h2 className="text-[var(--text-heading)] font-display font-normal text-[clamp(28px,5vw,48px)] tracking-[-0.04em] leading-none">
            What Our Clients Say
          </h2>
        </div>

        {/* Summary */}
        <div className="flex flex-col gap-1.5 mb-8">
          <div className="flex items-center gap-3">
            <span className="font-primary text-[32px] font-medium text-[var(--text-heading)] tracking-[-0.04em] leading-none">
              {average.toFixed(1)}
            </span>
            <Stars rating={Math.round(average)} size={18} />
          </div>
          <span className="font-primary text-[13px] font-medium text-[var(--text-muted)] tracking-[-0.02em]">
            Based on {total} {total === 1 ? "review" : "reviews"}
          </span>
        </div>

        {/* Reviews list */}
        <div className="flex flex-col gap-4">
          {displayedReviews.map((review) => (
            <div
              key={review.id}
              className="flex flex-col gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 sm:p-5"
            >
              {/* Header: avatar, author, verified, date */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center font-primary text-sm font-medium text-[var(--text-heading)] shrink-0">
                  {review.avatar}
                </div>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-primary text-sm font-medium text-[var(--text-primary)] tracking-[-0.02em]">
                      {review.author}
                    </span>
                    {review.verified && (
                      <span className="inline-flex items-center gap-1 font-primary text-[11px] font-medium text-[var(--color-deep-gold)] tracking-[0.04em]">
                        <Check size={12} />
                        Verified
                      </span>
                    )}
                  </div>
                  <Stars rating={review.rating} size={12} />
                </div>
                <span className="font-primary text-xs text-[var(--text-disabled)] tracking-[-0.02em] shrink-0">
                  {new Date(review.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Title + body */}
              <h4 className="font-primary text-[15px] font-medium text-[var(--text-heading)] tracking-[-0.02em] leading-[140%] m-0">
                {review.title}
              </h4>
              <p className="font-primary text-[14px] font-medium text-[var(--text-secondary)] tracking-[-0.02em] leading-[165%] m-0">
                {review.content}
              </p>
            </div>
          ))}
        </div>

        {/* Show more / less */}
        {total > 3 && (
          <button
            type="button"
            className="mt-6 mx-auto block px-8 py-3 rounded-full border border-[var(--border-light)] bg-transparent text-[var(--text-secondary)] font-primary text-sm font-medium tracking-[0.04em] uppercase cursor-pointer transition-all duration-150 hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] hover:bg-[rgba(201,169,110,0.06)]"
            onClick={toggleShowAll}
          >
            {showAll ? "Show Less" : `Show All ${total} Reviews`}
          </button>
        )}
      </div>
    </section>
  );
}
