import { http, HttpResponse } from "msw";
import RefundsContent from "@/src/app/[locale]/(admin)/admin/refunds/RefundsContent";
import type { Refund } from "@/src/app/[locale]/(admin)/admin/refunds/_common/types";
import { PendingCountsProvider } from "@/src/app/[locale]/_components/PendingCountsProvider";
import type { AuthUser } from "@/src/contexts/auth-context";
import { API } from "@/tests/_support/api";
import { countsApi, type CountsAnswer } from "@/tests/_support/admin";
import type { IdentityName } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* Sample refunds, the fake admin refunds API and the render function shared by the admin refunds tests. */

const STAMP = "2026-03-05T05:00:00.000Z";

export function refund(over: Partial<Refund> = {}): Refund {
  return {
    id: "rf-1",
    orderId: "o-1",
    status: "REQUESTED",
    reason: "ADMIN_CANCELLED",
    returnRequestId: null,
    amountVnd: 380_000,
    amountUsd: 14.61,
    createdAt: STAMP,
    processedAt: null,
    bankReference: null,
    note: null,
    order: { id: "o-1", status: "cancelled", paymentStatus: "paid", totalVnd: 380_000, totalUsd: 14.61, userId: "u-1", customer: { fullName: "Mai Tran", phone: "0901234567" } },
    payment: { transferCode: "DHG29JR5A8", paidAmountVnd: 380_000, paidAmountUsd: 14.61, paidAt: "2026-03-04T05:00:00.000Z", provider: "sepay", transactionRef: "SP-1001", transferContent: "DHG29JR5A8 thanh toan" },
    ...over,
  };
}

export interface RefundsApiOptions {
  pages?: { data: Refund[]; total: number }[];
  /** Total returned for the banner's question "is a refund still waiting for this order" */
  openCount?: number | "fail";
  failListFrom?: number;
  deny?: 401 | 403;
  /** Refuse complete/reject/create with this status and body */
  refuse?: { status: number; body: Record<string, unknown> };
}

export interface RefundsCalls {
  lists: URLSearchParams[];
  completes: { id: string; body: Record<string, unknown> }[];
  rejects: { id: string; body: Record<string, unknown> }[];
  creates: Record<string, unknown>[];
}

export function refundsApi(options: RefundsApiOptions = {}): RefundsCalls {
  const calls: RefundsCalls = { lists: [], completes: [], rejects: [], creates: [] };
  const refused = () => (options.refuse ? HttpResponse.json(options.refuse.body, { status: options.refuse.status }) : null);
  server.use(
    http.get(`${API}/api/admin/refunds`, ({ request }) => {
      const url = new URL(request.url);
      calls.lists.push(url.searchParams);
      if (options.deny) return HttpResponse.json({ message: "denied" }, { status: options.deny });
      if (url.searchParams.get("limit") === "1") {
        if (options.openCount === "fail") return HttpResponse.json({ message: "no" }, { status: 500 });
        return HttpResponse.json({ data: [], total: options.openCount ?? 0, page: 1, limit: 1 });
      }
      if (options.failListFrom && calls.lists.length >= options.failListFrom) return HttpResponse.json({ message: "boom" }, { status: 500 });
      const page = Number(url.searchParams.get("page") ?? 1);
      const answer = options.pages?.[page - 1] ?? { data: [], total: 0 };
      return HttpResponse.json({ ...answer, page, limit: Number(url.searchParams.get("limit") ?? 25) });
    }),
    http.post(`${API}/api/admin/refunds/:id/complete`, async ({ params, request }) => {
      calls.completes.push({ id: String(params.id), body: (await request.json()) as Record<string, unknown> });
      return refused() ?? HttpResponse.json({ data: refund({ id: String(params.id), status: "COMPLETED" }) });
    }),
    http.post(`${API}/api/admin/refunds/:id/reject`, async ({ params, request }) => {
      calls.rejects.push({ id: String(params.id), body: (await request.json()) as Record<string, unknown> });
      return refused() ?? HttpResponse.json({ data: refund({ id: String(params.id), status: "REJECTED" }) });
    }),
    http.post(`${API}/api/admin/refunds`, async ({ request }) => {
      calls.creates.push((await request.json()) as Record<string, unknown>);
      return refused() ?? HttpResponse.json({ data: refund() });
    })
  );
  return calls;
}

export interface RenderRefundsOptions extends RefundsApiOptions {
  as?: IdentityName | AuthUser;
  locale?: "vi" | "en";
  query?: Record<string, string>;
  counts?: CountsAnswer;
}

export async function renderRefunds(options: RenderRefundsOptions = {}) {
  const { as = "adminFull", locale, query = {}, counts, ...api } = options;
  navigation.pathname = "/admin/refunds";
  navigation.searchParams = new URLSearchParams(query);
  const calls = refundsApi(api);
  if (counts) countsApi(counts);
  const view = await renderApp(counts ? <PendingCountsProvider><RefundsContent /></PendingCountsProvider> : <RefundsContent />, { as, locale });
  return { calls, ...view };
}
