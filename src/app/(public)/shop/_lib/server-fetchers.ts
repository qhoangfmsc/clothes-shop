/* ═══════════════════════════════════════════════════════════
   SERVER FETCHERS — Call real BE API (clothes-shop-api)
   
   Used by Server Components (page.tsx) for SSR/SSG data.
   BE runs on a separate project at NEXT_PUBLIC_API_URL.
   ═══════════════════════════════════════════════════════════ */

import type { Product } from "@/src/types/product";
import type { Category, CategoryUIConfig } from "@/src/types/category";
import type { Collection } from "@/src/types/collection";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7001";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }

  return res.json();
}

/* ═══ Products ═══ */

export async function getProducts(category?: string, subcategory?: string): Promise<Product[]> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (subcategory) params.set("subcategory", subcategory);
  const qs = params.toString();
  const { data } = await apiFetch<{ data: Product[]; total: number }>(
    `/api/products${qs ? `?${qs}` : ""}`
  );
  return data;
}

export async function getAllProducts(): Promise<Product[]> {
  const { data } = await apiFetch<{ data: Product[]; total: number }>("/api/products");
  return data;
}

export async function getNewInProducts(): Promise<Product[]> {
  const { data } = await apiFetch<{ data: Product[]; total: number }>("/api/products?badge=new");
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

/* ═══ Categories ═══ */

export async function getCategories(): Promise<Category[]> {
  const { data } = await apiFetch<{
    data: Category[];
    uiConfigs: Record<string, CategoryUIConfig>;
    total: number;
  }>("/api/categories");
  return data;
}

export async function getCategoriesWithUI(): Promise<{
  categories: Category[];
  uiConfigs: Record<string, CategoryUIConfig>;
}> {
  const result = await apiFetch<{
    data: Category[];
    uiConfigs?: Record<string, CategoryUIConfig>;
    total: number;
  }>("/api/categories");
  return { categories: result.data, uiConfigs: result.uiConfigs ?? {} };
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  try {
    const { data } = await apiFetch<{ data: Category; uiConfig: CategoryUIConfig | null }>(
      `/api/categories?slug=${slug}`
    );
    return data;
  } catch {
    return undefined;
  }
}

export async function getCategoryUIConfig(slug: string): Promise<CategoryUIConfig | undefined> {
  try {
    const result = await apiFetch<{ data: Category; uiConfig: CategoryUIConfig | null }>(
      `/api/categories?slug=${slug}`
    );
    return result.uiConfig ?? undefined;
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

/* ═══ Collections ═══ */

export async function getCollections(): Promise<Collection[]> {
  const { data } = await apiFetch<{ data: Collection[]; total: number }>("/api/collections");
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
