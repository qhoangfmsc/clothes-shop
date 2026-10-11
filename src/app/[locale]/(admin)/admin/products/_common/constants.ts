/* ═══════════════════════════════════════════════════════════
   PRODUCTS MODULE CONSTANTS
   Co-located with the module — NOT in src/constants/.
   ═══════════════════════════════════════════════════════════ */

import type { ProductColor } from "@/src/types/product";

/* ── Sort Options ── */

/** `key` is a label in messages: admin.products.table.sort.<key> */
export const SORT_OPTIONS = [
  { value: "createdAt", key: "newest" },
  { value: "-createdAt", key: "oldest" },
  { value: "price", key: "priceDown" },
  { value: "-price", key: "priceUp" },
  { value: "name", key: "nameAsc" },
  { value: "-name", key: "nameDesc" },
] as const;

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

/* ── Empty Form State ── */

export const EMPTY_FORM = {
  name: "",
  slug: "",
  price: 0,
  originalPrice: null as number | null,
  images: [] as string[],
  categoryId: "",
  subcategoryId: "",
  badge: null as string | null,
  status: "active",
  description: "",
  material: "",
  care: "",
  sizes: [] as string[],
  colors: [] as ProductColor[],
  tags: [] as string[],
};
