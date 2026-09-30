/* ═══════════════════════════════════════════════════════════
   SERVER FETCHERS — Call real BE API (clothes-shop-api)

   Used by Server Components (page.tsx) for SSR/SSG data.
   BE runs on a separate project at NEXT_PUBLIC_API_URL.

   Phase 1 (2026-07): Added search, pagination, sort, filter
   params matching BE PublicProductQueryDto.
   ═══════════════════════════════════════════════════════════ */

import type { Product } from "@/src/types/product";
import type { Category } from "@/src/types/category";
import type { Collection } from "@/src/types/collection";
import type { Review } from "@/src/types/review";
import type { BannerItem, SiteConfig } from "@/src/types/site-config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7001";

async function apiFetch<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    next: { revalidate },
  });

  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }

  return res.json();
}

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

export interface ProductListParams {
  search?: string;
  category?: string;
  subcategory?: string;
  badge?: string;
  sort?: "price_asc" | "price_desc" | "newest" | "name_asc" | "name_desc";
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

export interface ReviewListResponse {
  data: Review[];
  total: number;
  page: number;
  limit: number;
}

/* ═══════════════════════════════════════════════════════════
   PRODUCTS
   ═══════════════════════════════════════════════════════════ */

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

export async function getNewInProducts(): Promise<Product[]> {
  const { data } = await apiFetch<ProductListResponse>("/api/products?badge=new");
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
    const result = await apiFetch<{ data: Product; related: Product[] }>(`/api/products/${id}`);
    return { product: result.data, related: result.related };
  } catch {
    return undefined;
  }
}

/* ═══════════════════════════════════════════════════════════
   CATEGORIES
   ═══════════════════════════════════════════════════════════ */

export async function getCategories(): Promise<Category[]> {
  const { data } = await apiFetch<CategoryListResponse>("/api/categories");
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
  const { data } = await apiFetch<CollectionListResponse>("/api/collections");
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
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════
   REVIEWS
   ═══════════════════════════════════════════════════════════ */

export async function getReviews(
  productId: string,
  page = 1,
  limit = 24
): Promise<ReviewListResponse> {
  const qs = new URLSearchParams();
  if (page > 1) qs.set("page", String(page));
  if (limit !== 24) qs.set("limit", String(limit));
  const q = qs.toString();
  return apiFetch<ReviewListResponse>(`/api/reviews/${productId}${q ? `?${q}` : ""}`);
}
