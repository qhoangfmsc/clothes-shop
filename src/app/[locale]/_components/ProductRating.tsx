"use client";

import { Star } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import StarRating from "./StarRating";

interface ProductRatingProps {
  /** `ratingAverage` of the product, as the BE sent it (never recomputed here) */
  average: number | null | undefined;
  /** `ratingCount` of the product */
  count: number | null | undefined;
  /** `compact` = one star + "4.5 (12)" for cards; `full` = five stars + "4.5 · 12 reviews" */
  variant?: "compact" | "full";
  className?: string;
}

/** Rating of a product from the product response itself. Renders nothing while there is no review. */
export default function ProductRating({ average, count, variant = "compact", className = "" }: ProductRatingProps) {
  const t = useTranslations("shared.reviews.productRating");
  const format = useFormatter();
  if (average == null || !count || count <= 0) return null;

  const value = format.number(average, "decimal1");
  const aria = t("aria", { average: value, count });

  if (variant === "full") {
    return (
      <span role="img" aria-label={aria} className={`inline-flex items-center gap-2 ${className}`}>
        <StarRating rating={average} size={16} />
        <span aria-hidden="true" className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
          {t("full", { average: value, count })}
        </span>
      </span>
    );
  }

  return (
    <span role="img" aria-label={aria} className={`inline-flex items-center gap-1 ${className}`}>
      <Star size={12} aria-hidden="true" fill="currentColor" className="text-[var(--color-champagne-gold)]" />
      <span aria-hidden="true" className="font-primary text-[0.6875rem] text-[var(--text-muted)] tracking-[-0.02em]">
        {t("compact", { average: value, count })}
      </span>
    </span>
  );
}
