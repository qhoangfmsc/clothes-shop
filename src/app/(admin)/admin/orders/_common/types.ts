/* ═══════════════════════════════════════════════════════════
   ORDERS MODULE TYPES
   ═══════════════════════════════════════════════════════════ */

import type { AdminOrder } from "@/src/hooks/use-admin-api";

export interface OrderListParams {
  status?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface OrderListResult {
  data: AdminOrder[];
  total: number;
  page: number;
  limit: number;
}
