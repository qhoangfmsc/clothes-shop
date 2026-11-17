/** Storefront URL of a product: `/shop/<category>/<subcategory>/<id>` (no locale prefix: use the `Link` / `useRouter` from `@/src/i18n/navigation`). */
export function buildProductPath(id: string, categorySlug?: string | null, subcategorySlug?: string | null): string | null {
  return categorySlug && subcategorySlug ? `/shop/${categorySlug}/${subcategorySlug}/${id}` : null;
}

/** Product URL from a full product or a `ProductSummary`; `null` when it has no slugs (hide the link or look it up). */
export function productPath(product: {
  id: string;
  category?: { slug: string } | null;
  subcategory?: { slug: string } | null;
}): string | null {
  return buildProductPath(product.id, product.category?.slug, product.subcategory?.slug);
}
