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
    <div className="rv-stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          fill={star <= rating ? "currentColor" : "none"}
          className={`rv-star ${star <= rating ? "rv-star--filled" : ""}`}
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
    <section className="rv-section">
      <div className="shop-section-title">
        <span className="shop-section-title__label">Customer Reviews</span>
        <h2 className="shop-section-title__heading">What Our Clients Say</h2>
      </div>

      {/* Summary */}
      <div className="rv-summary">
        <div className="rv-summary__rating">
          <span className="rv-summary__avg">{average.toFixed(1)}</span>
          <Stars rating={Math.round(average)} size={18} />
        </div>
        <span className="rv-summary__count">
          Based on {total} {total === 1 ? "review" : "reviews"}
        </span>
      </div>

      {/* Reviews list */}
      <div className="rv-list">
        {displayedReviews.map((review) => (
          <div key={review.id} className="rv-card">
            <div className="rv-card__header">
              <div className="rv-card__avatar">{review.avatar}</div>
              <div className="rv-card__meta">
                <div className="rv-card__author-row">
                  <span className="rv-card__author">{review.author}</span>
                  {review.verified && (
                    <span className="rv-card__verified">
                      <Check size={12} />
                      Verified
                    </span>
                  )}
                </div>
                <Stars rating={review.rating} size={12} />
              </div>
              <span className="rv-card__date">
                {new Date(review.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <h4 className="rv-card__title">{review.title}</h4>
            <p className="rv-card__body">{review.content}</p>
          </div>
        ))}
      </div>

      {/* Show more */}
      {total > 3 && (
        <button type="button" className="rv-show-more" onClick={toggleShowAll}>
          {showAll ? "Show Less" : `Show All ${total} Reviews`}
        </button>
      )}
    </section>
  );
}
