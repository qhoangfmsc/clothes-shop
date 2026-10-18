"use client";

import { useFormatter, useTranslations } from "next-intl";
import StarRating from "@/src/app/[locale]/_components/StarRating";
import type { ReviewSummary } from "@/src/types/review";
import type { ReviewFilters } from "../_common/reviews";

interface ReviewSummaryPanelProps {
  summary: ReviewSummary;
  filters: ReviewFilters;
  /** A chip was chosen: the caller applies it and opens the list if it is folded */
  onChange: (filters: ReviewFilters) => void;
  /** Folded state only: show the "See all" button */
  onOpen?: () => void;
}

const STARS_DESC = [5, 4, 3, 2, 1] as const;

/* Same pill chips as the shop filters and the customer forms: rounded, gold when chosen */
const CHIP_BASE =
  "inline-flex min-h-9 cursor-pointer items-center rounded-full border px-3.5 sm:px-4 font-primary text-xs font-medium tracking-[-0.02em] whitespace-nowrap transition-colors pointer-coarse:min-h-11 motion-reduce:transition-none";
const CHIP_IDLE = "border-[var(--border-subtle)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-light)]";
const CHIP_ACTIVE = "border-[var(--accent-primary)] bg-[rgba(201,169,110,0.1)] text-[var(--accent-primary)]";
const CHIP_EMPTY = "cursor-not-allowed border-[var(--border-subtle)] bg-transparent text-[var(--text-disabled)]";

/**
 * The reviews summary, kept plain: the average with its stars on the left, and on the right one chip per choice —
 * All, 5 … 1 stars, With photos — each with its count from the BE. A chip is the filter itself (stars are exclusive,
 * photos can be added on top); the visitor never has to read a chart. Chips with no reviews are disabled.
 */
export default function ReviewSummaryPanel({ summary, filters, onChange, onOpen }: ReviewSummaryPanelProps) {
  const t = useTranslations("public.product.reviews.summary");
  const format = useFormatter();
  const { ratingAverage, ratingCount, distribution, withImages } = summary;
  const allActive = filters.rating === null && !filters.hasImages;

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-[var(--bg-primary)] p-5 shadow-[var(--shadow-sm)] sm:p-6 md:flex-row md:items-center md:gap-10">
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 md:flex-col md:items-start md:gap-1.5">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[40px] font-normal leading-none tracking-[-0.04em] text-[var(--text-heading)]">
            {ratingAverage !== null ? format.number(ratingAverage, "decimal1") : "–"}
          </span>
          <span className="font-primary text-sm text-[var(--text-muted)]">{t("outOf")}</span>
        </div>
        {ratingAverage !== null && <StarRating rating={ratingAverage} size={20} />}
        <span className="font-primary text-xs text-[var(--text-muted)]">{t("count", { count: ratingCount })}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div role="group" aria-label={t("filterLabel")} className="flex flex-wrap gap-1.5 sm:gap-2">
          <button
            type="button"
            aria-pressed={allActive}
            onClick={() => onChange({ ...filters, rating: null, hasImages: false })}
            className={`${CHIP_BASE} ${allActive ? CHIP_ACTIVE : CHIP_IDLE}`}
          >
            {t("chip.all")}
          </button>
          {STARS_DESC.map((stars) => {
            const count = distribution[String(stars) as "1"] ?? 0;
            const active = filters.rating === stars;
            return (
              <button
                key={stars}
                type="button"
                aria-pressed={active}
                disabled={count === 0}
                onClick={() => onChange({ ...filters, rating: active ? null : stars })}
                className={`${CHIP_BASE} ${count === 0 ? CHIP_EMPTY : active ? CHIP_ACTIVE : CHIP_IDLE}`}
              >
                {t("chip.stars", { stars, count })}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={filters.hasImages}
            disabled={withImages === 0}
            onClick={() => onChange({ ...filters, hasImages: !filters.hasImages })}
            className={`${CHIP_BASE} ${withImages === 0 ? CHIP_EMPTY : filters.hasImages ? CHIP_ACTIVE : CHIP_IDLE}`}
          >
            {t("chip.photos", { count: withImages })}
          </button>
        </div>

        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            aria-expanded={false}
            aria-controls="review-list"
            className="min-h-11 cursor-pointer self-start rounded-full border border-[var(--accent-primary)] bg-transparent px-6 font-primary text-xs font-medium uppercase tracking-[0.04em] text-[var(--text-accent)] transition-colors hover:bg-[rgba(201,169,110,0.1)] motion-reduce:transition-none"
          >
            {t("openAll")}
          </button>
        )}
      </div>
    </div>
  );
}
