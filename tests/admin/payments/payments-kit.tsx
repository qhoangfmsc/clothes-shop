import { http, HttpResponse } from "msw";
import PaymentsContent from "@/src/app/[locale]/(admin)/admin/payments/PaymentsContent";
import { PendingCountsProvider } from "@/src/app/[locale]/_components/PendingCountsProvider";
import type {
  AdminQrSession,
  OrderPaymentOverview,
  PaymentAttempt,
  PaymentAttemptRow,
  PaymentTransaction,
  UnpaidOrderOption,
} from "@/src/app/[locale]/(admin)/admin/payments/_common/types";
import type { AuthUser } from "@/src/contexts/auth-context";
import { API } from "@/tests/_support/api";
import { countsApi, type CountsAnswer } from "@/tests/_support/admin";
import type { IdentityName } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* Sample payments, the fake admin payments API and the render function shared by the admin payments tests. */

const STAMP = "2026-03-05T05:00:00.000Z";

export function attempt(over: Partial<PaymentAttempt> = {}): PaymentAttempt {
  return {
    id: "at-1",
    orderId: "o-1",
    transferCode: "DHG29JR5A8",
    amountVnd: 380_000,
    amountUsd: 14.61,
    bankAccount: "123",
    status: "PENDING",
    expiresAt: "2099-01-01T00:00:00.000Z",
    paidAt: null,
    createdAt: STAMP,
    createdBy: null,
    ...over,
  };
}

export function transaction(over: Partial<PaymentTransaction> = {}): PaymentTransaction {
  return {
    id: "tx-1",
    paymentAttemptId: null,
    providerTransactionId: "SP-1001",
    provider: "sepay",
    amountVnd: 380_000,
    amountUsd: 14.61,
    transferContent: "DHG29JR5A8 thanh toan",
    verificationStatus: "UNMATCHED",
    receivedAt: STAMP,
    confirmedBy: null,
    confirmedAt: null,
    confirmNote: null,
    paymentAttempt: null,
    ...over,
  };
}

export function attemptRow(over: Partial<PaymentAttemptRow> = {}): PaymentAttemptRow {
  return {
    id: "at-1",
    transferCode: "DHG29JR5A8",
    amountVnd: 380_000,
    amountUsd: 14.61,
    status: "PENDING",
    createdAt: STAMP,
    expiresAt: "2099-01-01T00:00:00.000Z",
    paidAt: null,
    createdBy: null,
    order: { id: "o-1", status: "pending", paymentStatus: "unpaid", totalVnd: 380_000, totalUsd: 14.61, userId: "u-1", customer: { fullName: "Mai Tran", phone: "0901234567" } },
    transactions: [],
    ...over,
  };
}

export function overview(over: Partial<OrderPaymentOverview["order"]> = {}, rest: Partial<Omit<OrderPaymentOverview, "order">> = {}): OrderPaymentOverview {
  return {
    order: {
      id: "o-1",
      userId: "u-1",
      status: "pending",
      paymentStatus: "unpaid",
      paidAt: null,
      subtotalVnd: 350_000,
      subtotalUsd: 13.46,
      shippingFeeVnd: 30_000,
      shippingFeeUsd: 1.15,
      totalVnd: 380_000,
      totalUsd: 14.61,
      shippingMethod: "standard",
      customer: { fullName: "Mai Tran", phone: "0901234567" },
      createdAt: STAMP,
      ...over,
    },
    attempts: [],
    transactions: [],
    ...rest,
  };
}

export function qrSession(over: Partial<AdminQrSession> = {}): AdminQrSession {
  return {
    orderId: "o-1",
    paymentId: "pay-9",
    qrUrl: "https://img.vietqr.io/image/qr.png",
    amountVnd: 380_000,
    amountUsd: 14.61,
    bankName: "ACB",
    accountNumber: "123456789",
    accountName: "DOOVAN",
    transferContent: "DHGNEWCODE",
    status: "PENDING",
    expiresAt: "2099-01-01T00:00:00.000Z",
    supersededTransferCodes: [],
    ...over,
  };
}

export function unpaidOrder(over: Partial<UnpaidOrderOption> = {}): UnpaidOrderOption {
  return { id: "o-1", status: "pending", totalVnd: 380_000, totalUsd: 14.61, createdAt: STAMP, shippingAddress: { fullName: "Mai Tran" }, ...over };
}

export interface PaymentsApiOptions {
  transactions?: { data: PaymentTransaction[]; total: number }[];
  attempts?: { data: PaymentAttemptRow[]; total: number }[];
  /** Fail the transactions list (500) */
  failTransactions?: boolean;
  failAttempts?: boolean;
  /** `GET /api/admin/payments/orders/:id` answers this, or a status to fail with; a function gives a new answer on each request */
  overview?: OrderPaymentOverview | number | ((n: number) => OrderPaymentOverview | number);
  /** `POST …/confirm`: the answers in turn (the last one repeats): `ok`, or a status and body to refuse with */
  confirm?: ("ok" | { status: number; body: Record<string, unknown> })[];
  /** `POST …/qr` answers this, or a status and body to refuse with */
  qr?: AdminQrSession | { status: number; body: Record<string, unknown> };
  /** Unpaid orders offered by the picker (`GET /api/admin/orders`) */
  orders?: UnpaidOrderOption[] | "fail";
  deny?: 401 | 403;
}

export interface PaymentsCalls {
  transactions: URLSearchParams[];
  attempts: URLSearchParams[];
  overviews: string[];
  confirms: { orderId: string; body: Record<string, unknown> }[];
  qrs: string[];
  orders: URLSearchParams[];
}

export function paymentsApi(options: PaymentsApiOptions = {}): PaymentsCalls {
  const calls: PaymentsCalls = { transactions: [], attempts: [], overviews: [], confirms: [], qrs: [], orders: [] };
  const denied = () => (options.deny ? HttpResponse.json({ message: "denied" }, { status: options.deny }) : null);
  const page = (url: URL) => Number(url.searchParams.get("page") ?? 1);
  server.use(
    http.get(`${API}/api/admin/payments/transactions`, ({ request }) => {
      const url = new URL(request.url);
      calls.transactions.push(url.searchParams);
      const refusal = denied();
      if (refusal) return refusal;
      if (options.failTransactions) return HttpResponse.json({ message: "boom" }, { status: 500 });
      const answer = options.transactions?.[page(url) - 1] ?? { data: [], total: 0 };
      return HttpResponse.json({ ...answer, page: page(url), limit: 25 });
    }),
    http.get(`${API}/api/admin/payments/attempts`, ({ request }) => {
      const url = new URL(request.url);
      calls.attempts.push(url.searchParams);
      const refusal = denied();
      if (refusal) return refusal;
      if (options.failAttempts) return HttpResponse.json({ message: "boom" }, { status: 500 });
      const answer = options.attempts?.[page(url) - 1] ?? { data: [], total: 0 };
      return HttpResponse.json({ ...answer, page: page(url), limit: 25 });
    }),
    http.get(`${API}/api/admin/payments/orders/:id`, ({ params }) => {
      calls.overviews.push(String(params.id));
      const answer = typeof options.overview === "function" ? options.overview(calls.overviews.length) : options.overview;
      if (typeof answer === "number") return HttpResponse.json({ message: "no" }, { status: answer });
      return HttpResponse.json({ data: answer ?? overview({ id: String(params.id) }) });
    }),
    http.post(`${API}/api/admin/payments/orders/:id/confirm`, async ({ params, request }) => {
      calls.confirms.push({ orderId: String(params.id), body: (await request.json()) as Record<string, unknown> });
      const answers = options.confirm ?? ["ok"];
      const answer = answers[Math.min(calls.confirms.length, answers.length) - 1];
      if (answer !== "ok") return HttpResponse.json(answer.body, { status: answer.status });
      return HttpResponse.json({ data: { orderId: params.id, paymentStatus: "paid", paidAt: STAMP } });
    }),
    http.post(`${API}/api/admin/payments/orders/:id/qr`, ({ params }) => {
      calls.qrs.push(String(params.id));
      const answer = options.qr ?? qrSession({ orderId: String(params.id) });
      if ("status" in answer && "body" in answer) return HttpResponse.json(answer.body, { status: answer.status });
      return HttpResponse.json({ data: answer });
    }),
    http.get(`${API}/api/admin/orders`, ({ request }) => {
      calls.orders.push(new URL(request.url).searchParams);
      if (options.orders === "fail") return HttpResponse.json({ message: "no orders" }, { status: 500 });
      return HttpResponse.json({ data: options.orders ?? [unpaidOrder()] });
    })
  );
  return calls;
}

export interface RenderPaymentsOptions extends PaymentsApiOptions {
  as?: IdentityName | AuthUser;
  locale?: "vi" | "en";
  query?: Record<string, string>;
  counts?: CountsAnswer;
}

export async function renderPayments(options: RenderPaymentsOptions = {}) {
  const { as = "adminFull", locale, query = {}, counts, ...api } = options;
  navigation.pathname = "/admin/payments";
  navigation.searchParams = new URLSearchParams(query);
  const calls = paymentsApi(api);
  if (counts) countsApi(counts);
  const view = await renderApp(counts ? <PendingCountsProvider><PaymentsContent /></PendingCountsProvider> : <PaymentsContent />, { as, locale });
  return { calls, ...view };
}
