export interface OrderItem {
  id: string;
  productId: string | null;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
  size: string;
  color: string;
  createdAt: string;
}

/** One transfer content (QR payment session) issued for an order, newest first */
export interface OrderPaymentAttempt {
  transferCode: string;
  /** VND the code asks for */
  amount: number;
  /** Real state: a code past its expiry is `EXPIRED` */
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  /** Bank transaction reference, once the money was matched to this code */
  transactionRef: string | null;
}

export interface Order {
  id: string;
  status: string;
  /** Delivery `status` is separate: this says whether the money arrived */
  paymentStatus: "unpaid" | "paid";
  paidAt: string | null;
  paymentAttempts?: OrderPaymentAttempt[];
  subtotal: number;
  shippingFee: number;
  total: number;
  shippingMethod: string;
  shippingAddress: Record<string, string>;
  note: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}
