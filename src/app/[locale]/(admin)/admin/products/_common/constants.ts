/* ═══════════════════════════════════════════════════════════
   PRODUCTS MODULE CONSTANTS
   Co-located with the module — NOT in src/constants/.
   ═══════════════════════════════════════════════════════════ */

import type { ProductColor } from "@/src/types/product";
import type { ProductBadge, ProductStatus } from "@/src/types/enums";

/* ── Sort Options ── */

/** `sort=field` ascending, `-field` descending. `key` = label in admin.components.crud.sort.* */
export const PRODUCT_SORT_OPTIONS = [
  { value: "-createdAt", key: "newest" },
  { value: "createdAt", key: "oldest" },
  { value: "-price", key: "priceDesc" },
  { value: "price", key: "priceAsc" },
  { value: "name", key: "nameAsc" },
  { value: "-name", key: "nameDesc" },
  { value: "-ratingAverage", key: "ratingDesc" },
  { value: "ratingAverage", key: "ratingAsc" },
  { value: "-ratingCount", key: "reviewsDesc" },
] as const;

/** "N stars and up" choices of the rating filter (`minRating`, 1–5; products without a review are excluded) */
export const PRODUCT_MIN_RATINGS = [5, 4, 3, 2, 1] as const;

/* ── Size Groups ── */

/** `key` is a label in messages: admin.products.form.sizes.groups.<key>.
 *  The sizes themselves ("One Size" included) are stored values, so they are not translated. */
export const SIZE_GROUPS: { key: "letter" | "number" | "special"; sizes: string[] }[] = [
  { key: "letter", sizes: ["XS", "S", "M", "L", "XL", "XXL"] },
  { key: "number", sizes: ["28", "29", "30", "31", "32", "33", "34", "36", "38", "40", "42"] },
  { key: "special", sizes: ["One Size"] },
];

/* ── Tag Suggestions ── */

export const TAG_SUGGESTIONS = [
  "summer",
  "winter",
  "casual",
  "formal",
  "luxury",
  "streetwear",
] as const;

/* ── Price limits (whole VND, enforced by the BE with a 400) ── */

export const MIN_PRICE_VND = 1;
export const MAX_PRICE_VND = 1_000_000_000;

/* ── Empty Form State ── */

export const EMPTY_FORM = {
  name: "",
  slug: "",
  priceVnd: "",
  originalPriceVnd: "",
  images: [] as string[],
  categoryId: "",
  subcategoryId: "",
  badge: null as ProductBadge | null,
  status: "active" as ProductStatus,
  description: "",
  material: "",
  care: "",
  sizes: [] as string[],
  colors: [] as ProductColor[],
  tags: [] as string[],
};
