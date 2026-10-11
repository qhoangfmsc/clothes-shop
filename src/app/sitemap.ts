import type { MetadataRoute } from "next";
import { routing } from "@/src/i18n/routing";
import { SITE_URL } from "@/src/lib/site-url";
import {
  getCategories,
  getCollections,
  getProductsWithParams,
} from "./[locale]/(public)/shop/_lib/server-fetchers";
import type { Product } from "@/src/types/product";

/* Rebuilt at most once an hour so new products show up without a redeploy. */
export const revalidate = 3600;

const STATIC_PATHS = ["", "/shop", "/collections", "/new-in", "/about"];
const PAGE_SIZE = 100; // API maximum
const MAX_PAGES = 100; // API maximum

/** One sitemap entry per language; every entry lists all language versions (hreflang). */
function localizedEntries(
  path: string,
  lastModified?: string,
  priority?: number
): MetadataRoute.Sitemap {
  const languages = {
    ...Object.fromEntries(routing.locales.map((locale) => [locale, `${SITE_URL}/${locale}${path}`])),
    "x-default": `${SITE_URL}/${routing.defaultLocale}${path}`,
  };
  return routing.locales.map((locale) => ({
    url: `${SITE_URL}/${locale}${path}`,
    lastModified,
    priority,
    alternates: { languages },
  }));
}

/** The API returns 24 products by default, so walk every page. */
async function fetchAllProducts(): Promise<Product[]> {
  const products: Product[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await getProductsWithParams({ page, limit: PAGE_SIZE });
    products.push(...result.data);
    if (result.data.length === 0 || products.length >= result.total) break;
  }
  return products;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  /* A failing API must not take the whole sitemap down: fall back to whatever succeeded. */
  const [categories, collections, products] = await Promise.allSettled([
    getCategories(),
    getCollections(),
    fetchAllProducts(),
  ]);

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.flatMap((path) =>
    localizedEntries(path, undefined, path === "" ? 1 : 0.8)
  );

  if (categories.status === "fulfilled") {
    for (const category of categories.value) {
      entries.push(...localizedEntries(`/shop/${category.slug}`, category.updatedAt, 0.7));
      for (const sub of category.subcategories) {
        entries.push(...localizedEntries(`/shop/${category.slug}/${sub.slug}`, category.updatedAt, 0.6));
      }
    }
  }

  if (collections.status === "fulfilled") {
    for (const collection of collections.value) {
      entries.push(...localizedEntries(`/collections/${collection.slug}`, collection.updatedAt, 0.7));
    }
  }

  if (products.status === "fulfilled") {
    for (const product of products.value) {
      if (!product.category || !product.subcategory) continue;
      entries.push(
        ...localizedEntries(
          `/shop/${product.category.slug}/${product.subcategory.slug}/${product.id}`,
          product.updatedAt,
          0.9
        )
      );
    }
  }

  return entries;
}
