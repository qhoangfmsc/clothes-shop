"use client";

import { Store } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { PublicReview } from "@/src/types/review";
import StarRating from "./StarRating";
import ReviewImageGrid from "./ReviewImageGrid";

interface ReviewContentProps {
  review: PublicReview;
  className?: string;
}

/**
 * What a review says, the same on the product page, in "My reviews" and in the admin: stars + date, the
 * verified / edited marks, title, text, size · colour · fit, photos and the store's reply.
 * The caller adds the author line (name, avatar) and any actions around it.
 * The date is `createdAt`: `date` is free text on old sample data and is never parsed.
 */
export default function ReviewContent({ review, className = "" }: ReviewContentProps) {
  const t = useTranslations("shared.reviews");
  const format = useFormatter();
  const purchased = [review.size, review.color].filter(Boolean).join(" · ");

  return (
    <div className={`flex flex-col gap-3 min-w-0 ${className}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StarRating rating={review.rating} size={14} />
        <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
          {format.dateTime(new Date(review.createdAt), "short")}
        </span>
        {review.edited && (
          <span className="font-primary text-[11px] text-[var(--text-muted)] tracking-[0.02em]">{t("edited")}</span>
        )}
      </div>

      {review.title && (
        <h4 className="m-0 font-primary text-[15px] font-medium text-[var(--text-heading)] tracking-[-0.02em] leading-[140%] break-words">
          {review.title}
        </h4>
      )}
      {review.content && (
        <p className="m-0 whitespace-pre-line break-words font-primary text-[14px] font-medium text-[var(--text-secondary)] tracking-[-0.02em] leading-[165%]">
          {review.content}
        </p>
      )}

      {(purchased || review.fit) && (
        <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
          {purchased && <span>{t("purchased", { variant: purchased })}</span>}
          {review.fit && <span>{t("fit.line", { fit: t(`fit.${review.fit}`) })}</span>}
        </p>
      )}

      <ReviewImageGrid images={review.images} />

      {review.reply && (
        <div className="flex flex-col gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 sm:p-4">
          <span className="inline-flex items-center gap-1.5 font-primary text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-accent)]">
            <Store size={13} aria-hidden="true" />
            {t("storeReply")}
          </span>
          <p className="m-0 whitespace-pre-line break-words font-primary text-[13px] text-[var(--text-secondary)] leading-[160%] tracking-[-0.02em]">
            {review.reply.content}
          </p>
          <span className="font-primary text-[11px] text-[var(--text-disabled)]">
            {format.dateTime(new Date(review.reply.repliedAt), "short")}
          </span>
        </div>
      )}
    </div>
  );
}
