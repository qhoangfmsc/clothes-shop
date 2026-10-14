"use client";

import { Camera, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { REVIEW_FITS, type ReviewFit } from "@/src/types/review";
import {
  REVIEW_SORT_OPTIONS,
  hasActiveReviewFilters,
  type ReviewFilters,
  type ReviewSort,
} from "../_common/reviews";

interface ReviewFilterBarProps {
  filters: ReviewFilters;
  /** Reviews with photos in the summary (shown on the photo toggle) */
  withImages: number;
  onChange: (filters: ReviewFilters) => void;
  onClear: () => void;
}

const SELECT_CLASS =
  "min-h-9 pointer-coarse:min-h-11 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] py-1.5 pl-3 pr-7 font-primary text-xs font-medium text-[var(--text-primary)] outline-none cursor-pointer";

/** Fit, photo and sort controls of the review list (the star filter is the summary's bar rows, mirrored here as chips for touch) */
export default function ReviewFilterBar({ filters, withImages, onChange, onClear }: ReviewFilterBarProps) {
  const t = useTranslations("public.product.reviews.filters");
  const tSort = useTranslations("public.product.reviews.sort");
  const tFit = useTranslations("shared.reviews.fit");
  const active = hasActiveReviewFilters(filters);

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label={t("rating")} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {[null, 5, 4, 3, 2, 1].map((stars) => {
          const selected = filters.rating === stars;
          return (
            <button
              key={stars ?? "all"}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange({ ...filters, rating: stars })}
              className={`shrink-0 min-h-9 pointer-coarse:min-h-11 rounded-full border px-3.5 font-primary text-xs font-medium whitespace-nowrap cursor-pointer transition-colors motion-reduce:transition-none ${
                selected
                  ? "border-[var(--accent-primary)] bg-[rgba(201,169,110,0.1)] text-[var(--accent-primary)]"
                  : "border-[var(--border-subtle)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-light)]"
              }`}
            >
              {stars === null ? t("allRatings") : t("stars", { stars })}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label={t("fit")}
          value={filters.fit ?? ""}
          onChange={(e) => onChange({ ...filters, fit: (e.target.value || null) as ReviewFit | null })}
          className={SELECT_CLASS}
        >
          <option value="">{t("anyFit")}</option>
          {REVIEW_FITS.map((fit) => (
            <option key={fit} value={fit}>
              {tFit(fit)}
            </option>
          ))}
        </select>

        <button
          type="button"
          aria-pressed={filters.hasImages}
          onClick={() => onChange({ ...filters, hasImages: !filters.hasImages })}
          className={`inline-flex items-center gap-1.5 min-h-9 pointer-coarse:min-h-11 rounded-full border px-3.5 font-primary text-xs font-medium cursor-pointer transition-colors motion-reduce:transition-none ${
            filters.hasImages
              ? "border-[var(--accent-primary)] bg-[rgba(201,169,110,0.1)] text-[var(--accent-primary)]"
              : "border-[var(--border-subtle)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-light)]"
          }`}
        >
          <Camera size={13} aria-hidden="true" />
          {t("withPhotos", { count: withImages })}
        </button>

        <select
          aria-label={t("sort")}
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as ReviewSort })}
          className={`${SELECT_CLASS} sm:ml-auto`}
        >
          {REVIEW_SORT_OPTIONS.map(({ value, key }) => (
            <option key={value} value={value}>
              {tSort(key)}
            </option>
          ))}
        </select>

        {active && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 min-h-9 pointer-coarse:min-h-11 border-0 bg-transparent px-2 font-primary text-[11px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)]"
          >
            <X size={11} aria-hidden="true" />
            {t("clear")}
          </button>
        )}
      </div>
    </div>
  );
}
