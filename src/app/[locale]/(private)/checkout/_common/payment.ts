/* VietQR payment contract with the BE (`/api/payments/*`). The BE decides amount, transfer content and status;
   the FE only displays them and asks again. */

export type PaymentStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";

export type PaymentMethod = "vietqr" | "later";

export interface PaymentSession {
  orderId: string;
  paymentId: string;
  qrUrl: string;
  /** Amount to transfer, in VND */
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  transferContent: string;
  status: PaymentStatus;
  expiresAt: string | null;
}

export interface PaymentStatusResult {
  orderId: string;
  status: PaymentStatus;
}

/** How often the payment page asks the BE whether the transfer arrived */
export const PAYMENT_POLL_INTERVAL_MS = 3000;

const STATUSES: readonly PaymentStatus[] = ["PENDING", "PAID", "EXPIRED", "CANCELLED"];

/** Unknown values count as `PENDING`: only an explicit `PAID` from the BE ever shows a success. */
export function normalizePaymentStatus(raw: unknown): PaymentStatus {
  const value = typeof raw === "string" ? raw.toUpperCase() : "";
  return STATUSES.find((status) => status === value) ?? "PENDING";
}

/** The QR is rendered in an `<img>`: only accept an https URL or an inline image */
export function isSafeQrUrl(url: string): boolean {
  return /^https:\/\//i.test(url) || /^data:image\/(png|jpe?g|svg\+xml|webp);/i.test(url);
}
