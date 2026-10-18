/* ═══════════════════════════════════════════════════════════
   SERVER FETCHERS — Call real BE API (clothes-shop-api)

   Used by Server Components (page.tsx) for SSR/SSG data.
   BE runs on a separate project at NEXT_PUBLIC_API_URL.

   Phase 1 (2026-07): Added search, pagination, sort, filter
   params matching BE PublicProductQueryDto.
   ═══════════════════════════════════════════════════════════ */

import type { Product } from "@/src/types/product";
import { RELATED_PRODUCTS_LIMIT } from "../_common/constants";
import type { ProductBadge } from "@/src/types/enums";
import type { Category } from "@/src/types/category";
import { PUBLIC_CATEGORIES_QUERY } from "@/src/lib/category-display";
import type { Collection } from "@/src/types/collection";
import type { BannerItem, SiteConfig } from "@/src/types/site-config";
import type { ShippingInfo } from "@/src/types/shipping";
import { mapMediaUrls } from "@/src/lib/media-url";
import { buildListQuery, LIST_MAX_LIMIT } from "@/src/lib/list-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7001";

async function apiFetch<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    next: { revalidate },
  });

  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }

  return mapMediaUrls(await res.json());
}

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

export interface ProductListParams {
  search?: string;
  category?: string;
  subcategory?: string;
  badge?: ProductBadge;
  /** `field` = ascending, `-field` = descending (BE whitelist). */
  sort?:
    | "price"
    | "-price"
    | "name"
    | "-name"
    | "createdAt"
    | "-createdAt"
    | "ratingAverage"
    | "-ratingAverage"
    | "-ratingCount";
  /** 1–5: only products whose average is at least this (products without a review are left out) */
  minRating?: number;
  /** Whole VND: the BE filters and sorts prices in VND only */
  minPrice?: number;
  maxPrice?: number;
  sizes?: string;   // "S,M,L"
  colors?: string;  // "Red,Blue"
  page?: number;
  limit?: number;
}

export interface ProductListResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface CategoryListResponse {
  data: Category[];
  total: number;
  page: number;
  limit: number;
}

export interface CollectionListResponse {
  data: Collection[];
  total: number;
  page: number;
  limit: number;
}

/* ═══════════════════════════════════════════════════════════
   PRODUCTS
   ═══════════════════════════════════════════════════════════ */

function buildProductQS(params: ProductListParams): string {
  return buildListQuery(params, {
    category: params.category,
    subcategory: params.subcategory,
    badge: params.badge,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    minRating: params.minRating,
    sizes: params.sizes,
    colors: params.colors,
  });
}

export async function getProducts(category?: string, subcategory?: string): Promise<Product[]> {
  const params: ProductListParams = { category, subcategory };
  const qs = buildProductQS(params);
  const { data } = await apiFetch<ProductListResponse>(
    `/api/products${qs ? `?${qs}` : ""}`
  );
  return data;
}

export async function getProductsWithParams(params: ProductListParams): Promise<ProductListResponse> {
  const qs = buildProductQS(params);
  return apiFetch<ProductListResponse>(`/api/products${qs ? `?${qs}` : ""}`);
}

export async function getAllProducts(): Promise<Product[]> {
  const { data } = await apiFetch<ProductListResponse>("/api/products");
  return data;
}

export async function getProductById(id: string): Promise<Product | undefined> {
  try {
    const { data } = await apiFetch<{ data: Product; related: Product[] }>(`/api/products/${id}`);
    return data;
  } catch {
    return undefined;
  }
}

export async function getProductWithRelated(id: string): Promise<{
  product: Product;
  related: Product[];
} | undefined> {
  try {
    const result = await apiFetch<{ data: Product; related: Product[] }>(
      `/api/products/${id}?relatedLimit=${RELATED_PRODUCTS_LIMIT}`,
    );
    return { product: result.data, related: result.related };
  } catch {
    return undefined;
  }
}

/* ═══════════════════════════════════════════════════════════
   CATEGORIES
   ═══════════════════════════════════════════════════════════ */

export async function getCategories(): Promise<Category[]> {
  const { data } = await apiFetch<CategoryListResponse>(`/api/categories?${PUBLIC_CATEGORIES_QUERY}`);
  return data;
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  try {
    const { data } = await apiFetch<{ data: Category }>(`/api/categories?slug=${slug}`);
    return data;
  } catch {
    return undefined;
  }
}

export async function getSubcategory(
  categorySlug: string,
  subcategorySlug: string
): Promise<{ category: Category; subcategory: Category["subcategories"][0] } | undefined> {
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return undefined;
  const subcategory = category.subcategories.find((s) => s.slug === subcategorySlug);
  if (!subcategory) return undefined;
  return { category, subcategory };
}

/* ═══════════════════════════════════════════════════════════
   COLLECTIONS
   ═══════════════════════════════════════════════════════════ */

export async function getCollections(): Promise<Collection[]> {
  /* Every collection in one page (BE max), like the categories: the default page would cut the list at 25 */
  const { data } = await apiFetch<CollectionListResponse>(`/api/collections?limit=${LIST_MAX_LIMIT}`);
  return data;
}

export async function getCollectionBySlug(slug: string): Promise<Collection | undefined> {
  try {
    const { data } = await apiFetch<{ data: Collection; products: Product[] }>(
      `/api/collections?slug=${slug}`
    );
    return data;
  } catch {
    return undefined;
  }
}

export async function getCollectionProducts(slug: string): Promise<Product[]> {
  const { products } = await apiFetch<{ data: Collection; products: Product[] }>(
    `/api/collections?slug=${slug}`
  );
  return products;
}

/* ═══════════════════════════════════════════════════════════
   SITE CONFIG (banners)

   Decorative/replaceable content — never let a config fetch
   failure break the page. Always falls back to [] (caller then
   uses its own built-in default banner/copy).
   ═══════════════════════════════════════════════════════════ */

export async function getBannerConfig(key: string): Promise<BannerItem[]> {
  try {
    const { data } = await apiFetch<{ data: SiteConfig | null }>(`/api/site-config?key=${key}`);
    if (!data?.value) return [];
    const parsed = JSON.parse(data.value);
    return Array.isArray(parsed) ? mapMediaUrls(parsed) : [];
  } catch {
    return [];
  }
}

/** Shipping methods, free-shipping threshold and return policy as configured by the admin (`null` if the API is down) */
export async function getShippingInfo(): Promise<ShippingInfo | null> {
  try {
    const { data } = await apiFetch<{ data: ShippingInfo }>("/api/shipping");
    return data ?? null;
  } catch {
    return null;
  }
}
