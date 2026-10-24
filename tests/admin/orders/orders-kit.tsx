import { http, HttpResponse } from "msw";
import type { AdminOrder } from "@/src/hooks/use-admin-api";
import OrdersContent from "@/src/app/[locale]/(admin)/admin/orders/OrdersContent";
import { PendingCountsProvider } from "@/src/app/[locale]/_components/PendingCountsProvider";
import { API } from "@/tests/_support/api";
import { shippingInfo } from "@/tests/_support/fixtures";
import { countsApi, type CountsAnswer } from "@/tests/_support/admin";
import type { IdentityName } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* The fake admin orders API and the render function shared by the admin orders tests. */

export interface OrdersApiOptions {
  /** Pages of `GET /api/admin/orders`; `total` is the BE's count over all pages */
  pages?: { data: AdminOrder[]; total: number }[];
  /** Fail the list (status 500) from the nth request on (1 = always) */
  failListFrom?: number;
  /** Refuse every admin request with this status (401 for a visitor, 403 for a shopper) */
  deny?: 401 | 403;
  /** `GET /api/admin/orders/:id` answers this order, or fails with the status (a number) */
  detail?: AdminOrder | number | ((id: string) => AdminOrder | number);
  /** Orders whose status change is refused, with the body the BE sends */
  refuse?: Record<string, { status: number; body: Record<string, unknown> }>;
}

export interface OrdersCalls {
  lists: URLSearchParams[];
  details: string[];
  patches: { id: string; status: string }[];
}

export function ordersApi(options: OrdersApiOptions = {}): OrdersCalls {
  const calls: OrdersCalls = { lists: [], details: [], patches: [] };
  server.use(
    http.get(`${API}/api/admin/orders`, ({ request }) => {
      const url = new URL(request.url);
      calls.lists.push(url.searchParams);
      if (options.deny) return HttpResponse.json({ message: "denied" }, { status: options.deny });
      if (options.failListFrom && calls.lists.length >= options.failListFrom) return HttpResponse.json({ message: "boom" }, { status: 500 });
      const page = Number(url.searchParams.get("page") ?? 1);
      const answer = options.pages?.[page - 1] ?? { data: [], total: 0 };
      return HttpResponse.json({ ...answer, page, limit: Number(url.searchParams.get("limit") ?? 25) });
    }),
    http.get(`${API}/api/admin/orders/:id`, ({ params }) => {
      const id = String(params.id);
      calls.details.push(id);
      const answer = typeof options.detail === "function" ? options.detail(id) : options.detail;
      if (typeof answer === "number") return HttpResponse.json({ message: "no such order" }, { status: answer });
      return HttpResponse.json({ data: answer ?? null });
    }),
    http.get(`${API}/api/shipping`, () => HttpResponse.json({ data: shippingInfo() })),
    http.patch(`${API}/api/admin/orders/:id/status`, async ({ params, request }) => {
      const id = String(params.id);
      const { status } = (await request.json()) as { status: string };
      calls.patches.push({ id, status });
      const refused = options.refuse?.[id];
      if (refused) return HttpResponse.json(refused.body, { status: refused.status });
      return HttpResponse.json({ data: { id, status } });
    })
  );
  return calls;
}

export interface RenderOrdersOptions extends OrdersApiOptions {
  as?: IdentityName;
  locale?: "vi" | "en";
  /** `?orderId=` / `?needsAction=` / other query parameters of the address */
  query?: Record<string, string>;
  /** What the menu's pending-counts request answers; leave out for no provider (the page then sees no counts) */
  counts?: CountsAnswer;
}

export async function renderOrders(options: RenderOrdersOptions = {}) {
  const { as = "adminFull", locale, query = {}, counts, ...api } = options;
  navigation.pathname = "/admin/orders";
  navigation.searchParams = new URLSearchParams(query);
  const calls = ordersApi(api);
  const countCalls = counts ? countsApi(counts) : null;
  const view = await renderApp(counts ? <PendingCountsProvider><OrdersContent /></PendingCountsProvider> : <OrdersContent />, { as, locale });
  return { calls, countCalls, ...view };
}
