/* ═══════════════════════════════════════════════════════════
   COLLECTIONS MODULE TYPES
   ═══════════════════════════════════════════════════════════ */

import type { Collection } from "@/src/types/collection";

import type { ListParams } from "@/src/lib/list-query";
export interface CollectionListParams extends ListParams {
  season?: string;
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
