/* ═══════════════════════════════════════════════════════════
   COLLECTIONS MODULE TYPES
   ═══════════════════════════════════════════════════════════ */

import type { Collection } from "@/src/types/collection";

export interface CollectionListParams {
  search?: string;
  season?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface CollectionFormData {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  image: string;
  productIds: string[];
  season: string;
}

export interface CollectionListResult {
  data: Collection[];
  total: number;
  page: number;
  limit: number;
}
