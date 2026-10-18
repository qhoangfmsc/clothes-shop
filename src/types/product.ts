/* ── Product Types — Matches BE schema exactly ── */

import type { ProductBadge, ProductStatus } from "@/src/types/enums";

export interface ProductColor {
  name: string;
  hex: string;
}

/** Category relation returned from BE (leftJoinAndSelect) */
export interface ProductCategory {
  id: string;
  slug: string;
  title: string;
  description: string;
}

/** SubCategory relation returned from BE (leftJoinAndSelect) */
export interface ProductSubCategory {
  id: number;
  slug: string;
  label: string;
  description: string;
  count: number;
}

export interface Product {
  id: string;
  slug: string;
  sku: string;
  name: string;
  /** Whole dong; `priceUsd` is the BE's conversion at the current rate */
  priceVnd: number;
  priceUsd: number;
  /** Struck-through price: both `null` when the product has none */
  originalPriceVnd: number | null;
  originalPriceUsd: number | null;
  images: string[];
  /** BE returns relation object (joined), NOT a plain string */
  category: ProductCategory | null;
  /** BE returns relation object (joined), NOT a plain string */
  subcategory: ProductSubCategory | null;
  badge: ProductBadge | null;
  status: ProductStatus;
  description: string;
  material: string;
  care: string;
  sizes: string[];
  colors: ProductColor[];
  tags: string[];
  /** Average of the published reviews (1.0–5.0, one decimal); `null` while there is none. Read-only: the BE refuses it on write. */
  ratingAverage: number | null;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}
