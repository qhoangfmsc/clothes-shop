/* ═══════════════════════════════════════════════════════════
   CUSTOMER RETURNS TYPES — mirror the BE `/api/returns` shapes
   ═══════════════════════════════════════════════════════════ */

export const RETURN_STATUSES = ["REQUESTED", "APPROVED", "RECEIVED", "REFUNDED", "REJECTED", "CANCELLED"] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

/** The happy path, in order; `REJECTED` and `CANCELLED` are side branches that leave it */
export const RETURN_PROGRESS_STEPS = ["REQUESTED", "APPROVED", "RECEIVED", "REFUNDED"] as const;

/** The customer can still withdraw the request until the parcel reaches the shop */
export const CUSTOMER_CANCELLABLE_STATUSES: readonly ReturnStatus[] = ["REQUESTED", "APPROVED"];

export const RETURN_REASONS = ["WRONG_SIZE", "CHANGED_MIND", "DEFECTIVE", "WRONG_ITEM", "OTHER"] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];

export const RETURN_INELIGIBLE_REASONS = [
  "ORDER_NOT_PAID",
  "ORDER_NOT_DELIVERED",
  "RETURN_WINDOW_EXPIRED",
  "NOTHING_TO_RETURN",
] as const;
export type ReturnIneligibleReason = (typeof RETURN_INELIGIBLE_REASONS)[number];

/** `GET /api/returns/eligibility/:orderId` (inside `data`) */
export interface ReturnEligibility {
  orderId: string;
  eligible: boolean;
  /** `null` when `eligible` */
  reason: ReturnIneligibleReason | null;
  /** Last moment a request can be sent (delivery + the policy's days); `null` while undelivered */
  deadline: string | null;
  returnWindowDays: number;
  items: { orderItemId: string; quantity: number; returnableQuantity: number }[];
}

export interface ReturnItem {
  id: string;
  orderItemId: string;
  productName: string | null;
  productImage: string | null;
  size: string | null;
  color: string | null;
  price: number | null;
  /** What the customer asked to send back */
  quantity: number;
  /** What the shop accepted after checking the parcel; `null` before `RECEIVED` */
  acceptedQuantity: number | null;
}

/** The refund a return produced (VND). The admin who handled it is never exposed. */
export interface ReturnRefund {
  amount: number;
  status: "REQUESTED" | "COMPLETED" | "REJECTED";
  bankReference: string | null;
  processedAt: string | null;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  status: ReturnStatus;
  reason: ReturnReason;
  /** The customer's own note */
  note: string | null;
  /** The shop's reply: shipping instructions when `APPROVED`, the reason when `REJECTED` */
  adminNote: string | null;
  createdAt: string;
  approvedAt: string | null;
  receivedAt: string | null;
  items: ReturnItem[];
  refund: ReturnRefund | null;
}

/** Body of `POST /api/returns` */
export interface CreateReturnBody {
  orderId: string;
  reason: ReturnReason;
  note?: string;
  items: { orderItemId: string; quantity: number }[];
}
