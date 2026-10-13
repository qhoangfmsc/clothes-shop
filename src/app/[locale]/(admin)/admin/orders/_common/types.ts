/* ═══════════════════════════════════════════════════════════
   ORDERS MODULE TYPES
   ═══════════════════════════════════════════════════════════ */

import type { AdminOrder } from "@/src/hooks/use-admin-api";
import type { OrderPaymentStatus, OrderStatus } from "@/src/types/enums";

import type { ListParams } from "@/src/lib/list-query";
export interface OrderListParams extends ListParams {
  status?: OrderStatus;
  paymentStatus?: OrderPaymentStatus;
}

export interface OrderListResult {
  data: AdminOrder[];
  total: number;
  page: number;
  limit: number;
}
