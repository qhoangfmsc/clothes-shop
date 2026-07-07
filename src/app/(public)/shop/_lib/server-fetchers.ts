/* ═══════════════════════════════════════════════════════════
   SERVER FETCHERS — Pure FE API Simulation
   
   These functions simulate calling a real Backend via fetch().
   They are "Smart": 
   1. In Runtime (Dev/Prod): They call the API endpoints via HTTP.
   2. In Build-time: If the server isn't up, they fallback to local 
      data handlers to ensure next build succeeds with SSG.
   ═══════════════════════════════════════════════════════════ */

import type { Product } from "@/src/types/product";
import type { Category, CategoryUIConfig } from "@/src/types/category";
import type { Collection } from "@/src/types/collection";

// Fallback data handlers (used only when fetch fails during build)
import { PRODUCTS } from "@/src/app/api/products/data";
import { CATEGORIES, UI_CONFIG } from "@/src/app/api/categories/data";
import { COLLECTIONS } from "@/src/app/api/collections/data";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function apiFetch<T>(path: string): Promise<T> {
  try {
    // Attempt real API call
    const res = await fetch(`${BASE_URL}${path}`, {
      next: { revalidate: 3600 } // Enable caching/ISR feel
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  } catch (error: any) {
    /* ── Build-time Fallback Logic ── 
       If fetch fails (ECONNREFUSED), we are likely in a build process.
       We simulate the API response using the local data files.
    */
    const isConnectionError = error?.cause?.code === 'ECONNREFUSED' || error?.message?.includes('fetch failed');
    
    if (isConnectionError) {
      // 1. Handle /api/products/[id] (Product detail)
      const productDetailMatch = path.match(/\/api\/products\/([a-zA-Z0-9-]+)/);
      if (productDetailMatch && !path.includes('?')) {
        const id = productDetailMatch[1];
        const product = PRODUCTS.find(p => p.id === id);
        return { data: product } as any;
      }

      // 2. Handle /api/products (List/Filter)
      if (path.startsWith('/api/products')) {
        const url = new URL(path, 'http://localhost');
        const category = url.searchParams.get('category');
        const subcategory = url.searchParams.get('subcategory');
        const badge = url.searchParams.get('badge');
        
        let data = PRODUCTS.filter(p => p.status === 'active');
        if (category) data = data.filter(p => p.category === category);
        if (subcategory) data = data.filter(p => p.subcategory === subcategory);
        if (badge) data = data.filter(p => p.badge === badge);
        
        return { data } as any;
      }
      
      // 3. Handle /api/categories
      if (path.startsWith('/api/categories')) {
        const url = new URL(path, 'http://localhost');
        const slug = url.searchParams.get('slug');
        if (slug) {
          const category = CATEGORIES.find(c => c.slug === slug);
          return { data: category, uiConfig: UI_CONFIG[slug] } as any;
        }
        return { data: CATEGORIES, uiConfigs: UI_CONFIG } as any;
      }
      
      // 4. Handle /api/collections
      if (path.startsWith('/api/collections')) {
        const url = new URL(path, 'http://localhost');
        const slug = url.searchParams.get('slug');
        if (slug) {
          const collection = COLLECTIONS.find(c => c.slug === slug);
          const products = collection ? collection.productIds.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean) : [];
          return { data: collection, products } as any;
        }
        return { data: COLLECTIONS } as any;
      }
    }
    
    throw error;
  }
}

/* ═══ Public API Simulation ═══ */

export async function getProducts(category?: string, subcategory?: string): Promise<Product[]> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (subcategory) params.set("subcategory", subcategory);
  const qs = params.toString();
  const { data } = await apiFetch<{ data: Product[] }>(`/api/products${qs ? `?${qs}` : ""}`);
  return data;
}

export async function getAllProducts(): Promise<Product[]> {
  const { data } = await apiFetch<{ data: Product[] }>("/api/products");
  return data;
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

export async function getCategories(): Promise<Category[]> {
  const { data } = await apiFetch<{ data: Category[] }>("/api/categories");
  return data;
}

export async function getCategoriesWithUI(): Promise<{
  categories: Category[];
  uiConfigs: Record<string, CategoryUIConfig>;
}> {
  const result = await apiFetch<{
    data: Category[];
    uiConfigs: Record<string, CategoryUIConfig>;
  }>("/api/categories");
  return { categories: result.data, uiConfigs: result.uiConfigs };
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
  const { products } = await apiFetch<{ products: Product[] }>(`/api/collections?slug=${slug}`);
  return products;
}
