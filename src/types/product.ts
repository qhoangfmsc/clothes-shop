/* ── Product Types — Matches BE schema exactly ── */

import type { ProductBadge, ProductStatus } from "@/src/types/enums";

export interface ProductColor {
  name: string;
  hex: string;
}

/** `category` of a full product (no `subcategories`: the BE drops them; read those from `GET /api/categories`) */
export interface ProductCategory {
  id: string;
  slug: string;
  title: string;
  description: string;
  heroImage: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

/** `subcategory` of a full product (no `category`: the BE drops it, use `Product.category`) */
export interface ProductSubCategory {
  id: string;
  slug: string;
  label: string;
  description: string;
  count: number;
  createdAt: string;
  updatedAt: string;
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
  /** Relation object, NOT a plain string */
  category: ProductCategory | null;
  /** Relation object, NOT a plain string */
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

/** The short product the BE nests in autocomplete results and reviews (`ProductSummary`): enough to identify it and build its link.
 *  `image`, `badge`, `category` and `subcategory` can be `null`; the other keys are always present. */
export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  badge: ProductBadge | null;
  category: { id: string; slug: string; title: string } | null;
  subcategory: { id: string; slug: string; label: string } | null;
}
