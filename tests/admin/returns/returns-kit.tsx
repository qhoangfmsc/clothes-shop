import { http, HttpResponse } from "msw";
import ReturnsContent from "@/src/app/[locale]/(admin)/admin/returns/ReturnsContent";
import type { ReturnItem, ReturnRequest } from "@/src/app/[locale]/(admin)/admin/returns/_common/types";
import { PendingCountsProvider } from "@/src/app/[locale]/_components/PendingCountsProvider";
import type { AuthUser } from "@/src/contexts/auth-context";
import { API } from "@/tests/_support/api";
import { countsApi, type CountsAnswer } from "@/tests/_support/admin";
import type { IdentityName } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* Sample return requests, the fake admin returns API and the render function shared by the admin returns tests. */

const STAMP = "2026-03-05T05:00:00.000Z";

export function returnItem(over: Partial<ReturnItem> = {}): ReturnItem {
  return { id: "ri-1", orderItemId: "oi-1", productName: "Silk dress", productImage: null, size: "M", color: "Red", priceVnd: 350_000, priceUsd: 13.46, quantity: 2, acceptedQuantity: null, ...over };
}

export function adminReturn(over: Partial<ReturnRequest> = {}): ReturnRequest {
  return {
    id: "r-1",
    orderId: "o-1",
    status: "REQUESTED",
    reason: "WRONG_SIZE",
    note: null,
    adminNote: null,
    createdAt: STAMP,
    updatedAt: STAMP,
    approvedAt: null,
    receivedAt: null,
    shippingRefunded: false,
    items: [returnItem()],
    refund: null,
    order: { id: "o-1", status: "delivered", paymentStatus: "paid", totalVnd: 730_000, totalUsd: 28.08, shippingFeeVnd: 30_000, shippingFeeUsd: 1.15, deliveredAt: "2026-03-01T05:00:00.000Z", userId: "u-1", customer: { fullName: "Mai Tran", phone: "0901234567" } },
    ...over,
  };
}

export interface ReturnsApiOptions {
  pages?: { data: ReturnRequest[]; total: number }[];
  failListFrom?: number;
  deny?: 401 | 403;
  /** `GET /api/admin/returns/:id`: the request, or a status to fail with; a function answers per id */
  detail?: ReturnRequest | number | ((id: string) => ReturnRequest | number);
  /** approve/reject/receive: answer with this request, or refuse with a status and body */
  action?: ReturnRequest | { status: number; body: Record<string, unknown> };
}

export interface ReturnsCalls {
  lists: URLSearchParams[];
  details: string[];
  approves: { id: string; body: Record<string, unknown> }[];
  rejects: { id: string; body: Record<string, unknown> }[];
  receives: { id: string; body: Record<string, unknown> }[];
}

export function returnsApi(options: ReturnsApiOptions = {}): ReturnsCalls {
  const calls: ReturnsCalls = { lists: [], details: [], approves: [], rejects: [], receives: [] };
  const act = (kind: "approves" | "rejects" | "receives") => async ({ params, request }: { params: Record<string, unknown>; request: Request }) => {
    const text = await request.text();
    const body = (text ? JSON.parse(text) : {}) as Record<string, unknown>;
    calls[kind].push({ id: String(params.id), body });
    const answer = options.action ?? adminReturn({ id: String(params.id) });
    if ("status" in answer && "body" in answer) return HttpResponse.json(answer.body, { status: answer.status });
    return HttpResponse.json({ data: answer });
  };
  server.use(
    http.get(`${API}/api/admin/returns`, ({ request }) => {
      const url = new URL(request.url);
      calls.lists.push(url.searchParams);
      if (options.deny) return HttpResponse.json({ message: "denied" }, { status: options.deny });
      if (options.failListFrom && calls.lists.length >= options.failListFrom) return HttpResponse.json({ message: "boom" }, { status: 500 });
      const page = Number(url.searchParams.get("page") ?? 1);
      const answer = options.pages?.[page - 1] ?? { data: [], total: 0 };
      return HttpResponse.json({ ...answer, page, limit: Number(url.searchParams.get("limit") ?? 25) });
    }),
    http.get(`${API}/api/admin/returns/:id`, ({ params }) => {
      const id = String(params.id);
      calls.details.push(id);
      const answer = typeof options.detail === "function" ? options.detail(id) : options.detail;
      if (typeof answer === "number") return HttpResponse.json({ message: "no such return" }, { status: answer });
      return HttpResponse.json({ data: answer ?? adminReturn({ id }) });
    }),
    http.post(`${API}/api/admin/returns/:id/approve`, act("approves")),
    http.post(`${API}/api/admin/returns/:id/reject`, act("rejects")),
    http.post(`${API}/api/admin/returns/:id/receive`, act("receives"))
  );
  return calls;
}

export interface RenderReturnsOptions extends ReturnsApiOptions {
  as?: IdentityName | AuthUser;
  locale?: "vi" | "en";
  query?: Record<string, string>;
  counts?: CountsAnswer;
}

export async function renderReturns(options: RenderReturnsOptions = {}) {
  const { as = "adminFull", locale, query = {}, counts, ...api } = options;
  navigation.pathname = "/admin/returns";
  navigation.searchParams = new URLSearchParams(query);
  const calls = returnsApi(api);
  if (counts) countsApi(counts);
  const view = await renderApp(counts ? <PendingCountsProvider><ReturnsContent /></PendingCountsProvider> : <ReturnsContent />, { as, locale });
  return { calls, ...view };
}
