"use client";

import { useState, useCallback } from "react";
import { ChevronDown, X, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { formatVnd } from "@/src/lib/money";

/* ── Types ── */

/** Same syntax as the BE `sort` param: `field` ascending, `-field` descending. */
export type SortValue =
  | "-createdAt"
  | "price"
  | "-price"
  | "name"
  | "-name"
  | "-ratingAverage"
  | "-ratingCount";

export interface ActiveFilters {
  sort: SortValue;
  minPrice: number | null;
  maxPrice: number | null;
  sizes: string[];
  colors: string[];
  /** 1–5: only products rated at least this; `null` = any. Products without a review never match. */
  minRating: number | null;
}

interface ShopFiltersProps {
  /** Size and color choices (gathered from the products fetched so far) */
  sizes: string[];
  colors: [name: string, hex: string][];
  activeFilters: ActiveFilters;
  onFiltersChange: (filters: ActiveFilters) => void;
  totalFiltered: number;
}

/* ── Constants ── */

export const DEFAULT_SORT: SortValue = "-createdAt";

/** `key` is a label in public.shop.components.filters.sort.<key> */
const SORT_OPTIONS: {
  value: SortValue;
  key: "newest" | "priceAsc" | "priceDesc" | "nameAsc" | "nameDesc" | "ratingDesc" | "reviewsDesc";
}[] = [
  { value: "-createdAt", key: "newest" },
  { value: "price", key: "priceAsc" },
  { value: "-price", key: "priceDesc" },
  { value: "name", key: "nameAsc" },
  { value: "-name", key: "nameDesc" },
  { value: "-ratingAverage", key: "ratingDesc" },
  { value: "-ratingCount", key: "reviewsDesc" },
];

/** Price bands of the filter in whole dong, the unit the BE filters and sorts by. `null` = open end. They are fixed
 *  (not typed in) so the shop never converts a USD figure back to VND. */
const PRICE_BANDS: readonly { min: number | null; max: number | null }[] = [
  { min: null, max: 500_000 },
  { min: 500_000, max: 1_000_000 },
  { min: 1_000_000, max: 2_000_000 },
  { min: 2_000_000, max: null },
];

/** "N stars & up" choices of the rating filter */
const MIN_RATING_OPTIONS = [4, 3, 2, 1] as const;

/* ═══════════════════════════════ ShopFilters ═══════════════════════════════ */

export default function ShopFilters({
  sizes: availableSizes,
  colors: availableColors,
  activeFilters,
  onFiltersChange,
  totalFiltered,
}: ShopFiltersProps) {
  const t = useTranslations("public.shop.components.filters");
  const [open, setOpen] = useState(false);

  const setSort = useCallback(
    (sort: SortValue) => onFiltersChange({ ...activeFilters, sort }),
    [activeFilters, onFiltersChange]
  );

  const toggleSize = useCallback(
    (size: string) => {
      const sizes = activeFilters.sizes.includes(size)
        ? activeFilters.sizes.filter((s) => s !== size)
        : [...activeFilters.sizes, size];
      onFiltersChange({ ...activeFilters, sizes });
    },
    [activeFilters, onFiltersChange]
  );

  const toggleColor = useCallback(
    (color: string) => {
      const colors = activeFilters.colors.includes(color)
        ? activeFilters.colors.filter((c) => c !== color)
        : [...activeFilters.colors, color];
      onFiltersChange({ ...activeFilters, colors });
    },
    [activeFilters, onFiltersChange]
  );

  const hasActiveFilters =
    activeFilters.sort !== DEFAULT_SORT ||
    activeFilters.minPrice != null ||
    activeFilters.maxPrice != null ||
    activeFilters.sizes.length > 0 ||
    activeFilters.colors.length > 0 ||
    activeFilters.minRating != null;

  const clearFilters = () =>
    onFiltersChange({
      sort: DEFAULT_SORT,
      minPrice: null,
      maxPrice: null,
      sizes: [],
      colors: [],
      minRating: null,
    });

  const activeFiltersCount =
    (activeFilters.sizes.length > 0 ? 1 : 0) +
    (activeFilters.colors.length > 0 ? 1 : 0) +
    (activeFilters.minRating != null ? 1 : 0) +
    (activeFilters.minPrice != null || activeFilters.maxPrice != null ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar Row: Sort + Product Count + Filter Toggle ── */}
      <div className="flex items-center justify-end gap-3 flex-wrap">
        <div className="text-xs text-[var(--text-muted)] font-primary">
          {t("count", { count: totalFiltered })}
        </div>
        {/* Sort */}
        <div className="flex items-center gap-2">
          <select
            value={activeFilters.sort}
            onChange={(e) => setSort(e.target.value as SortValue)}
            className="py-1.5 pl-3 pr-7 border border-[var(--border-subtle)]! rounded-full text-xs font-medium font-primary bg-[var(--bg-primary)]! text-[var(--text-primary)]! outline-none cursor-pointer appearance-none"
          >
            {SORT_OPTIONS.map(({ value, key }) => (
              <option key={value} value={value}>
                {t(`sort.${key}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Right: count + filter toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((p) => !p)}
            className={`inline-flex items-center gap-1.5 py-1.5 px-3.5 rounded-full border text-xs font-medium font-primary transition-colors ${
              hasActiveFilters || open
                ? "border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[rgba(201,169,110,0.06)]"
                : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-light)]"
            }`}
          >
            <SlidersHorizontal size={13} />
            {t("filter")}
            {activeFiltersCount > 0 && (
              <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] text-[0.625rem] font-semibold">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown
              size={12}
              style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }}
            />
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 py-1 px-2 border-0 bg-transparent cursor-pointer text-[0.6875rem] text-[var(--text-muted)] font-primary hover:text-[var(--text-secondary)] transition-colors"
            >
              <X size={11} /> {t("clearAll")}
            </button>
          )}
        </div>
      </div>

      {/* ── Expandable Filter Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="flex flex-col gap-5 p-5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
              {/* Price Range */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-muted)] font-semibold">
                  {t("priceRange")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRICE_BANDS.map((band) => {
                    const active = activeFilters.minPrice === band.min && activeFilters.maxPrice === band.max;
                    return (
                      <button
                        key={`${band.min}-${band.max}`}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          onFiltersChange({
                            ...activeFilters,
                            minPrice: active ? null : band.min,
                            maxPrice: active ? null : band.max,
                          })
                        }
                        className={`inline-flex items-center justify-center min-h-8 pointer-coarse:min-h-11 px-3 rounded-full text-xs font-medium font-primary border transition-colors ${
                          active
                            ? "bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-[var(--accent-primary)]"
                            : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-light)]"
                        }`}
                      >
                        {band.min === null && band.max !== null && t("priceBand.under", { max: formatVnd(band.max) })}
                        {band.min !== null && band.max !== null &&
                          t("priceBand.between", { min: formatVnd(band.min), max: formatVnd(band.max) })}
                        {band.min !== null && band.max === null && t("priceBand.over", { min: formatVnd(band.min) })}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rating */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-muted)] font-semibold">
                  {t("rating")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {MIN_RATING_OPTIONS.map((stars) => {
                    const active = activeFilters.minRating === stars;
                    return (
                      <button
                        key={stars}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onFiltersChange({ ...activeFilters, minRating: active ? null : stars })}
                        className={`inline-flex items-center justify-center min-h-8 pointer-coarse:min-h-11 px-3 rounded-full text-xs font-medium font-primary border transition-colors ${
                          active
                            ? "bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-[var(--accent-primary)]"
                            : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-light)]"
                        }`}
                      >
                        {t("minRating", { stars })}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Size */}
              {availableSizes.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <span className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-muted)] font-semibold">
                    {t("size")}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSizes.map((size) => {
                      const active = activeFilters.sizes.includes(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleSize(size)}
                          className={`inline-flex items-center justify-center min-w-[2.25rem] h-8 px-2 rounded-md text-xs font-medium font-primary border transition-colors ${
                            active
                              ? "bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-[var(--accent-primary)]"
                              : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-light)]"
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Color */}
              {availableColors.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <span className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-muted)] font-semibold">
                    {t("color")}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map(([name, hex]) => {
                      const active = activeFilters.colors.includes(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleColor(name)}
                          title={name}
                          className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-full border text-xs font-primary transition-colors ${
                            active
                              ? "border-[var(--accent-primary)] bg-[rgba(201,169,110,0.08)] text-[var(--accent-primary)] font-medium"
                              : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-light)]"
                          }`}
                        >
                          <span
                            className="inline-block w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                            style={{ background: hex }}
                          />
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
