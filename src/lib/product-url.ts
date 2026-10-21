/** Storefront URL of a product: `/shop/<category>/<subcategory>/<id>` (no locale prefix: use the `Link` / `useRouter` from `@/src/i18n/navigation`). */
export function buildProductPath(id: string, categorySlug?: string | null, subcategorySlug?: string | null): string | null {
  return categorySlug && subcategorySlug ? `/shop/${categorySlug}/${subcategorySlug}/${id}` : null;
}

/**
 * Product URL from the product itself — the full product or the `ProductSummary` of autocomplete and reviews
 * (`category` / `subcategory` can be `null` there). `null` when the product carries no slugs: hide the link or
 * fall back (`getProductUrl`).
 */
export function productPath(product: {
  id: string;
  category?: { slug: string } | null;
  subcategory?: { slug: string } | null;
}): string | null {
  return buildProductPath(product.id, product.category?.slug, product.subcategory?.slug);
}
