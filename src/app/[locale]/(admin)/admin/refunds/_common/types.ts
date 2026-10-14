/* ═══════════════════════════════════════════════════════════
   REFUNDS MODULE TYPES — money owed back to customers (admin)
   ═══════════════════════════════════════════════════════════ */

import type { ListParams } from "@/src/lib/list-query";
import type { OrderPaymentStatus } from "@/src/types/enums";

export const REFUND_STATUSES = ["REQUESTED", "COMPLETED", "REJECTED"] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

/** Why the refund exists (BE `REFUND_REASONS`) */
export const REFUND_REASONS = ["ADMIN_CANCELLED", "RETURN"] as const;
export type RefundReason = (typeof REFUND_REASONS)[number];

/** One refund request. The system never moves money: an admin transfers it by bank app, then marks it done. */
export interface Refund {
  id: string;
  orderId: string;
  status: RefundStatus;
  reason: RefundReason;
  /** The return request this refund came from (`reason = RETURN`) */
  returnRequestId: string | null;
  /** VND to transfer back */
  amount: number;
  createdAt: string;
  processedAt: string | null;
  /** Bank reference of the transfer the admin made (set when `COMPLETED`) */
  bankReference: string | null;
  /** Admin note: the completion note, or the reason for rejecting. Never shown to the customer. */
  note: string | null;
  order: {
    id: string;
    status: string;
    paymentStatus: OrderPaymentStatus;
    total: number;
    userId: string | null;
    /** Each field can be `null` (no recipient snapshot) */
    customer: { fullName: string | null; phone: string | null } | null;
  };
  /** The money that was received: tells the admin where to send it back */
  payment: {
    transferCode: string;
    /** VND the customer paid */
    paidAmount: number;
    paidAt: string | null;
    provider: string | null;
    transactionRef: string | null;
    transferContent: string | null;
  };
}

export interface RefundListParams extends ListParams {
  status?: RefundStatus;
  orderId?: string;
}

export interface RefundListResult {
  data: Refund[];
  total: number;
  page: number;
  limit: number;
}

/** Body of `POST /api/admin/refunds/:refundId/complete` */
export interface CompleteRefundInput {
  refundId: string;
  /** Bank transaction reference of the refund transfer (≤ 64, unique across refunds) */
  reference: string;
  note: string;
}

/** Body of `POST /api/admin/refunds/:refundId/reject` */
export interface RejectRefundInput {
  refundId: string;
  note: string;
}
