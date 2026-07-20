/* ═══════════════════════════════════════════════════════════
   CATEGORIES MODULE TYPES
   Co-located with the module — NOT in src/types/.
   ═══════════════════════════════════════════════════════════ */

import type { Category } from "@/src/types/category";

export interface CategoryListParams {
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface CategoryFormData {
  slug: string;
  title: string;
  description: string;
  subcategories: {
    id?: number;
    slug: string;
    label: string;
    description: string;
    count?: number;
  }[];
}

export interface CategoryListResult {
  data: Category[];
  total: number;
  page: number;
  limit: number;
}
