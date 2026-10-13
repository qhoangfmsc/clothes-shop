/* ═══════════════════════════════════════════════════════════
   SWR HOOKS — Client-side data fetching with caching

   Calls real BE API at NEXT_PUBLIC_API_URL.
   Uses SWR's staleWhileRevalidate pattern.

   Phase 1: Updated to match BE Public API (search, pagination, filter).
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import useSWR, { useSWRConfig } from "swr";
import type { Product } from "@/src/types/product";
import type { ProductBadge } from "@/src/types/enums";
import type { Category } from "@/src/types/category";
import { PUBLIC_CATEGORIES_QUERY } from "@/src/lib/category-display";
import { buildListQuery } from "@/src/lib/list-query";
import type { Collection } from "@/src/types/collection";
import type { Review } from "@/src/types/review";
import type { SizeGuide } from "@/src/types/size-guide";
import type { ShippingInfo } from "@/src/types/shipping";
import type { BannerItem, SiteConfig } from "@/src/types/site-config";
import type { ProductListParams, ProductListResponse } from "@/src/app/[locale]/(public)/shop/_lib/server-fetchers";
import { mapMediaUrls } from "@/src/lib/media-url";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7001";

/* ── Base fetcher ── */
const fetcher = <T,>(url: string): Promise<T> =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json().then(mapMediaUrls) as Promise<T>;
  });

/* ── SWR default config ── */
const defaultConfig = {
  revalidateOnFocus: false,
  dedupingInterval: 30_000, /* 30s dedup */
};

/* ═══ Products ═══ */

function buildProductQS(params: ProductListParams): string {
  return buildListQuery(params, {
    category: params.category,
    subcategory: params.subcategory,
    badge: params.badge,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    sizes: params.sizes,
    colors: params.colors,
  });
}

export function useProducts(params: ProductListParams = {}) {
  const qs = buildProductQS(params);

  const { data, error, isLoading, mutate } = useSWR<ProductListResponse>(
    `${API_URL}/api/products${qs ? `?${qs}` : ""}`,
    fetcher,
    defaultConfig
  );

  return {
    products: data?.data ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    limit: data?.limit ?? 24,
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useProduct(id: string | null) {
  const { data, error, isLoading } = useSWR<{
    data: Product;
    related: Product[];
  }>(
    id ? `${API_URL}/api/products/${id}` : null,
    fetcher,
    defaultConfig
  );

  return {
    product: data?.data ?? null,
    related: data?.related ?? [],
    isLoading,
    isError: !!error,
  };
}

export function useNewInProducts() {
  const { data, isLoading, error } = useSWR<ProductListResponse>(
    `${API_URL}/api/products?badge=new`,
    fetcher,
    defaultConfig
  );

  return {
    products: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
  };
}

/* ═══ Categories ═══ */
export function useCategories() {
  const { data, isLoading, error } = useSWR<{
    data: Category[];
    total: number;
  }>(
    `${API_URL}/api/categories?${PUBLIC_CATEGORIES_QUERY}`,
    fetcher,
    defaultConfig
  );

  return {
    categories: data?.data ?? [],
    isLoading,
    isError: !!error,
  };
}

export function useCategory(slug: string | null) {
  const { data, isLoading, error } = useSWR<{
    data: Category;
  }>(
    slug ? `${API_URL}/api/categories?slug=${slug}` : null,
    fetcher,
    defaultConfig
  );

  return {
    category: data?.data ?? null,
    isLoading,
    isError: !!error,
  };
}

/* ═══ Collections ═══ */
export function useCollections() {
  const { data, isLoading, error } = useSWR<{ data: Collection[]; total: number }>(
    `${API_URL}/api/collections`,
    fetcher,
    defaultConfig
  );

  return {
    collections: data?.data ?? [],
    isLoading,
    isError: !!error,
  };
}

export function useCollection(slug: string | null) {
  const { data, isLoading, error } = useSWR<{
    data: Collection;
    products: Product[];
  }>(
    slug ? `${API_URL}/api/collections?slug=${slug}` : null,
    fetcher,
    defaultConfig
  );

  return {
    collection: data?.data ?? null,
    products: data?.products ?? [],
    isLoading,
    isError: !!error,
  };
}

/* ═══ Reviews ═══ */
export function useReviews(productId: string | null, page = 1, limit = 24) {
  const q = buildListQuery({ page, limit: limit !== 24 ? limit : undefined });

  const { data, isLoading, error } = useSWR<{
    data: Review[];
    total: number;
  }>(
    productId ? `${API_URL}/api/reviews/${productId}${q ? `?${q}` : ""}` : null,
    fetcher,
    defaultConfig
  );

  /* Compute average on client side */
  const reviews = data?.data ?? [];
  const average = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return {
    reviews,
    average,
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
  };
}

/* ═══ Size Guide ═══ */
export function useSizeGuide(category: string | null) {
  const { data, isLoading, error } = useSWR<{ data: SizeGuide }>(
    category ? `${API_URL}/api/size-guides/${category}` : null,
    fetcher,
    defaultConfig
  );

  return {
    sizeGuide: data?.data ?? null,
    isLoading,
    isError: !!error,
  };
}

/* ═══ Shipping ═══ */
const SHIPPING_URL = `${API_URL}/api/shipping`;

/** Drops the cached shipping info (it is kept 5 min) so pages re-read it — call after the admin changes it */
export function useRefreshShipping() {
  const { mutate } = useSWRConfig();
  return useCallback(() => mutate(SHIPPING_URL), [mutate]);
}

export function useShipping() {
  const { data, isLoading, error } = useSWR<{ data: ShippingInfo }>(
    SHIPPING_URL,
    fetcher,
    { ...defaultConfig, revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  return {
    shipping: data?.data ?? null,
    isLoading,
    isError: !!error,
  };
}

/** Name of a shipping method as the admin configured it; `undefined` until the config is loaded or for an unknown id.
 *  Orders only store the method id, so every screen that names a method reads it from here. */
export function useShippingMethodName() {
  const { shipping } = useShipping();
  return useCallback(
    (id: string): string | undefined => shipping?.methods.find((method) => method.id === id)?.name,
    [shipping]
  );
}

/* ═══ Site Config (banners) ═══
   Decorative/replaceable content — a failed or missing config never
   surfaces as isError to the caller; it just resolves to an empty
   banners array so the component falls back to its own default. */
export function useBannerConfig(key: string) {
  const { data, isLoading } = useSWR<{ data: SiteConfig | null }>(
    `${API_URL}/api/site-config?key=${key}`,
    fetcher,
    defaultConfig
  );

  const banners: BannerItem[] = useMemo(() => {
    if (!data?.data?.value) return [];
    try {
      const parsed = JSON.parse(data.data.value);
      return Array.isArray(parsed) ? mapMediaUrls(parsed) : [];
    } catch {
      return [];
    }
  }, [data]);

  return { banners, isLoading };
}

/* ═══ Autocomplete — debounced search for nav dropdown ═══ */

export interface AutocompleteItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  /** `custom_order` products show no price in the search dropdown. */
  badge: ProductBadge | null;
}

export interface AutocompleteResponse {
  data: AutocompleteItem[];
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

/** Suggestions the BE returns per search (`limit`, 1–10; it answers 400 above 10). */
export function useAutocomplete(limit: number) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AutocompleteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /* Read inside the debounced callback, which is created once */
  const limitRef = useRef(limit);
  limitRef.current = limit;

  const search = useCallback((q: string) => {
    setQuery(q);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (q.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;

      const params = new URLSearchParams({ q: q.trim(), limit: String(limitRef.current) });
      fetch(`${API_URL}/api/products/autocomplete?${params}`, {
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Autocomplete error: ${res.status}`);
          return res.json().then(mapMediaUrls) as Promise<AutocompleteResponse>;
        })
        .then((data) => {
          setResults(data.data ?? []);
          setIsLoading(false);
          abortRef.current = null;
        })
        .catch((err) => {
          if (err.name === "AbortError") return; // Ignore aborted requests
          setResults([]);
          setIsLoading(false);
          abortRef.current = null;
        });

      debounceRef.current = null;
    }, DEBOUNCE_MS);
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsLoading(false);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { query, results, isLoading, search, clear };
}

/**
 * Resolve a product's real detail-page URL (`/shop/{category}/{subcategory}/{id}`).
 * Autocomplete results only carry id/name/slug/price/image — not enough to build
 * the URL — so this looks the product up by id first. Used on click, not render,
 * so it's a plain fetch rather than a hook.
 */
export async function getProductUrl(id: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/products/${id}`);
    if (!res.ok) return null;
    const { data }: { data: Product } = await res.json();
    if (!data.category || !data.subcategory) return null;
    return `/shop/${data.category.slug}/${data.subcategory.slug}/${data.id}`;
  } catch {
    return null;
  }
}
