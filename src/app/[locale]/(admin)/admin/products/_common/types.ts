/* ═══════════════════════════════════════════════════════════
   PRODUCTS MODULE TYPES — Form data, list params, filters

   Co-located with the module — NOT in src/types/.
   src/types/product.ts only has the Product entity.
   ═══════════════════════════════════════════════════════════ */

import type { Product } from "@/src/types/product";

import type { ListParams } from "@/src/lib/list-query";
export interface ProductListParams extends ListParams {
  category?: string;
  badge?: string;
  status?: string;
}

export interface ProductFormData {
  name: string;
  slug: string;
  price: number;
  originalPrice: number | null;
  images: string[];
  categoryId: string;
  subcategoryId: string | null;
  badge: string | null;
  status: string;
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
