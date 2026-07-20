/* ═══════════════════════════════════════════════════════════
   PRODUCTS MODULE TYPES — Form data, list params, filters

   Co-located with the module — NOT in src/types/.
   src/types/product.ts only has the Product entity.
   ═══════════════════════════════════════════════════════════ */

import type { Product } from "@/src/types/product";

export interface ProductListParams {
  search?: string;
  category?: string;
  badge?: string;
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
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
