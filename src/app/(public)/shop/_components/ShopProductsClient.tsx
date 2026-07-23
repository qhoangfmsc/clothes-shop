"use client";

import { useState, useMemo, useCallback } from "react";
import ProductGrid from "./ProductGrid";
import ShopFilters, { type ActiveFilters } from "./ShopFilters";
import type { Product } from "@/src/types/product";

const ITEMS_PER_PAGE = 24;

interface ShopProductsClientProps {
  products: Product[];
  /** Optional heading section above the toolbar */
  heading?: React.ReactNode;
}

export default function ShopProductsClient({ products, heading }: ShopProductsClientProps) {
  const [filters, setFilters] = useState<ActiveFilters>({
    sort: "newest",
    minPrice: null,
    maxPrice: null,
    sizes: [],
    colors: [],
  });
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  /* ── Client-side filter + sort ── */
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by price
    if (filters.minPrice != null) {
      result = result.filter((p) => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice != null) {
      result = result.filter((p) => p.price <= filters.maxPrice!);
    }

    // Filter by sizes
    if (filters.sizes.length > 0) {
      result = result.filter((p) =>
        p.sizes?.some((s) => filters.sizes.includes(s))
      );
    }

    // Filter by colors
    if (filters.colors.length > 0) {
      result = result.filter((p) =>
        p.colors?.some((c) => filters.colors.includes(c.name))
      );
    }

    // Sort
    switch (filters.sort) {
      case "price_asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "name_asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name_desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "newest":
      default:
        // Products are already in newest-first order from the server
        break;
    }

    return result;
  }, [products, filters]);

  /* Reset visible count when filters change */
  const handleFiltersChange = useCallback((newFilters: ActiveFilters) => {
    setFilters(newFilters);
    setVisibleCount(ITEMS_PER_PAGE);
  }, []);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  return (
    <div className="flex flex-col gap-4">
      {heading && <div key="heading">{heading}</div>}

      {/* Toolbar: Sort + Filter + Count */}
      <div className="px-4 sm:px-6 lg:px-8">
        <ShopFilters
          products={products}
          activeFilters={filters}
          onFiltersChange={handleFiltersChange}
          totalFiltered={filteredProducts.length}
        />
      </div>

      {/* Product Grid */}
      <ProductGrid products={visibleProducts} />

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pb-14">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + ITEMS_PER_PAGE)}
            className="relative inline-flex items-center gap-2 py-3 px-8 border border-[var(--border-light)] rounded-full font-primary text-xs text-[var(--text-accent)] tracking-[0.08em] uppercase bg-transparent cursor-pointer overflow-hidden group"
            style={{ transition: "all 300ms ease" }}
          >
            <span className="relative z-10 group-hover:text-[var(--text-on-gold)] transition-colors duration-300">
              Load More ({filteredProducts.length - visibleCount} remaining)
            </span>
            <span
              className="absolute inset-0 bg-[var(--accent-primary)] rounded-full"
              style={{
                transform: "scaleX(0)",
                transformOrigin: "left",
                transition: "transform 350ms cubic-bezier(0.25, 0.1, 0.25, 1)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scaleX(1)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scaleX(0)")}
            />
          </button>
        </div>
      )}
    </div>
  );
}
