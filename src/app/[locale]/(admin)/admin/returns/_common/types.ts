/* ═══════════════════════════════════════════════════════════
   RETURNS MODULE TYPES — customer return requests (admin)
   ═══════════════════════════════════════════════════════════ */

import type { ListParams } from "@/src/lib/list-query";
import type { OrderPaymentStatus } from "@/src/types/enums";
import type { RefundStatus } from "../../refunds/_common/types";

export const RETURN_STATUSES = ["REQUESTED", "APPROVED", "RECEIVED", "REFUNDED", "REJECTED", "CANCELLED"] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const RETURN_REASONS = ["WRONG_SIZE", "CHANGED_MIND", "DEFECTIVE", "WRONG_ITEM", "OTHER"] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];

/** Statuses the admin can still reject from (the parcel has not arrived) */
export const REJECTABLE_STATUSES: readonly ReturnStatus[] = ["REQUESTED", "APPROVED"];

export interface ReturnItem {
  id: string;
  orderItemId: string;
  productName: string | null;
  productImage: string | null;
  size: string | null;
  color: string | null;
  /** Shop units */
  price: number | null;
  /** What the customer asked to return */
  quantity: number;
  /** What the shop accepted after checking the parcel; `null` before `RECEIVED` */
  acceptedQuantity: number | null;
}

export interface ReturnRefund {
  /** Opens the refund in the Refunds screen */
  id: string;
  /** VND */
  amount: number;
  status: RefundStatus;
  bankReference: string | null;
  processedAt: string | null;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  status: ReturnStatus;
  reason: ReturnReason;
  /** The customer's note */
  note: string | null;
  /** The shop's reply, shown to the customer: shipping instructions (approved) or the reason (rejected) */
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  receivedAt: string | null;
  /** The order's shipping fee was refunded with this return (once per order) */
  shippingRefunded: boolean;
  items: ReturnItem[];
  /** Newest refund of this return, `null` before the parcel was received */
  refund: ReturnRefund | null;
  order: {
    id: string;
    status: string;
    paymentStatus: OrderPaymentStatus;
    total: number;
    shippingFee: number;
    deliveredAt: string | null;
    userId: string | null;
    /** Each field can be `null` */
    customer: { fullName: string | null; phone: string | null };
  } | null;
}

export interface ReturnListParams extends ListParams {
  status?: ReturnStatus;
  orderId?: string;
}

export interface ReturnListResult {
  data: ReturnRequest[];
  total: number;
  page: number;
  limit: number;
}

/** Body of `POST /api/admin/returns/:returnId/receive` */
export interface ReceiveReturnInput {
  returnId: string;
  /** Quantity accepted per return line (0 up to what the customer asked); an omitted line counts as fully accepted */
  items: { returnItemId: string; acceptedQuantity: number }[];
  refundShipping?: boolean;
  note?: string;
}
