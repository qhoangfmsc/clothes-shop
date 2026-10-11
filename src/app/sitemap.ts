import type { MetadataRoute } from "next";
import { routing } from "@/src/i18n/routing";
import { SITE_URL } from "@/src/lib/site-url";
import {
  getCategories,
  getCollections,
  getProductsWithParams,
} from "./[locale]/(public)/shop/_lib/server-fetchers";
import { absoluteUrl } from "@/src/lib/structured-data";
import { LEGAL_DOCS } from "@/src/lib/legal";
import type { Product } from "@/src/types/product";

/* Rebuilt at most once an hour so new products show up without a redeploy. */
export const revalidate = 3600;

/* `about` is hand-written content, so it has no data-driven lastModified. */
const STATIC_PATHS = [
  "",
  "/shop",
  "/collections",
  "/new-in",
  "/about",
  /* The /legal overview is left out on purpose — it repeats these three pages and is noindex */
  ...LEGAL_DOCS.map((doc) => doc.path),
];
const PAGE_SIZE = 100; // API maximum
const MAX_PAGES = 100; // API maximum

/** One sitemap entry per language; every entry lists all language versions (hreflang). */
function localizedEntries(
  path: string,
  lastModified?: string,
  priority?: number,
  images?: string[]
): MetadataRoute.Sitemap {
  const languages = {
    ...Object.fromEntries(
      routing.locales.map((locale) => [locale, `${SITE_URL}/${locale}${path}`])
    ),
    "x-default": `${SITE_URL}/${routing.defaultLocale}${path}`,
  };
  return routing.locales.map((locale) => ({
    url: `${SITE_URL}/${locale}${path}`,
    lastModified,
    priority,
    alternates: { languages },
    ...(images && images.length > 0 && { images: images.map(absoluteUrl) }),
  }));
}

/** Newest ISO date among the given ones (ISO strings sort chronologically). */
function newest(dates: Array<string | undefined>): string | undefined {
  return dates
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);
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

  /* The API gives categories no `updatedAt` and its subcategory `count` is unreliable, so
     "last modified" and "has products" are derived from the products themselves. */
  const productList = products.status === "fulfilled" ? products.value : [];
  const collectionList = collections.status === "fulfilled" ? collections.value : [];
  const newestProduct = newest(productList.map((p) => p.updatedAt));
  const lastModifiedByPath = new Map<string, string | undefined>();
  for (const p of productList) {
    if (!p.category || !p.subcategory) continue;
    for (const path of [
      `/shop/${p.category.slug}`,
      `/shop/${p.category.slug}/${p.subcategory.slug}`,
    ]) {
      lastModifiedByPath.set(path, newest([lastModifiedByPath.get(path), p.updatedAt]));
    }
  }

  const staticLastModified: Record<string, string | undefined> = {
    "": newestProduct,
    "/shop": newestProduct,
    "/new-in": newestProduct,
    "/collections": newest(collectionList.map((c) => c.updatedAt)),
  };

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.flatMap((path) =>
    localizedEntries(path, staticLastModified[path], path === "" ? 1 : 0.8)
  );

  if (categories.status === "fulfilled") {
    for (const category of categories.value) {
      entries.push(
        ...localizedEntries(
          `/shop/${category.slug}`,
          lastModifiedByPath.get(`/shop/${category.slug}`),
          0.7
        )
      );
      for (const sub of category.subcategories) {
        const path = `/shop/${category.slug}/${sub.slug}`;
        /* An empty subcategory page is thin content — leave it out until it has products
           (kept when the product list itself failed to load, so one API error can't drop them all). */
        if (products.status === "fulfilled" && !lastModifiedByPath.has(path)) continue;
        entries.push(...localizedEntries(path, lastModifiedByPath.get(path), 0.6));
      }
    }
  }

  for (const collection of collectionList) {
    entries.push(
      ...localizedEntries(`/collections/${collection.slug}`, collection.updatedAt, 0.7, [
        collection.image,
      ])
    );
  }

  for (const product of productList) {
    if (!product.category || !product.subcategory) continue;
    entries.push(
      ...localizedEntries(
        `/shop/${product.category.slug}/${product.subcategory.slug}/${product.id}`,
        product.updatedAt,
        0.9,
        product.images
      )
    );
  }

  return entries;
}
