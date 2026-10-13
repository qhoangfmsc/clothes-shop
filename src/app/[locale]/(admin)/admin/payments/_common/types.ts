/* ═══════════════════════════════════════════════════════════
   PAYMENTS MODULE TYPES — bank-transfer reconciliation (admin)
   ═══════════════════════════════════════════════════════════ */

import type { ListParams } from "@/src/lib/list-query";
import type { OrderPaymentStatus } from "@/src/types/enums";

export const PAYMENT_VERIFICATION_STATUSES = [
  "MATCHED",
  "UNMATCHED",
  "ACCOUNT_MISMATCH",
  "AMOUNT_MISMATCH",
  "LATE",
  "NOT_PAYABLE",
  "DUPLICATE_PAYMENT",
  "IGNORED",
  "MANUALLY_CONFIRMED",
] as const;
export type PaymentVerificationStatus = (typeof PAYMENT_VERIFICATION_STATUSES)[number];

/** Money may already have arrived but the system did not confirm the order: an admin can attach these to an order */
export const CONFIRMABLE_VERIFICATION_STATUSES: readonly string[] = [
  "UNMATCHED",
  "AMOUNT_MISMATCH",
  "LATE",
  "NOT_PAYABLE",
];

export const PAYMENT_ATTEMPT_STATUSES = ["PENDING", "PAID", "EXPIRED", "CANCELLED"] as const;
export type PaymentAttemptStatus = (typeof PAYMENT_ATTEMPT_STATUSES)[number];

/** Who recorded a manually entered transaction (`provider` of `confirm`) */
export const MANUAL_CONFIRM_PROVIDERS = ["sepay", "manual"] as const;
export type ManualConfirmProvider = (typeof MANUAL_CONFIRM_PROVIDERS)[number];

export interface PaymentOrderSummary {
  id: string;
  status: string;
  paymentStatus: OrderPaymentStatus;
  total: number;
  userId: string | null;
}

/** One QR payment session of an order (amount in VND) */
export interface PaymentAttempt {
  id: string;
  orderId: string;
  transferCode: string;
  amount: number;
  bankAccount: string;
  status: PaymentAttemptStatus;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
  order?: PaymentOrderSummary;
}

/** One bank transaction reported by SePay (or entered by an admin); amount in VND */
export interface PaymentTransaction {
  id: string;
  paymentAttemptId: string | null;
  providerTransactionId: string;
  provider: string;
  amount: number;
  transferContent: string;
  verificationStatus: PaymentVerificationStatus;
  receivedAt: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  confirmNote: string | null;
  /** `null` when the transaction matched no session */
  paymentAttempt: PaymentAttempt | null;
}

/** `GET /api/admin/payments/orders/:orderId` */
export interface OrderPaymentOverview {
  order: {
    id: string;
    userId: string | null;
    status: string;
    paymentStatus: OrderPaymentStatus;
    paidAt: string | null;
    subtotal: number;
    shippingFee: number;
    total: number;
    shippingMethod: string;
    /** `null` when the order has no recipient snapshot; its fields can be `null` too (store pickup has no address) */
    customer: { fullName: string | null; phone: string | null } | null;
    createdAt: string;
  };
  attempts: PaymentAttempt[];
  transactions: PaymentTransaction[];
}

/** One row of the transfer-content lookup: a code issued for an order, with the bank transactions attached to it */
export interface PaymentAttemptRow {
  id: string;
  transferCode: string;
  amount: number;
  status: PaymentAttemptStatus;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  order: PaymentOrderSummary & {
    customer: { fullName: string | null; phone: string | null } | null;
  };
  transactions: Array<
    Pick<
      PaymentTransaction,
      "id" | "provider" | "providerTransactionId" | "amount" | "verificationStatus" | "transferContent" | "receivedAt"
    >
  >;
}

export interface AttemptListParams extends ListParams {
  status?: PaymentAttemptStatus;
  orderId?: string;
}

export interface AttemptListResult {
  data: PaymentAttemptRow[];
  total: number;
  page: number;
  limit: number;
}

export interface PaymentListParams extends ListParams {
  verificationStatus?: PaymentVerificationStatus;
  orderId?: string;
}

export interface PaymentListResult {
  data: PaymentTransaction[];
  total: number;
  page: number;
  limit: number;
}

/** Body of `POST /api/admin/payments/orders/:orderId/confirm`: exactly one of `transactionId` (attach a bank
 *  transaction) or `transferCode` + `amount` (record a transaction the webhook never delivered) */
export type ConfirmPaymentInput = {
  orderId: string;
  note: string;
  acceptAmountMismatch?: boolean;
} & (
  | { transactionId: string }
  | {
      transferCode: string;
      /** VND actually received */
      amount: number;
      /** SePay / bank statement reference, if known (defaults to the transfer code) */
      reference?: string;
      provider?: ManualConfirmProvider;
      /** Content as printed on the statement, if it differs from the code */
      transferContent?: string;
    }
);

/** An unpaid order offered when attaching a transaction */
export interface UnpaidOrderOption {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  shippingAddress: Record<string, unknown>;
}
