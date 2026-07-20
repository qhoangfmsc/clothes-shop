/* ═══════════════════════════════════════════════════════════
   PRODUCTS MODULE CONSTANTS
   Co-located with the module — NOT in src/constants/.
   ═══════════════════════════════════════════════════════════ */

import type { ProductColor } from "@/src/types/product";

/* ── Sort Options ── */

export const SORT_OPTIONS = [
  { value: "createdAt", label: "Newest" },
  { value: "-createdAt", label: "Oldest" },
  { value: "price", label: "Price ↓" },
  { value: "-price", label: "Price ↑" },
  { value: "name", label: "Name A-Z" },
  { value: "-name", label: "Name Z-A" },
] as const;

/* ── Size Groups ── */

export const SIZE_GROUPS: { label: string; sizes: string[] }[] = [
  { label: "Letter", sizes: ["XS", "S", "M", "L", "XL", "XXL"] },
  { label: "Number", sizes: ["28", "29", "30", "31", "32", "33", "34", "36", "38", "40", "42"] },
  { label: "Special", sizes: ["One Size"] },
];

/* ── Tag Suggestions ── */

export const TAG_SUGGESTIONS = ["summer", "winter", "casual", "formal", "luxury", "streetwear"] as const;

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
