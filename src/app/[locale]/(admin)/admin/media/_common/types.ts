/* ═══════════════════════════════════════════════════════════
   MEDIA MODULE TYPES
   Co-located with the module — NOT in src/types/.
   ═══════════════════════════════════════════════════════════ */

import type { ListParams } from "@/src/lib/list-query";
export interface MediaFile {
  id: string;
  name: string;
  mimeType: string;
  sizeOriginal: number;
  createdAt: string;
  url: string;
}

export type MediaListParams = ListParams;

export interface MediaListResult {
  data: MediaFile[];
  total: number;
  page: number;
  limit: number;
}

/** What a rejected media thunk carries (plain object — Redux can't hold Error instances). */
export interface MediaError {
  message: string;
  errorCode?: number;
}
