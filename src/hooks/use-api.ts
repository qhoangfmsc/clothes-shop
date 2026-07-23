/* ═══════════════════════════════════════════════════════════
   SWR HOOKS — Client-side data fetching with caching

   Calls real BE API at NEXT_PUBLIC_API_URL.
   Uses SWR's staleWhileRevalidate pattern.

   Phase 1: Updated to match BE Public API (search, pagination, filter).
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import type { Product } from "@/src/types/product";
import type { Category, CategoryUIConfig } from "@/src/types/category";
import type { Collection } from "@/src/types/collection";
import type { Review } from "@/src/types/review";
import type { SizeGuide } from "@/src/types/size-guide";
import type { ShippingInfo } from "@/src/types/shipping";
import type { ProductListParams, ProductListResponse } from "@/src/app/(public)/shop/_lib/server-fetchers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7001";

/* ── Base fetcher ── */
const fetcher = <T,>(url: string): Promise<T> =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  });

/* ── SWR default config ── */
const defaultConfig = {
  revalidateOnFocus: false,
  dedupingInterval: 30_000, /* 30s dedup */
};

/* ═══ Products ═══ */

function buildProductQS(params: ProductListParams): string {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.category) qs.set("category", params.category);
  if (params.subcategory) qs.set("subcategory", params.subcategory);
  if (params.badge) qs.set("badge", params.badge);
  if (params.sort) qs.set("sort", params.sort);
  if (params.minPrice != null) qs.set("minPrice", String(params.minPrice));
  if (params.maxPrice != null) qs.set("maxPrice", String(params.maxPrice));
  if (params.sizes) qs.set("sizes", params.sizes);
  if (params.colors) qs.set("colors", params.colors);
  if (params.page && params.page > 1) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  return qs.toString();
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
    uiConfigs: Record<string, CategoryUIConfig>;
    total: number;
  }>(
    `${API_URL}/api/categories`,
    fetcher,
    defaultConfig
  );

  return {
    categories: data?.data ?? [],
    uiConfigs: data?.uiConfigs ?? {},
    isLoading,
    isError: !!error,
  };
}

export function useCategory(slug: string | null) {
  const { data, isLoading, error } = useSWR<{
    data: Category;
    uiConfig: CategoryUIConfig | null;
  }>(
    slug ? `${API_URL}/api/categories?slug=${slug}` : null,
    fetcher,
    defaultConfig
  );

  return {
    category: data?.data ?? null,
    uiConfig: data?.uiConfig ?? null,
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
  const qs = new URLSearchParams();
  if (page > 1) qs.set("page", String(page));
  if (limit !== 24) qs.set("limit", String(limit));
  const q = qs.toString();

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
export function useShipping() {
  const { data, isLoading, error } = useSWR<{ data: ShippingInfo }>(
    `${API_URL}/api/shipping`,
    fetcher,
    { ...defaultConfig, revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  return {
    shipping: data?.data ?? null,
    isLoading,
    isError: !!error,
  };
}

/* ═══ Autocomplete — debounced search for nav dropdown ═══ */

export interface AutocompleteItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
}

export interface AutocompleteResponse {
  data: AutocompleteItem[];
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export function useAutocomplete() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AutocompleteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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

      fetch(`${API_URL}/api/products/autocomplete?q=${encodeURIComponent(q.trim())}`, {
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Autocomplete error: ${res.status}`);
          return res.json() as Promise<AutocompleteResponse>;
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
