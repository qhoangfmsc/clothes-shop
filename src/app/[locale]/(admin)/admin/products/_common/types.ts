import type { Product } from "@/src/types/product";
import type { ProductBadge, ProductStatus } from "@/src/types/enums";

import type { ListParams } from "@/src/lib/list-query";
export interface ProductListParams extends ListParams {
  category?: string;
  badge?: ProductBadge;
  status?: ProductStatus;
  /** 1–5: only products whose average rating is at least this */
  minRating?: number;
}

export interface ProductFormData {
  name: string;
  slug: string;
  /** Whole VND as typed (dot-grouped); parsed with `parseVndInput` on save */
  priceVnd: string;
  /** Empty = no struck-through price */
  originalPriceVnd: string;
  images: string[];
  categoryId: string;
  subcategoryId: string | null;
  badge: ProductBadge | null;
  status: ProductStatus;
  description: string;
  material: string;
  care: string;
  sizes: string[];
  colors: { name: string; hex: string }[];
  tags: string[];
}

/** Return type of fetchProductList — matches DataTableFetchResult */
export interface ProductListResult {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}
