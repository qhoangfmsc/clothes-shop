import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdmin } from "@/src/app/api/analytics/_lib/admin-auth";
import { buildReport, toErrorReason } from "@/src/app/api/analytics/_lib/build-report";
import { getCapabilities } from "@/src/app/api/analytics/_lib/plans";
import { clampRange, fillSeries, parseRange, resolveWindow } from "@/src/app/api/analytics/_lib/range";
import { UpstreamError, aggregateEvents, aggregateVisits, countVisits, readCredentials } from "@/src/app/api/analytics/_lib/vercel-client";
import { API } from "@/tests/_support/api";
import { server } from "@/tests/_support/msw-server";

/* The server side of analytics: who may ask, which plan, which window, Vercel's API and the report built from it (specs/admin/analytics.md, flows ANA-1 to ANA-7E). */

const VERCEL = "https://api.vercel.com/v1/query/web-analytics";
const CREDENTIALS = { token: "tok", projectId: "prj", teamId: "team" };
const NOW = Date.parse("2026-03-05T12:34:56.000Z");

beforeEach(() => vi.unstubAllEnvs());
afterEach(() => vi.unstubAllEnvs());

describe("ANA-1 who may ask", () => {
  const ask = (headers: Record<string, string> = {}) => requireAdmin(new Request("http://localhost/api/analytics", { headers }));
  const me = (status: number, body?: unknown) => server.use(http.get(`${API}/api/auth/me`, () => (body === undefined ? new HttpResponse(null, { status }) : HttpResponse.json(body as object, { status }))));

  it("lets a signed-in admin through, asking the BE who the token belongs to", async () => {
    let seen: string | null = null;
    server.use(http.get(`${API}/api/auth/me`, ({ request }) => {
      seen = request.headers.get("authorization");
      return HttpResponse.json({ user: { role: "admin" } });
    }));

    expect(await ask({ authorization: "Bearer abc" })).toBeNull();
    expect(seen).toBe("Bearer abc");
  });

  it.each([
    ["no header", {}],
    ["a header that is not a bearer token", { authorization: "Basic abc" }],
  ])("says unauthorised for %s, without asking the BE", async (_label, headers) => {
    let asked = false;
    server.use(http.get(`${API}/api/auth/me`, () => ((asked = true), HttpResponse.json({}))));

    const res = (await ask(headers))!;

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: "Unauthorized" });
    expect(asked).toBe(false);
  });

  it("passes the BE's 401 on, so the browser refreshes its token and tries again", async () => {
    me(401);

    const res = (await ask({ authorization: "Bearer abc" }))!;

    expect(res.status).toBe(401);
  });

  it("says forbidden to a signed-in customer", async () => {
    me(200, { user: { role: "user" } });

    const res = (await ask({ authorization: "Bearer abc" }))!;

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ message: "Forbidden" });
  });

  it.each([
    ["no user in the answer", {}],
    ["an answer that is not JSON", undefined],
  ])("says forbidden for %s", async (_label, body) => {
    server.use(http.get(`${API}/api/auth/me`, () => (body === undefined ? new HttpResponse("oops", { status: 200 }) : HttpResponse.json(body))));

    expect((await ask({ authorization: "Bearer abc" }))!.status).toBe(403);
  });

  it("says the auth service is unavailable when the BE fails or cannot be reached", async () => {
    me(500);
    const failed = (await ask({ authorization: "Bearer abc" }))!;
    expect(failed.status).toBe(502);
    expect(await failed.json()).toEqual({ message: "Auth service unavailable" });

    server.use(http.get(`${API}/api/auth/me`, () => HttpResponse.error()));
    expect((await ask({ authorization: "Bearer abc" }))!.status).toBe(502);
  });
});

describe("ANA-2 what the plan allows", () => {
  it.each([
    ["hobby", { maxRangeDays: 30, customEvents: false, utm: false }],
    ["pro", { maxRangeDays: 365, customEvents: true, utm: false }],
    ["pro-plus", { maxRangeDays: 730, customEvents: true, utm: true }],
    ["enterprise", { maxRangeDays: 730, customEvents: true, utm: true }],
    ["  PRO  ", { maxRangeDays: 365, customEvents: true, utm: false }],
    ["gold", { maxRangeDays: 30, customEvents: false, utm: false }],
    ["", { maxRangeDays: 30, customEvents: false, utm: false }],
  ])("reads the plan %j", (plan, expected) => {
    vi.stubEnv("WEB_ANALYTICS_PLAN", plan);

    expect(getCapabilities()).toEqual(expected);
  });

  it("falls back to the free plan when none is set", () => {
    expect(getCapabilities()).toEqual({ maxRangeDays: 30, customEvents: false, utm: false });
  });
});

describe("ANA-3 the window of time", () => {
  it("takes a range it knows and otherwise seven days", () => {
    expect(["24h", "7d", "30d", "90d"].map(parseRange)).toEqual(["24h", "7d", "30d", "90d"]);
    expect(parseRange(null)).toBe("7d");
    expect(parseRange("1y")).toBe("7d");
    expect(parseRange("")).toBe("7d");
  });

  it.each([
    ["90d", 30, "30d"],
    ["90d", 365, "90d"],
    ["30d", 30, "30d"],
    ["30d", 29, "7d"],
    ["7d", 1, "24h"],
    ["7d", 0, "24h"],
    ["24h", 1, "24h"],
  ] as const)("keeps %s to what a window of %d days allows: %s", (range, days, expected) => {
    expect(clampRange(range, days)).toBe(expected);
  });

  it("rounds the end of the window down to the five minutes, not to ten", () => {
    expect(resolveWindow("7d", Date.parse("2026-03-05T12:38:10.000Z")).until.toISOString()).toBe("2026-03-05T12:35:00.000Z");
  });

  it("counts a day window back from the start of today (UTC), a week being seven days with today the last", () => {
    const window = resolveWindow("7d", NOW);

    expect(window.granularity).toBe("day");
    expect(window.bucketCount).toBe(7);
    expect(window.since.toISOString()).toBe("2026-02-27T00:00:00.000Z");
  });

  it("counts an hour window back from the start of this hour, 24 hours with this one the last", () => {
    const window = resolveWindow("24h", NOW);

    expect(window.granularity).toBe("hour");
    expect(window.bucketCount).toBe(24);
    expect(window.bucketMs).toBe(3_600_000);
    expect(window.since.toISOString()).toBe("2026-03-04T13:00:00.000Z");
  });

  it("rounds the end down to five minutes so repeated asks share one answer, and puts the previous period right before", () => {
    const window = resolveWindow("30d", NOW);

    expect(window.until.toISOString()).toBe("2026-03-05T12:30:00.000Z");
    expect(window.bucketCount).toBe(30);
    expect(window.previousUntil.getTime()).toBe(window.since.getTime() - 1);
    expect(window.since.getTime() - window.previousSince.getTime()).toBe(30 * 86_400_000);
  });

  it("uses the clock when none is given", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-05T12:34:56Z"));
    try {
      expect(resolveWindow("7d").since.toISOString()).toBe("2026-02-27T00:00:00.000Z");
    } finally {
      vi.useRealTimers();
    }
  });

  it("fills a point for every bucket, zero where Vercel sent nothing, and ignores rows it cannot place", () => {
    const window = resolveWindow("7d", NOW);

    const series = fillSeries(
      [
        { timestamp: "2026-03-01T00:00:00.000Z", pageviews: 5, visitors: 3 },
        { timestamp: "2026-03-03T07:00:00.000Z", pageviews: 8, visitors: 4 },
        { timestamp: "nonsense", pageviews: 99, visitors: 99 },
        { pageviews: 1, visitors: 1 },
        { timestamp: "2026-03-04T00:00:00.000Z", pageviews: "7" as never, visitors: undefined },
      ],
      window
    );

    expect(series).toHaveLength(7);
    expect(series.map((p) => p.timestamp)).toEqual(["2026-02-27", "2026-02-28", "2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05"].map((d) => `${d}T00:00:00.000Z`));
    expect(series.map((p) => [p.pageviews, p.visitors])).toEqual([[0, 0], [0, 0], [5, 3], [0, 0], [8, 4], [7, 0], [0, 0]]);
  });

  it("puts a row at any minute of an hour in that hour's bucket", () => {
    const window = resolveWindow("24h", NOW);

    const series = fillSeries([{ timestamp: "2026-03-05T12:59:00.000Z", pageviews: 2, visitors: 1 }], window);

    expect(series.at(-1)).toEqual({ timestamp: "2026-03-05T12:00:00.000Z", pageviews: 2, visitors: 1 });
    expect(series.filter((p) => p.pageviews > 0)).toHaveLength(1);
  });
});

describe("ANA-4 reading the Vercel settings", () => {
  it("returns the token, project and team when set, each trimmed", () => {
    vi.stubEnv("WEB_ANALYTICS_TOKEN", " tok ");
    vi.stubEnv("WEB_ANALYTICS_PROJECT_ID", " prj ");
    vi.stubEnv("WEB_ANALYTICS_TEAM_ID", " team ");

    expect(readCredentials()).toEqual({ ok: true, credentials: { token: "tok", projectId: "prj", teamId: "team" } });
  });

  it("leaves the team out when it is not set or blank", () => {
    vi.stubEnv("WEB_ANALYTICS_TOKEN", "tok");
    vi.stubEnv("WEB_ANALYTICS_PROJECT_ID", "prj");
    vi.stubEnv("WEB_ANALYTICS_TEAM_ID", "  ");

    expect(readCredentials()).toEqual({ ok: true, credentials: { token: "tok", projectId: "prj", teamId: undefined } });
  });

  it.each([
    ["nothing", {}, ["WEB_ANALYTICS_TOKEN", "WEB_ANALYTICS_PROJECT_ID"]],
    ["only the token", { WEB_ANALYTICS_TOKEN: "tok" }, ["WEB_ANALYTICS_PROJECT_ID"]],
    ["only the project", { WEB_ANALYTICS_PROJECT_ID: "prj" }, ["WEB_ANALYTICS_TOKEN"]],
    ["blank values", { WEB_ANALYTICS_TOKEN: "  ", WEB_ANALYTICS_PROJECT_ID: "" }, ["WEB_ANALYTICS_TOKEN", "WEB_ANALYTICS_PROJECT_ID"]],
  ])("lists what is missing when %s is set", (_label, env, missing) => {
    const set = env as Record<string, string>;
    vi.stubEnv("WEB_ANALYTICS_TOKEN", set.WEB_ANALYTICS_TOKEN ?? "");
    vi.stubEnv("WEB_ANALYTICS_PROJECT_ID", set.WEB_ANALYTICS_PROJECT_ID ?? "");

    expect(readCredentials()).toEqual({ ok: false, missing });
  });
});

describe("ANA-5 asking Vercel", () => {
  const period = { since: new Date("2026-03-01T00:00:00.000Z"), until: new Date("2026-03-05T00:00:00.000Z") };

  it("counts visits with the token, the project, the team and the period", async () => {
    let seen: { url: URL; auth: string | null } | null = null;
    server.use(http.get(`${VERCEL}/visits/count`, ({ request }) => {
      seen = { url: new URL(request.url), auth: request.headers.get("authorization") };
      return HttpResponse.json({ data: { pageviews: 5, visitors: 2 } });
    }));

    const result = await countVisits(CREDENTIALS, period);

    expect(result).toEqual({ pageviews: 5, visitors: 2 });
    expect(seen!.auth).toBe("Bearer tok");
    expect(Object.fromEntries(seen!.url.searchParams)).toEqual({ projectId: "prj", teamId: "team", since: "2026-03-01T00:00:00.000Z", until: "2026-03-05T00:00:00.000Z" });
  });

  it("leaves the team out for a personal project", async () => {
    let seen: URL | null = null;
    server.use(http.get(`${VERCEL}/visits/count`, ({ request }) => ((seen = new URL(request.url)), HttpResponse.json({ data: {} }))));

    await countVisits({ token: "tok", projectId: "prj" }, period);

    expect(seen!.searchParams.has("teamId")).toBe(false);
  });

  it("groups visits by a column with a row limit of ten unless told otherwise", async () => {
    const seen: URL[] = [];
    server.use(http.get(`${VERCEL}/visits/aggregate`, ({ request }) => (seen.push(new URL(request.url)), HttpResponse.json({ data: [{ country: "VN", visitors: 1 }] }))));

    const rows = await aggregateVisits(CREDENTIALS, period, "country");
    await aggregateVisits(CREDENTIALS, period, "day", 100);

    expect(rows).toEqual([{ country: "VN", visitors: 1 }]);
    expect(seen.map((u) => [u.searchParams.get("by"), u.searchParams.get("limit")])).toEqual([["country", "10"], ["day", "100"]]);
  });

  it("groups events by name", async () => {
    let seen: URL | null = null;
    server.use(http.get(`${VERCEL}/events/aggregate`, ({ request }) => ((seen = new URL(request.url)), HttpResponse.json({ data: [] }))));

    await aggregateEvents(CREDENTIALS, period, "eventName");

    expect(seen!.searchParams.get("by")).toBe("eventName");
    expect(seen!.searchParams.get("limit")).toBe("10");
  });

  it("throws an error that carries Vercel's status and no text", async () => {
    server.use(http.get(`${VERCEL}/visits/count`, () => HttpResponse.json({ error: "x" }, { status: 402 })));

    const error = await countVisits(CREDENTIALS, period).catch((e) => e);

    expect(error).toBeInstanceOf(UpstreamError);
    expect(error.status).toBe(402);
    expect(error.message).toBe("");
  });
});

describe("ANA-6 the reason shown for a failure", () => {
  it.each([
    [401, "auth"],
    [403, "auth"],
    [404, "auth"],
    [402, "plan"],
    [410, "plan"],
    [500, "unavailable"],
    [429, "unavailable"],
  ])("maps Vercel's %d to %s", (status, reason) => {
    expect(toErrorReason(new UpstreamError(status))).toBe(reason);
  });

  it("calls anything that is not a Vercel answer unavailable", () => {
    expect(toErrorReason(new Error("x"))).toBe("unavailable");
    expect(toErrorReason(undefined)).toBe("unavailable");
  });
});

describe("ANA-7 building the report", () => {
  const FREE = { maxRangeDays: 30, customEvents: false, utm: false };
  const PAID = { maxRangeDays: 730, customEvents: true, utm: true };
  const today = new Date().toISOString().slice(0, 10);

  function vercel(over: { count?: (params: URLSearchParams) => Response; aggregate?: (params: URLSearchParams) => Response; events?: (params: URLSearchParams) => Response } = {}) {
    const calls = { count: [] as URLSearchParams[], aggregate: [] as URLSearchParams[], events: [] as URLSearchParams[] };
    server.use(
      http.get(`${VERCEL}/visits/count`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        calls.count.push(params);
        return over.count?.(params) ?? HttpResponse.json({ data: { pageviews: 600, visitors: 200 } });
      }),
      http.get(`${VERCEL}/visits/aggregate`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        calls.aggregate.push(params);
        return over.aggregate?.(params) ?? HttpResponse.json({ data: [{ [params.get("by")!]: "x", visitors: 3, pageviews: 4 }] });
      }),
      http.get(`${VERCEL}/events/aggregate`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        calls.events.push(params);
        return over.events?.(params) ?? HttpResponse.json({ data: [{ eventName: "view_product", count: 10, visitors: 5 }, { eventName: "purchase", count: "2", visitors: 1 }] });
      })
    );
    return calls;
  }

  it("builds a summary from totals, the trend and the previous period, without breakdowns or a funnel", async () => {
    const calls = vercel({ aggregate: (params) => (params.get("by") === "day" ? HttpResponse.json({ data: [{ day: "x", timestamp: `${today}T00:00:00.000Z`, pageviews: 9, visitors: 4 }] }) : HttpResponse.json({ data: [] })) });

    const report = await buildReport(CREDENTIALS, "7d", "summary", PAID);

    expect(report).toMatchObject({ range: "7d", granularity: "day", capabilities: PAID, totals: { pageviews: 600, visitors: 200 }, previousTotals: { pageviews: 600, visitors: 200 }, breakdowns: null, funnel: null });
    expect(report.series).toHaveLength(7);
    expect(report.series.at(-1)).toMatchObject({ pageviews: 9, visitors: 4 });
    expect(Date.parse(report.since)).toBe(Date.parse(report.series[0].timestamp));
    expect(Math.abs(Date.parse(report.generatedAt) - Date.now())).toBeLessThan(5000);
    expect(calls.count).toHaveLength(2);
    expect(calls.aggregate.map((p) => p.get("by"))).toEqual(["day"]);
    expect(calls.events).toHaveLength(0);
  });

  it("asks for the trend by hour for 24 hours", async () => {
    const calls = vercel();

    const report = await buildReport(CREDENTIALS, "24h", "summary", FREE);

    expect(report.range).toBe("24h");
    expect(report.granularity).toBe("hour");
    expect(report.series).toHaveLength(24);
    expect(calls.aggregate[0].get("by")).toBe("hour");
    expect(calls.aggregate[0].get("limit")).toBe("100");
  });

  it("asks for ninety days in two pieces of at most sixty days and joins them", async () => {
    const calls = vercel();

    const report = await buildReport(CREDENTIALS, "90d", "summary", PAID);

    const periods = calls.aggregate.map((p) => [Date.parse(p.get("until")!) - Date.parse(p.get("since")!) + 1]);
    expect(calls.aggregate).toHaveLength(2);
    expect(periods[0][0]).toBe(60 * 86_400_000);
    expect(periods[1][0]).toBeLessThanOrEqual(30 * 86_400_000 + 5 * 60_000);
    expect(report.series).toHaveLength(90);
  });

  it("adds the breakdowns and the funnel to the full report: ten lists, rows with their numbers, funnel steps in order", async () => {
    const calls = vercel();

    const report = await buildReport(CREDENTIALS, "7d", "full", PAID);

    const columns = calls.aggregate.map((p) => p.get("by")).filter((by) => by !== "day");
    expect(columns.sort()).toEqual(["browserName", "country", "deviceType", "osName", "referrerHostname", "requestPath", "route", "utmCampaign", "utmMedium", "utmSource"]);
    expect(report.breakdowns!.pages).toEqual([{ key: "x", visitors: 3, pageviews: 4 }]);
    expect(report.breakdowns!.countries).toEqual([{ key: "x", visitors: 3, pageviews: 4 }]);
    expect(report.funnel).toEqual([
      { event: "view_product", count: 10, visitors: 5 },
      { event: "add_to_cart", count: 0, visitors: 0 },
      { event: "begin_checkout", count: 0, visitors: 0 },
      { event: "purchase", count: 2, visitors: 1 },
    ]);
  });

  it("asks for no UTM lists and no funnel when the plan does not have them", async () => {
    const calls = vercel();

    const report = await buildReport(CREDENTIALS, "7d", "full", FREE);

    expect(calls.aggregate.map((p) => p.get("by"))).not.toContain("utmSource");
    expect(report.breakdowns).toMatchObject({ utmSources: null, utmMediums: null, utmCampaigns: null });
    expect(report.breakdowns!.pages).not.toBeNull();
    expect(report.funnel).toBeNull();
    expect(calls.events).toHaveLength(0);
  });

  it("reads a number it cannot read as zero", async () => {
    vercel({ aggregate: (params) => (params.get("by") === "day" ? HttpResponse.json({ data: [] }) : HttpResponse.json({ data: [{ country: "VN", visitors: "n/a", pageviews: "12" }] })) });

    const report = await buildReport(CREDENTIALS, "7d", "full", FREE);

    expect(report.breakdowns!.countries).toEqual([{ key: "VN", visitors: 0, pageviews: 12 }]);
  });

  it("writes a missing dimension as an empty key and a missing number as zero", async () => {
    vercel({ aggregate: (params) => (params.get("by") === "day" ? HttpResponse.json({ data: [] }) : HttpResponse.json({ data: [{ visitors: "7" }, { country: null, pageviews: undefined }] })) });

    const report = await buildReport(CREDENTIALS, "7d", "full", FREE);

    expect(report.breakdowns!.countries).toEqual([{ key: "", visitors: 7, pageviews: 0 }, { key: "", visitors: 0, pageviews: 0 }]);
  });

  it("leaves one list empty when only that query fails, and the funnel null when its query fails", async () => {
    vercel({
      aggregate: (params) => (params.get("by") === "country" ? HttpResponse.json({ message: "x" }, { status: 500 }) : HttpResponse.json({ data: [] })),
      events: () => HttpResponse.json({ message: "x" }, { status: 500 }),
    });

    const report = await buildReport(CREDENTIALS, "7d", "full", PAID);

    expect(report.breakdowns!.countries).toBeNull();
    expect(report.breakdowns!.pages).toEqual([]);
    expect(report.funnel).toBeNull();
  });

  const isCurrent = (params: URLSearchParams) => Date.parse(params.get("until")!) > Date.now() - 3_600_000;

  it("gives no previous period when that query fails, and keeps the rest", async () => {
    vercel({ count: (params) => (isCurrent(params) ? HttpResponse.json({ data: { pageviews: 600, visitors: 200 } }) : HttpResponse.json({ message: "x" }, { status: 500 })) });

    const report = await buildReport(CREDENTIALS, "7d", "summary", FREE);

    expect(report.previousTotals).toBeNull();
    expect(report.totals).toEqual({ pageviews: 600, visitors: 200 });
  });

  it("adds up the trend when only the totals query fails (the visitors are then only approximate), and keeps the previous period", async () => {
    vercel({
      count: (params) => (isCurrent(params) ? HttpResponse.json({ message: "x" }, { status: 500 }) : HttpResponse.json({ data: { pageviews: 50, visitors: 20 } })),
      aggregate: () => HttpResponse.json({ data: [{ timestamp: `${today}T00:00:00.000Z`, pageviews: 9, visitors: 4 }, { timestamp: `${new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)}T00:00:00.000Z`, pageviews: 5, visitors: 3 }] }),
    });

    const report = await buildReport(CREDENTIALS, "7d", "summary", FREE);

    expect(report.totals).toEqual({ pageviews: 14, visitors: 7 });
    expect(report.previousTotals).toEqual({ pageviews: 50, visitors: 20 });
  });

  it("shows an empty trend of zeros when only the trend query fails", async () => {
    server.use(http.get(`${VERCEL}/visits/aggregate`, () => HttpResponse.json({ message: "x" }, { status: 500 })));
    server.use(http.get(`${VERCEL}/visits/count`, () => HttpResponse.json({ data: { pageviews: 6, visitors: 2 } })));

    const report = await buildReport(CREDENTIALS, "7d", "summary", FREE);

    expect(report.totals).toEqual({ pageviews: 6, visitors: 2 });
    expect(report.series).toHaveLength(7);
    expect(report.series.every((p) => p.pageviews === 0 && p.visitors === 0)).toBe(true);
  });

  it("throws the trend's error when both the trend and the totals fail", async () => {
    server.use(
      http.get(`${VERCEL}/visits/aggregate`, () => HttpResponse.json({ message: "x" }, { status: 402 })),
      http.get(`${VERCEL}/visits/count`, () => HttpResponse.json({ message: "x" }, { status: 500 }))
    );

    const error = await buildReport(CREDENTIALS, "7d", "summary", FREE).catch((e) => e);

    expect(error).toBeInstanceOf(UpstreamError);
    expect(error.status).toBe(402);
  });
});
