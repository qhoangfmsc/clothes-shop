import { http, HttpResponse } from "msw";
import DashboardContent from "@/src/app/[locale]/(admin)/admin/DashboardContent";
import type { AuthUser } from "@/src/contexts/auth-context";
import type { AdminOrder, AdminUser } from "@/src/hooks/use-admin-api";
import type { Product } from "@/src/types/product";
import type { AnalyticsReport, AnalyticsResponse } from "@/src/types/analytics";
import { API } from "@/tests/_support/api";
import { adminOrder, product } from "@/tests/_support/fixtures";
import type { IdentityName } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* Sample data, the fake admin API behind the dashboard (products, orders, users, analytics) and the render function shared by the dashboard tests. */

const STAMP = "2026-03-05T05:00:00.000Z";

export { adminOrder, product };

export function user(over: Partial<AdminUser> = {}): AdminUser {
  return { id: "u-1", email: "mai@example.com", name: "Mai", image: null, provider: "google", role: "user", status: "active", createdAt: STAMP, updatedAt: STAMP, ...over };
}

export function report(over: Partial<AnalyticsReport> = {}): AnalyticsReport {
  return {
    range: "7d",
    granularity: "day",
    since: "2026-03-01T00:00:00.000Z",
    capabilities: { maxRangeDays: 30, customEvents: false, utm: false },
    totals: { visitors: 200, pageviews: 600 },
    previousTotals: { visitors: 100, pageviews: 600 },
    series: [{ timestamp: "2026-03-01T00:00:00.000Z", visitors: 10, pageviews: 20 }, { timestamp: "2026-03-02T00:00:00.000Z", visitors: 30, pageviews: 50 }, { timestamp: "2026-03-03T00:00:00.000Z", visitors: 20, pageviews: 40 }],
    breakdowns: null,
    funnel: null,
    generatedAt: "2026-03-05T05:00:00.000Z",
    ...over,
  };
}

export interface DashboardApiOptions {
  orders?: { data: AdminOrder[]; total: number } | number;
  products?: { data: Product[]; total: number } | number;
  users?: { total: number } | number;
  /** What `GET /api/analytics` answers: a response, or a status to fail with */
  analytics?: AnalyticsResponse | number;
  /** Hold the answer to the orders for this long (to see the loading state) */
  ordersDelayMs?: number;
  /** Hold the answer to the traffic report for this long */
  analyticsDelayMs?: number;
}

export interface DashboardCalls {
  orders: URLSearchParams[];
  products: URLSearchParams[];
  users: URLSearchParams[];
  analytics: URLSearchParams[];
}

export function dashboardApi(options: DashboardApiOptions = {}): DashboardCalls {
  const calls: DashboardCalls = { orders: [], products: [], users: [], analytics: [] };
  const list = (answer: { data?: unknown[]; total: number } | number | undefined, fallback: { data: unknown[]; total: number }) =>
    typeof answer === "number" ? HttpResponse.json({ message: "boom" }, { status: answer }) : HttpResponse.json({ page: 1, limit: 200, ...(answer ?? fallback) });
  server.use(
    http.get(`${API}/api/admin/orders`, async ({ request }) => {
      calls.orders.push(new URL(request.url).searchParams);
      if (options.ordersDelayMs) await new Promise((resolve) => setTimeout(resolve, options.ordersDelayMs));
      return list(options.orders, { data: [], total: 0 });
    }),
    http.get(`${API}/api/admin/products`, ({ request }) => {
      calls.products.push(new URL(request.url).searchParams);
      return list(options.products, { data: [], total: 0 });
    }),
    http.get(`${API}/api/admin/users`, ({ request }) => {
      calls.users.push(new URL(request.url).searchParams);
      return list(typeof options.users === "number" ? options.users : { data: [], total: options.users?.total ?? 0 }, { data: [], total: 0 });
    }),
    http.get("*/api/analytics", async ({ request }) => {
      calls.analytics.push(new URL(request.url).searchParams);
      if (options.analyticsDelayMs) await new Promise((resolve) => setTimeout(resolve, options.analyticsDelayMs));
      if (typeof options.analytics === "number") return HttpResponse.json({ message: "boom" }, { status: options.analytics });
      return HttpResponse.json(options.analytics ?? { status: "not_configured", missing: ["WEB_ANALYTICS_TOKEN"] });
    })
  );
  return calls;
}

export interface RenderDashboardOptions extends DashboardApiOptions {
  as?: IdentityName | AuthUser;
  locale?: "vi" | "en";
}

export async function renderDashboard(options: RenderDashboardOptions = {}) {
  const { as = "adminFull", locale, ...api } = options;
  navigation.pathname = "/admin";
  navigation.searchParams = new URLSearchParams();
  const calls = dashboardApi(api);
  const view = await renderApp(<DashboardContent />, { as, locale });
  return { calls, ...view };
}
