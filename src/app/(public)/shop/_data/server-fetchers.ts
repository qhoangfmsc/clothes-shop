/* ═══════════════════════════════════════════════════════════
   SERVER FETCHERS — Fetch data from API routes
   
   These use fetch() to call API routes, same as a real FE
   would call a real BE. When you move to a separate BE,
   just change BASE_URL to your API domain.
   
   Used by Server Components and generateStaticParams.
   ═══════════════════════════════════════════════════════════ */

import type { Product } from "@/src/types/product";
import type { Category, CategoryUIConfig } from "@/src/types/category";
import type { Collection } from "@/src/types/collection";

/* ── Base URL: change this when moving to separate BE ── */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/* ── Generic fetch helper ── */
async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${path}`);
  return res.json();
}

/* ═══ Products ═══ */
export async function getProducts(category?: string, subcategory?: string): Promise<Product[]> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (subcategory) params.set("subcategory", subcategory);
  const qs = params.toString();
  const { data } = await apiFetch<{ data: Product[] }>(
    `/api/products${qs ? `?${qs}` : ""}`
  );
  return data;
}

export async function getAllProducts(): Promise<Product[]> {
  return getProducts();
}

export async function getNewInProducts(): Promise<Product[]> {
  const { data } = await apiFetch<{ data: Product[] }>("/api/products?badge=new");
  return data;
}

export async function getProductById(id: string): Promise<Product | undefined> {
  try {
    const { data } = await apiFetch<{ data: Product }>(`/api/products/${id}`);
    return data;
  } catch {
    return undefined;
  }
}

/* ═══ Categories ═══ */
export async function getCategories(): Promise<Category[]> {
  const { data } = await apiFetch<{ data: Category[] }>("/api/categories");
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
  const { data } = await apiFetch<{ data: Collection[] }>("/api/collections");
  return data;
}

export async function getCollectionBySlug(slug: string): Promise<Collection | undefined> {
  try {
    const { data } = await apiFetch<{ data: Collection }>(`/api/collections?slug=${slug}`);
    return data;
  } catch {
    return undefined;
  }
}

export async function getCollectionProducts(slug: string): Promise<Product[]> {
  const { products } = await apiFetch<{ products: Product[] }>(
    `/api/collections?slug=${slug}`
  );
  return products;
}
