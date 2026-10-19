"use client";

import { Clock, PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import OrderThumb from "@/src/app/[locale]/(private)/orders/_components/OrderThumb";
import type { PendingReviewItem } from "@/src/types/review";
import { daysUntil } from "../_common/constants";
import { useDeadlineLabel } from "../_common/use-deadline-label";

interface PendingReviewCardProps {
  item: PendingReviewItem;
  onReview: (item: PendingReviewItem) => void;
}

/** One delivered, paid order line waiting for a review, with the time left and the "Write a review" button */
export default function PendingReviewCard({ item, onReview }: PendingReviewCardProps) {
  const t = useTranslations("private.reviews.pending.card");
  const deadlineLabel = useDeadlineLabel();
  const urgent = daysUntil(item.reviewDeadline) <= 3;

  return (
    <li className="flex flex-col gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <OrderThumb src={item.productImage} alt={item.productName} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="line-clamp-2 font-primary text-sm font-medium tracking-[-0.02em] text-[var(--text-primary)]">
            {item.productName}
          </span>
          <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
            {[item.size, item.color].filter(Boolean).join(" · ")}
            {item.quantity > 1 && ` · ${t("quantity", { quantity: item.quantity })}`}
          </span>
          <span
            className={`inline-flex items-center gap-1 font-primary text-xs tracking-[-0.02em] ${
              urgent ? "font-medium text-[var(--accent-rose)]" : "text-[var(--text-muted)]"
            }`}
          >
            <Clock size={12} aria-hidden="true" />
            {deadlineLabel(item.reviewDeadline)}
          </span>
          <Link
            href={`/orders/${item.orderId}`}
            className="self-start font-primary text-[0.6875rem] text-[var(--text-disabled)] no-underline hover:underline"
          >
            {t("orderNumber", { id: item.orderId })}
          </Link>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onReview(item)}
        className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-[var(--accent-primary)] px-6 font-primary text-sm font-medium tracking-[-0.02em] text-[var(--text-on-gold)] shadow-[var(--shadow-gold-sm)] hover:opacity-90"
      >
        <PenLine size={15} aria-hidden="true" />
        {t("review")}
      </button>
    </li>
  );
}
