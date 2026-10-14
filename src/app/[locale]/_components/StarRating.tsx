"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

interface StarRatingProps {
  /** 1–5; an average is shown as the nearest whole star */
  rating: number;
  size?: number;
  className?: string;
}

/** Five stars, filled up to `rating`. Announced once as "N out of 5 stars" (the stars themselves are decorative). */
export default function StarRating({ rating, size = 14, className = "" }: StarRatingProps) {
  const t = useTranslations("shared.reviews");
  const filled = Math.round(rating);
  return (
    <span role="img" aria-label={t("starsAria", { rating })} className={`inline-flex gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          aria-hidden="true"
          fill={star <= filled ? "currentColor" : "none"}
          className={star <= filled ? "text-[var(--color-champagne-gold)]" : "text-[var(--text-disabled)]"}
        />
      ))}
    </span>
  );
}
