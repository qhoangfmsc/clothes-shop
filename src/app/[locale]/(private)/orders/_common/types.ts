export interface OrderItem {
  id: string;
  productId: string | null;
  productName: string;
  productImage: string;
  quantity: number;
  /** Unit price at order time (the BE sends no line total) */
  priceVnd: number;
  priceUsd: number;
  size: string;
  color: string;
  createdAt: string;
}

/** One transfer content (QR payment session) issued for an order, newest first */
export interface OrderPaymentAttempt {
  transferCode: string;
  /** What the code asks for: VND is the figure to transfer */
  amountVnd: number;
  amountUsd: number;
  /** Real state: a code past its expiry is `EXPIRED` */
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  /** Bank transaction reference, once the money was matched to this code */
  transactionRef: string | null;
}

/** Money the shop owes back after a paid order was cancelled. No admin note or name is ever sent to the shopper. */
export interface OrderRefund {
  amountVnd: number;
  amountUsd: number;
  /** `REQUESTED` = recorded, the shop has yet to transfer; `REJECTED` = the shop will not refund */
  status: "REQUESTED" | "COMPLETED" | "REJECTED";
  reason: string;
  createdAt: string;
  processedAt: string | null;
  /** Bank reference of the refund transfer, once `COMPLETED` */
  bankReference: string | null;
  /** The return request this refund came from (`reason = RETURN`), else `null` */
  returnId: string | null;
}

export interface Order {
  id: string;
  status: string;
  /** Delivery `status` is separate: this says whether the money arrived */
  paymentStatus: "unpaid" | "paid" | "refunded";
  paidAt: string | null;
  /** When the order reached the customer; starts the return window. `null` before delivery. */
  deliveredAt?: string | null;
  paymentAttempts?: OrderPaymentAttempt[];
  /** Newest first, `[]` when none */
  refunds?: OrderRefund[];
  subtotalVnd: number;
  subtotalUsd: number;
  shippingFeeVnd: number;
  shippingFeeUsd: number;
  totalVnd: number;
  totalUsd: number;
  shippingMethod: string;
  shippingAddress: Record<string, string>;
  note: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}
