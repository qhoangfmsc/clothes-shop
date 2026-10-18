"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import ProductGrid from "./ProductGrid";
import ShopFilters, { DEFAULT_SORT, type ActiveFilters } from "./ShopFilters";
import { fetchProductPage } from "@/src/hooks/use-api";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import type { Product } from "@/src/types/product";
import type { ProductBadge } from "@/src/types/enums";
import type { ProductListParams } from "../_lib/server-fetchers";
import { SHOP_PAGE_SIZE } from "../_common/constants";

interface ShopProductsClientProps {
  /** First page, rendered on the server */
  initialProducts: Product[];
  /** Products matching the page (all pages), from the same response as `initialProducts` */
  initialTotal: number;
  /** What the page itself is about (a category, the "new" badge…); every request carries it */
  scope?: { category?: string; subcategory?: string; badge?: ProductBadge };
  /** Optional heading section above the toolbar */
  heading?: React.ReactNode;
}

const EMPTY_FILTERS: ActiveFilters = {
  sort: DEFAULT_SORT,
  minPrice: null,
  maxPrice: null,
  sizes: [],
  colors: [],
  minRating: null,
};

/** Filters and sort are the BE's job (`GET /api/products`): the grid holds the pages fetched so far. "Xem thêm"
 *  fetches only the next page and appends it; changing a filter starts again from page 1. */
export default function ShopProductsClient({ initialProducts, initialTotal, scope, heading }: ShopProductsClientProps) {
  const t = useTranslations("public.shop.components.productsClient");
  const { toast } = useToast();
  const [filters, setFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  /* Sizes and colors offered by the filter: everything seen so far (it only grows, so choices never vanish) */
  const [sizes, setSizes] = useState<string[]>(() => collectSizes([], initialProducts));
  const [colors, setColors] = useState<[string, string][]>(() => collectColors([], initialProducts));
  /* Bumped on every filter change: an answer that comes back for an older request is dropped */
  const requestRef = useRef(0);

  const queryFor = useCallback(
    (next: ActiveFilters, pageNumber: number): ProductListParams => ({
      ...scope,
      sort: next.sort,
      minPrice: next.minPrice ?? undefined,
      maxPrice: next.maxPrice ?? undefined,
      minRating: next.minRating ?? undefined,
      sizes: next.sizes.length > 0 ? next.sizes.join(",") : undefined,
      colors: next.colors.length > 0 ? next.colors.join(",") : undefined,
      page: pageNumber,
      limit: SHOP_PAGE_SIZE,
    }),
    [scope]
  );

  const remember = useCallback((incoming: Product[]) => {
    setSizes((prev) => collectSizes(prev, incoming));
    setColors((prev) => collectColors(prev, incoming));
  }, []);

  /* A filter or the sort changed: the first page of the new result replaces the grid */
  const handleFiltersChange = useCallback(
    async (next: ActiveFilters) => {
      const request = ++requestRef.current;
      setFilters(next);
      setIsLoadingMore(false);
      try {
        const res = await fetchProductPage(queryFor(next, 1));
        if (request !== requestRef.current) return;
        setProducts(res.data);
        setTotal(res.total);
        setPage(1);
        remember(res.data);
      } catch {
        if (request === requestRef.current) toast.error(t("loadFailed"));
      }
    },
    [queryFor, remember, toast, t]
  );

  /* "Xem thêm": only the next page is requested; the products already shown stay as they are */
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore) return;
    const request = requestRef.current;
    setIsLoadingMore(true);
    try {
      const res = await fetchProductPage(queryFor(filters, page + 1));
      if (request !== requestRef.current) return;
      setProducts((prev) => {
        const shown = new Set(prev.map((p) => p.id));
        return [...prev, ...res.data.filter((p) => !shown.has(p.id))];
      });
      setTotal(res.total);
      setPage((p) => p + 1);
      remember(res.data);
    } catch {
      if (request === requestRef.current) toast.error(t("loadFailed"));
    } finally {
      if (request === requestRef.current) setIsLoadingMore(false);
    }
  }, [isLoadingMore, queryFor, filters, page, remember, toast, t]);

  const hasMore = products.length < total;

  return (
    <div className="flex flex-col gap-4">
      {heading && <div key="heading">{heading}</div>}

      {/* Toolbar: Sort + Filter + Count */}
      <div className="px-4 sm:px-6 lg:px-8">
        <ShopFilters
          sizes={sizes}
          colors={colors}
          activeFilters={filters}
          onFiltersChange={handleFiltersChange}
          totalFiltered={total}
        />
      </div>

      {/* Product Grid */}
      <ProductGrid products={products} />

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pb-14">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="relative inline-flex items-center gap-2 py-3 px-8 border border-[var(--border-light)] rounded-full font-primary text-xs text-[var(--text-accent)] tracking-[0.08em] uppercase bg-transparent cursor-pointer overflow-hidden group disabled:cursor-wait disabled:opacity-60"
            style={{ transition: "all 300ms ease" }}
          >
            <span className="relative z-10 group-hover:text-[var(--text-on-gold)] transition-colors duration-300">
              {isLoadingMore ? t("loadingMore") : t("loadMore")}
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

function collectSizes(known: string[], incoming: Product[]): string[] {
  const set = new Set(known);
  incoming.forEach((p) => p.sizes?.forEach((size) => set.add(size)));
  return Array.from(set).sort();
}

function collectColors(known: [string, string][], incoming: Product[]): [string, string][] {
  const map = new Map<string, string>(known);
  incoming.forEach((p) =>
    p.colors?.forEach(({ name, hex }) => {
      if (!map.has(name)) map.set(name, hex);
    })
  );
  return Array.from(map.entries());
}
