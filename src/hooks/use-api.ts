/* ═══════════════════════════════════════════════════════════
   SWR HOOKS — Client-side data fetching with caching
   
   Uses SWR's staleWhileRevalidate:
   - First visit: show loading → fetch → cache
   - Return visit: show cached data instantly → refetch in background
   - Data unchanged: no re-render
   
   Usage:
     const { products, isLoading } = useProducts("tops");
     const { product, related, isLoading } = useProduct("tops-1");
     const { reviews, average, isLoading } = useReviews("tops-1");
   ═══════════════════════════════════════════════════════════ */

import useSWR from "swr";
import type { Product } from "@/src/types/product";
import type { Category, CategoryUIConfig } from "@/src/types/category";
import type { Collection } from "@/src/types/collection";
import type { Review } from "@/src/types/review";
import type { SizeGuide } from "@/src/types/size-guide";
import type { ShippingInfo } from "@/src/types/shipping";

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
export function useProducts(category?: string, subcategory?: string) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (subcategory) params.set("subcategory", subcategory);
  const qs = params.toString();

  const { data, error, isLoading, mutate } = useSWR<{ data: Product[]; total: number }>(
    `/api/products${qs ? `?${qs}` : ""}`,
    fetcher,
    defaultConfig
  );

  return {
    products: data?.data ?? [],
    total: data?.total ?? 0,
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
    id ? `/api/products/${id}` : null,
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
  const { data, isLoading, error } = useSWR<{ data: Product[] }>(
    "/api/products?badge=new",
    fetcher,
    defaultConfig
  );

  return {
    products: data?.data ?? [],
    isLoading,
    isError: !!error,
  };
}

/* ═══ Categories ═══ */
export function useCategories() {
  const { data, isLoading, error } = useSWR<{ data: Category[] }>(
    "/api/categories",
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
    uiConfig: CategoryUIConfig | null;
  }>(
    slug ? `/api/categories?slug=${slug}` : null,
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
  const { data, isLoading, error } = useSWR<{ data: Collection[] }>(
    "/api/collections",
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
    slug ? `/api/collections?slug=${slug}` : null,
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
export function useReviews(productId: string | null) {
  const { data, isLoading, error } = useSWR<{
    data: Review[];
    average: number;
    total: number;
  }>(
    productId ? `/api/reviews/${productId}` : null,
    fetcher,
    defaultConfig
  );

  return {
    reviews: data?.data ?? [],
    average: data?.average ?? 0,
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
  };
}

/* ═══ Size Guide ═══ */
export function useSizeGuide(category: string | null) {
  const { data, isLoading, error } = useSWR<{ data: SizeGuide }>(
    category ? `/api/size-guides/${category}` : null,
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
    "/api/shipping",
    fetcher,
    { ...defaultConfig, revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  return {
    shipping: data?.data ?? null,
    isLoading,
    isError: !!error,
  };
}
