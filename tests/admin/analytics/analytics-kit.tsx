import { http, HttpResponse } from "msw";
import AnalyticsContent from "@/src/app/[locale]/(admin)/admin/analytics/AnalyticsContent";
import type { AuthUser } from "@/src/contexts/auth-context";
import type { AnalyticsBreakdowns, AnalyticsReport, AnalyticsResponse } from "@/src/types/analytics";
import type { IdentityName } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* Sample reports, the fake `/api/analytics` route the page reads, and the render function shared by the admin analytics tests. */

export function breakdowns(over: Partial<AnalyticsBreakdowns> = {}): AnalyticsBreakdowns {
  const empty = null;
  return {
    pages: [{ key: "/shop", visitors: 80, pageviews: 120 }, { key: "/", visitors: 40, pageviews: 60 }],
    routes: [{ key: "/[locale]/shop", visitors: 80, pageviews: 120 }],
    referrers: [{ key: "google.com", visitors: 50, pageviews: 70 }, { key: "", visitors: 25, pageviews: 30 }],
    utmSources: empty,
    utmMediums: empty,
    utmCampaigns: empty,
    countries: [{ key: "vn", visitors: 90, pageviews: 140 }, { key: "", visitors: 10, pageviews: 12 }],
    devices: [{ key: "Mobile", visitors: 70, pageviews: 100 }, { key: "weird", visitors: 5, pageviews: 6 }, { key: "", visitors: 1, pageviews: 1 }],
    browsers: [{ key: "Chrome", visitors: 60, pageviews: 90 }],
    systems: [{ key: "iOS", visitors: 40, pageviews: 55 }],
    ...over,
  };
}

export function report(over: Partial<AnalyticsReport> = {}): AnalyticsReport {
  return {
    range: "7d",
    granularity: "day",
    since: "2026-03-01T00:00:00.000Z",
    capabilities: { maxRangeDays: 30, customEvents: true, utm: false },
    totals: { visitors: 200, pageviews: 600 },
    previousTotals: { visitors: 100, pageviews: 600 },
    series: [
      { timestamp: "2026-03-01T00:00:00.000Z", visitors: 10, pageviews: 20 },
      { timestamp: "2026-03-02T00:00:00.000Z", visitors: 30, pageviews: 50 },
    ],
    breakdowns: breakdowns(),
    funnel: [
      { event: "view_product", count: 400, visitors: 150 },
      { event: "add_to_cart", count: 100, visitors: 60 },
      { event: "begin_checkout", count: 50, visitors: 30 },
      { event: "purchase", count: 20, visitors: 18 },
    ],
    generatedAt: "2026-03-05T05:00:00.000Z",
    ...over,
  };
}

export interface AnalyticsApiOptions {
  /** Answer by the range asked, or a status to fail with (a function can look at the whole query) */
  answer?: AnalyticsResponse | number | ((params: URLSearchParams) => AnalyticsResponse | number);
  /** Hold the answer for this long (to see the loading state) */
  delayMs?: number;
}

export interface AnalyticsCalls {
  asks: URLSearchParams[];
  auth: (string | null)[];
}

export function analyticsApi(options: AnalyticsApiOptions = {}): AnalyticsCalls {
  const calls: AnalyticsCalls = { asks: [], auth: [] };
  server.use(
    http.get("*/api/analytics", async ({ request }) => {
      const params = new URL(request.url).searchParams;
      calls.asks.push(params);
      calls.auth.push(request.headers.get("authorization"));
      if (options.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      const answer = typeof options.answer === "function" ? options.answer(params) : options.answer;
      if (typeof answer === "number") return HttpResponse.json({ message: "no" }, { status: answer });
      return HttpResponse.json(answer ?? { status: "ok", report: report({ range: (params.get("range") ?? "7d") as AnalyticsReport["range"] }) });
    })
  );
  return calls;
}

export interface RenderAnalyticsOptions extends AnalyticsApiOptions {
  as?: IdentityName | AuthUser;
  locale?: "vi" | "en";
}

export async function renderAnalytics(options: RenderAnalyticsOptions = {}) {
  const { as = "adminFull", locale, ...api } = options;
  navigation.pathname = "/admin/analytics";
  navigation.searchParams = new URLSearchParams();
  const calls = analyticsApi(api);
  const view = await renderApp(<AnalyticsContent />, { as, locale });
  return { calls, ...view };
}
