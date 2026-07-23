"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronDown, X, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Product } from "@/src/types/product";

/* ── Types ── */

export type SortValue = "newest" | "price_asc" | "price_desc" | "name_asc" | "name_desc";

export interface ActiveFilters {
  sort: SortValue;
  minPrice: number | null;
  maxPrice: number | null;
  sizes: string[];
  colors: string[];
}

interface ShopFiltersProps {
  products: Product[];
  activeFilters: ActiveFilters;
  onFiltersChange: (filters: ActiveFilters) => void;
  totalFiltered: number;
}

/* ── Constants ── */

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "name_asc", label: "Name: A → Z" },
  { value: "name_desc", label: "Name: Z → A" },
];

/* ═══════════════════════════════ ShopFilters ═══════════════════════════════ */

export default function ShopFilters({
  products,
  activeFilters,
  onFiltersChange,
  totalFiltered,
}: ShopFiltersProps) {
  const [open, setOpen] = useState(false);

  /* Collect available sizes from products */
  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.sizes?.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [products]);

  /* Collect available colors from products */
  const availableColors = useMemo(() => {
    const map = new Map<string, string>(); // name → hex
    products.forEach((p) =>
      p.colors?.forEach(({ name, hex }) => {
        if (!map.has(name)) map.set(name, hex);
      })
    );
    return Array.from(map.entries()); // [name, hex][]
  }, [products]);

  /* Price range from products */
  const priceRange = useMemo(() => {
    const prices = products.map((p) => p.price);
    return { min: Math.floor(Math.min(...prices, 0)), max: Math.ceil(Math.max(...prices, 200)) };
  }, [products]);

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
    activeFilters.sort !== "newest" ||
    activeFilters.minPrice != null ||
    activeFilters.maxPrice != null ||
    activeFilters.sizes.length > 0 ||
    activeFilters.colors.length > 0;

  const clearFilters = () =>
    onFiltersChange({
      sort: "newest",
      minPrice: null,
      maxPrice: null,
      sizes: [],
      colors: [],
    });

  const activeFiltersCount =
    (activeFilters.sizes.length > 0 ? 1 : 0) +
    (activeFilters.colors.length > 0 ? 1 : 0) +
    (activeFilters.minPrice != null || activeFilters.maxPrice != null ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar Row: Sort + Product Count + Filter Toggle ── */}
      <div className="flex items-center justify-end gap-3 flex-wrap">
        <div className="text-xs text-[var(--text-muted)] font-primary">
          {totalFiltered} {totalFiltered === 1 ? "piece" : "pieces"}
        </div>
        {/* Sort */}
        <div className="flex items-center gap-2">
          <select
            value={activeFilters.sort}
            onChange={(e) => setSort(e.target.value as SortValue)}
            className="py-1.5 pl-3 pr-7 border border-[var(--border-subtle)]! rounded-full text-xs font-medium font-primary bg-[var(--bg-primary)]! text-[var(--text-primary)]! outline-none cursor-pointer appearance-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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
            Filter
            {activeFiltersCount > 0 && (
              <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-gold)] text-[10px] font-semibold">
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
              className="inline-flex items-center gap-1 py-1 px-2 border-0 bg-transparent cursor-pointer text-[11px] text-[var(--text-muted)] font-primary hover:text-[var(--text-secondary)] transition-colors"
            >
              <X size={11} /> Clear all
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
                <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)] font-semibold">
                  Price Range
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder={`$${priceRange.min}`}
                    value={activeFilters.minPrice ?? ""}
                    onChange={(e) =>
                      onFiltersChange({
                        ...activeFilters,
                        minPrice: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-20 py-1.5 px-2.5 border border-[var(--border-subtle)] rounded-md text-xs font-primary bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none"
                  />
                  <span className="text-xs text-[var(--text-muted)]">to</span>
                  <input
                    type="number"
                    placeholder={`$${priceRange.max}`}
                    value={activeFilters.maxPrice ?? ""}
                    onChange={(e) =>
                      onFiltersChange({
                        ...activeFilters,
                        maxPrice: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-20 py-1.5 px-2.5 border border-[var(--border-subtle)] rounded-md text-xs font-primary bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none"
                  />
                </div>
              </div>

              {/* Size */}
              {availableSizes.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)] font-semibold">
                    Size
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSizes.map((size) => {
                      const active = activeFilters.sizes.includes(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleSize(size)}
                          className={`inline-flex items-center justify-center min-w-[36px] h-8 px-2 rounded-md text-xs font-medium font-primary border transition-colors ${
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
                  <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)] font-semibold">
                    Color
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
