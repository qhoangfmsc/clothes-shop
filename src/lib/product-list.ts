import type { Product } from "@/src/types/product";
import type { ProductBadge } from "@/src/types/enums";
import { buildListQuery } from "./list-query";

export interface ProductListParams {
  search?: string;
  category?: string;
  subcategory?: string;
  badge?: ProductBadge;
  /** `field` = ascending, `-field` = descending (BE whitelist). */
  sort?:
    | "price"
    | "-price"
    | "name"
    | "-name"
    | "createdAt"
    | "-createdAt"
    | "ratingAverage"
    | "-ratingAverage"
    | "-ratingCount";
  /** 1–5: only products whose average is at least this (products without a review are left out) */
  minRating?: number;
  /** Whole VND: the BE filters and sorts prices in VND only */
  minPrice?: number;
  maxPrice?: number;
  sizes?: string;   // "S,M,L"
  colors?: string;  // "Red,Blue"
  page?: number;
  limit?: number;
}

export interface ProductListResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

/** Query string for `GET /api/products`, shared by the server fetchers and the SWR hooks. */
export function buildProductQS(params: ProductListParams): string {
  return buildListQuery(params, {
    category: params.category,
    subcategory: params.subcategory,
    badge: params.badge,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    minRating: params.minRating,
    sizes: params.sizes,
    colors: params.colors,
  });
}
