"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { REVIEW_FITS, type ReviewFit } from "@/src/types/review";
import { REVIEW_SORT_OPTIONS, hasActiveReviewFilters, type ReviewFilters, type ReviewSort } from "../_common/reviews";

interface ReviewFilterBarProps {
  filters: ReviewFilters;
  onChange: (filters: ReviewFilters) => void;
  onClear: () => void;
}

const SELECT_CLASS =
  "min-h-9 pointer-coarse:min-h-11 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] py-1.5 pl-3 pr-7 font-primary text-xs font-medium text-[var(--text-primary)] outline-none cursor-pointer";

/** Fit and sort of the opened list (stars and photos are the chips of the summary above) */
export default function ReviewFilterBar({ filters, onChange, onClear }: ReviewFilterBarProps) {
  const t = useTranslations("public.product.reviews.filters");
  const tSort = useTranslations("public.product.reviews.sort");
  const tFit = useTranslations("shared.reviews.fit");

  return (
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

      <select
        aria-label={t("sort")}
        value={filters.sort}
        onChange={(e) => onChange({ ...filters, sort: e.target.value as ReviewSort })}
        className={SELECT_CLASS}
      >
        {REVIEW_SORT_OPTIONS.map(({ value, key }) => (
          <option key={value} value={value}>
            {tSort(key)}
          </option>
        ))}
      </select>

      {hasActiveReviewFilters(filters) && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 min-h-9 pointer-coarse:min-h-11 border-0 bg-transparent px-2 font-primary text-[0.6875rem] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)]"
        >
          <X size={11} aria-hidden="true" />
          {t("clear")}
        </button>
      )}
    </div>
  );
}
