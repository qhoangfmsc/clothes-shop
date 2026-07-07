/* ── API Response Types ── */

import type { Product } from "./product";
import type { Category, CategoryUIConfig } from "./category";
import type { Collection } from "./collection";
import type { Review } from "./review";

export interface ApiListResponse<T> {
  data: T[];
  total: number;
}

export interface ApiDetailResponse<T> {
  data: T;
}

export interface ApiProductDetailResponse {
  data: Product;
  related: Product[];
}

export interface ApiCollectionDetailResponse {
  data: Collection;
  products: Product[];
}

export interface ApiReviewsResponse {
  data: Review[];
  average: number;
  total: number;
}

export interface ApiCategoryDetailResponse {
  data: Category;
  uiConfig: CategoryUIConfig | null;
}
