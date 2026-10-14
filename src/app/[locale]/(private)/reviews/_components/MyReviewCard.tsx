"use client";

import { EyeOff, PenLine } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { getProductUrl } from "@/src/hooks/use-api";
import { toMediaUrl } from "@/src/lib/media-url";
import ReviewContent from "@/src/app/[locale]/_components/ReviewContent";
import OrderThumb from "@/src/app/[locale]/(private)/orders/_components/OrderThumb";
import type { AuthorReview } from "@/src/types/review";

interface MyReviewCardProps {
  review: AuthorReview;
  onEdit: (review: AuthorReview) => void;
}

/**
 * One of the customer's own reviews: the product, the review as the public sees it, and what only the author
 * sees — "hidden by the store" with the reason, and the one allowed edit (`canEdit` / `editableUntil` decide).
 */
export default function MyReviewCard({ review, onEdit }: MyReviewCardProps) {
  const t = useTranslations("private.reviews.mine.card");
  const format = useFormatter();
  const hidden = review.status === "HIDDEN";
  const router = useRouter();

  /* The product URL needs its category and sub-category, which a review does not carry: look it up on click */
  const openProduct = async () => {
    if (!review.product) return;
    router.push((await getProductUrl(review.product.id)) ?? "/shop");
  };

  return (
    <li className="flex flex-col gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
      <div className="flex items-center gap-3">
        <OrderThumb src={toMediaUrl(review.product?.image ?? "")} alt={review.product?.name ?? ""} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="line-clamp-2 font-primary text-sm font-medium tracking-[-0.02em] text-[var(--text-primary)]">
            {review.product?.name ?? t("productRemoved")}
          </span>
          {review.product && (
            <button
              type="button"
              onClick={() => void openProduct()}
              className="min-h-6 cursor-pointer self-start border-0 bg-transparent p-0 font-primary text-[11px] text-[var(--text-accent)] hover:underline pointer-coarse:min-h-11"
            >
              {t("viewProduct")}
            </button>
          )}
        </div>
        {hidden && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[rgba(212,165,165,0.15)] px-2.5 py-1 font-primary text-xs font-semibold text-[var(--accent-rose)]">
            <EyeOff size={12} aria-hidden="true" />
            {t("hidden")}
          </span>
        )}
      </div>

      {hidden && (
        <div role="note" className="flex flex-col gap-1 rounded-md border border-[rgba(212,165,165,0.45)] bg-[rgba(212,165,165,0.08)] p-3 font-primary text-xs leading-[150%] text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--accent-rose)]">{t("hiddenTitle")}</span>
          {review.moderationNote && <span>{t("hiddenReason", { note: review.moderationNote })}</span>}
          <span className="text-[var(--text-muted)]">{t("hiddenOnlyYou")}</span>
        </div>
      )}

      <ReviewContent review={review} />

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--border-subtle)] pt-3">
        <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
          {hidden
            ? t("cannotEditHidden")
            : review.canEdit && review.editableUntil
              ? t("editableUntil", { date: format.dateTime(new Date(review.editableUntil), "short") })
              : review.edited
                ? t("alreadyEdited")
                : t("editExpired")}
        </span>
        {review.canEdit && !hidden && (
          <button
            type="button"
            onClick={() => onEdit(review)}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[var(--border-light)] bg-transparent px-5 font-primary text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-accent)] hover:bg-[var(--color-champagne-cream)]"
          >
            <PenLine size={14} aria-hidden="true" />
            {t("edit")}
          </button>
        )}
      </div>
    </li>
  );
}
