import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, maxDuration } from "@/src/app/api/analytics/route";
import { API } from "@/tests/_support/api";
import { server } from "@/tests/_support/msw-server";

/* The `/api/analytics` route end to end: who, which settings, which range and view, and what comes back (specs/admin/analytics.md, flow ANA-8). */

const VERCEL = "https://api.vercel.com/v1/query/web-analytics";
const ADMIN = { authorization: "Bearer abc" };

function admin(role = "admin") {
  server.use(http.get(`${API}/api/auth/me`, () => HttpResponse.json({ user: { role } })));
}
function vercel(count: () => Response = () => HttpResponse.json({ data: { pageviews: 6, visitors: 2 } })) {
  const calls = { aggregate: [] as URLSearchParams[], events: 0 };
  server.use(
    http.get(`${VERCEL}/visits/count`, count),
    http.get(`${VERCEL}/visits/aggregate`, ({ request }) => (calls.aggregate.push(new URL(request.url).searchParams), HttpResponse.json({ data: [] }))),
    http.get(`${VERCEL}/events/aggregate`, () => ((calls.events += 1), HttpResponse.json({ data: [] })))
  );
  return calls;
}
const ask = (query = "", headers: Record<string, string> = ADMIN) => GET(new Request(`http://localhost/api/analytics${query}`, { headers }));

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("WEB_ANALYTICS_TOKEN", "tok");
  vi.stubEnv("WEB_ANALYTICS_PROJECT_ID", "prj");
});
afterEach(() => vi.unstubAllEnvs());

describe("ANA-8 the route", () => {
  it("allows thirty seconds", () => {
    expect(maxDuration).toBe(30);
  });

  it("says unauthorised without a token, forbidden to a customer, and never touches Vercel for them", async () => {
    const calls = vercel();
    expect((await ask("", {})).status).toBe(401);
    admin("user");
    expect((await ask()).status).toBe(403);
    expect(calls.aggregate).toHaveLength(0);
  });

  it("tells an admin which settings are missing, as a plain 200, never caching it", async () => {
    admin();
    vi.stubEnv("WEB_ANALYTICS_TOKEN", "");
    vi.stubEnv("WEB_ANALYTICS_PROJECT_ID", "");

    const res = await ask();

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ status: "not_configured", missing: ["WEB_ANALYTICS_TOKEN", "WEB_ANALYTICS_PROJECT_ID"] });
  });

  it("builds a summary for seven days by default, never cached by the browser", async () => {
    admin();
    const calls = vercel();

    const res = await ask();
    const body = await res.json();

    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(body.status).toBe("ok");
    expect(body.report).toMatchObject({ range: "7d", breakdowns: null, funnel: null, totals: { pageviews: 6, visitors: 2 } });
    expect(calls.aggregate.map((p) => p.get("by"))).toEqual(["day"]);
  });

  it("builds the full report only when asked with view=full", async () => {
    admin();
    vi.stubEnv("WEB_ANALYTICS_PLAN", "pro");
    const calls = vercel();

    const body = await (await ask("?view=full")).json();

    expect(body.report.breakdowns).not.toBeNull();
    expect(body.report.funnel).toEqual(expect.any(Array));
    expect(calls.events).toBe(1);
    const summary = await (await ask("?view=other")).json();
    expect(summary.report.breakdowns).toBeNull();
  });

  it("follows the range asked for, and uses seven days for one it does not know", async () => {
    admin();
    vercel();

    expect((await (await ask("?range=24h")).json()).report.range).toBe("24h");
    expect((await (await ask("?range=30d")).json()).report.range).toBe("30d");
    expect((await (await ask("?range=1y")).json()).report.range).toBe("7d");
  });

  it("shortens a range the plan does not cover to the longest one it does", async () => {
    admin();
    vercel();

    expect((await (await ask("?range=90d")).json()).report.range).toBe("30d");
    vi.stubEnv("WEB_ANALYTICS_PLAN", "pro");
    expect((await (await ask("?range=90d")).json()).report.range).toBe("90d");
  });

  it.each([
    [401, "auth"],
    [402, "plan"],
    [500, "unavailable"],
  ])("answers 200 with the reason when Vercel says %d", async (status, reason) => {
    admin();
    server.use(http.get(`${VERCEL}/*`, () => HttpResponse.json({ message: "x" }, { status })));

    const res = await ask();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "error", reason });
  });

  it("answers 200 with 'unavailable' when Vercel cannot be reached", async () => {
    admin();
    server.use(http.get(`${VERCEL}/*`, () => HttpResponse.error()));

    expect(await (await ask()).json()).toEqual({ status: "error", reason: "unavailable" });
  });
});
