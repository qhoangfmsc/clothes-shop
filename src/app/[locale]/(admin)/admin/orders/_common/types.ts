/* ═══════════════════════════════════════════════════════════
   ORDERS MODULE TYPES
   ═══════════════════════════════════════════════════════════ */

import type { AdminOrder } from "@/src/hooks/use-admin-api";

import type { ListParams } from "@/src/lib/list-query";
export interface OrderListParams extends ListParams {
  status?: string;
}

export interface OrderListResult {
  data: AdminOrder[];
  total: number;
  page: number;
  limit: number;
}
