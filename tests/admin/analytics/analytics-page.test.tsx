import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { dateText, msg } from "@/tests/_support/messages";
import { breakdowns, renderAnalytics, report } from "./analytics-kit";

/* The analytics page: range tabs, key figures, chart, funnel, breakdowns and the cards for when there is no report (specs/admin/analytics.md, flows ANA-11 to ANA-14E). */

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactElement }) => <div data-testid="chart-box" style={{ width: 600, height: 280 }}>{children}</div> };
});

const A = (key: string) => msg(`admin.analytics.${key}`);
const tab = (name: string) => screen.getByRole("tab", { name });
const tile = (label: string) => screen.getByText(label, { selector: "p" }).closest("div.flex-col") as HTMLElement;

describe("ANA-11 the header", () => {
  it("has the title, the subtitle, a Refresh button and a link to Vercel that opens in a new tab", async () => {
    await renderAnalytics();

    expect(await screen.findByRole("heading", { level: 1, name: A("title") })).toBeInTheDocument();
    expect(screen.getByText(A("subtitle"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: A("actions.refresh") })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: A("actions.openVercel") });
    expect(link).toHaveAttribute("href", "https://vercel.com/qhoangfs-projects/clothes-shop/analytics?environment=all");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("asks for the last seven days, the full report, with the admin's token", async () => {
    const { calls } = await renderAnalytics();
    await screen.findByText("200");

    await waitFor(() => expect(calls.asks).toHaveLength(1));
    expect(Object.fromEntries(calls.asks[0])).toEqual({ range: "7d", view: "full" });
    expect(calls.auth[0]).toMatch(/^Bearer /);
  });

  it("asks again from Refresh, and the button is off while the answer is on its way", async () => {
    const { calls } = await renderAnalytics();
    await screen.findByText("200");
    const refresh = screen.getByRole("button", { name: A("actions.refresh") });
    expect(refresh).toBeEnabled();

    await userEvent.click(refresh);

    await waitFor(() => expect(calls.asks.length).toBeGreaterThan(1));
  });

  it("reads in English in English", async () => {
    await renderAnalytics({ locale: "en" });

    expect(await screen.findByRole("heading", { level: 1, name: msg("admin.analytics.title", "en") })).toBeInTheDocument();
  });
});

describe("ANA-12 the ranges", () => {
  it("shows all four ranges until a report says what the plan covers, then only those that fit", async () => {
    await renderAnalytics({ answer: { status: "ok", report: report({ capabilities: { maxRangeDays: 30, customEvents: true, utm: false } }) }, delayMs: 200 });

    const ranges = () => within(screen.getByRole("tablist", { name: A("range.label") })).getAllByRole("tab").map((t) => t.textContent);
    expect(ranges()).toEqual(["24 giờ", "7 ngày", "30 ngày", "90 ngày"]);
    await waitFor(() => expect(ranges()).toEqual(["24 giờ", "7 ngày", "30 ngày"]));
  });

  it("marks the range of the report as chosen, also when the server shortened the one asked for", async () => {
    await renderAnalytics({ answer: { status: "ok", report: report({ range: "30d" }) } });

    await waitFor(() => expect(tab("30 ngày")).toHaveAttribute("aria-selected", "true"));
    expect(tab("7 ngày")).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tablist", { name: A("range.label") })).toBeInTheDocument();
  });

  it("asks for the range that was clicked, keeping the full report", async () => {
    const { calls } = await renderAnalytics();
    await screen.findByText("200");

    await userEvent.click(tab("30 ngày"));

    await waitFor(() => expect(calls.asks.map((p) => p.get("range"))).toContain("30d"));
    expect(calls.asks.at(-1)!.get("view")).toBe("full");
    await waitFor(() => expect(tab("30 ngày")).toHaveAttribute("aria-selected", "true"));
  });

  it("colours the chosen range", async () => {
    await renderAnalytics();
    await screen.findByText("200");

    expect(tab("7 ngày").className).toContain("bg-[var(--accent-primary)]");
    expect(tab("24 giờ").className).not.toContain("bg-[var(--accent-primary)]");
  });
});

describe("ANA-13 the key figures", () => {
  it("shows visitors, page views and views per visitor with a hint each", async () => {
    await renderAnalytics({ answer: { status: "ok", report: report({ totals: { visitors: 200, pageviews: 700 }, previousTotals: null }) } });

    await waitFor(() => expect(within(tile(A("kpi.visitors.label"))).getByText("200")).toBeInTheDocument());
    expect(within(tile(A("kpi.pageviews.label"))).getByText("700")).toBeInTheDocument();
    expect(within(tile(A("kpi.viewsPerVisitor.label"))).getByText("3,5")).toBeInTheDocument();
    expect(within(tile(A("kpi.visitors.label"))).getByText(A("kpi.visitors.hint"))).toBeInTheDocument();
    expect(within(tile(A("kpi.viewsPerVisitor.label"))).getByText(A("kpi.viewsPerVisitor.hint"))).toBeInTheDocument();
  });

  it("shows dashes while there is no report yet", async () => {
    await renderAnalytics({ delayMs: 300 });

    expect(within(tile(A("kpi.visitors.label"))).getByText("—")).toBeInTheDocument();
    expect(within(tile(A("kpi.viewsPerVisitor.label"))).getByText("—")).toBeInTheDocument();
    await waitFor(() => expect(within(tile(A("kpi.visitors.label"))).getByText("200")).toBeInTheDocument());
  });

  it("shows the change against the previous period, up or down, and views per visitor against the previous ones", async () => {
    await renderAnalytics({ answer: { status: "ok", report: report({ totals: { visitors: 200, pageviews: 600 }, previousTotals: { visitors: 100, pageviews: 1200 } }) } });

    await waitFor(() => expect(within(tile(A("kpi.visitors.label"))).getByLabelText("Tăng 100% so với kỳ trước")).toBeInTheDocument());
    expect(within(tile(A("kpi.pageviews.label"))).getByLabelText("Giảm 50% so với kỳ trước")).toBeInTheDocument();
    expect(within(tile(A("kpi.viewsPerVisitor.label"))).getByLabelText("Giảm 75% so với kỳ trước")).toBeInTheDocument();
    expect(within(tile(A("kpi.visitors.label"))).getByText(A("kpi.vsPrevious"))).toBeInTheDocument();
  });

  it("shows no views per visitor when nobody visited, and no change when there is nothing to compare", async () => {
    await renderAnalytics({ answer: { status: "ok", report: report({ totals: { visitors: 0, pageviews: 0 }, previousTotals: { visitors: 0, pageviews: 0 } }) } });

    await waitFor(() => expect(within(tile(A("kpi.viewsPerVisitor.label"))).getByText("0")).toBeInTheDocument());
    expect(screen.queryByLabelText(/so với kỳ trước$/)).not.toBeInTheDocument();
    expect(within(tile(A("kpi.visitors.label"))).getByText(A("kpi.visitors.hint"))).toBeInTheDocument();
  });

  it("shows no change in views per visitor when the previous period had page views but no visitors", async () => {
    await renderAnalytics({ answer: { status: "ok", report: report({ totals: { visitors: 200, pageviews: 600 }, previousTotals: { visitors: 0, pageviews: 50 } }) } });

    await waitFor(() => expect(within(tile(A("kpi.viewsPerVisitor.label"))).getByText("3")).toBeInTheDocument());
    expect(within(tile(A("kpi.viewsPerVisitor.label"))).queryByLabelText(/so với kỳ trước/)).not.toBeInTheDocument();
    expect(tile(A("kpi.viewsPerVisitor.label")).textContent).not.toContain("NaN");
  });

  it("writes views per visitor to one decimal", async () => {
    await renderAnalytics({ answer: { status: "ok", report: report({ totals: { visitors: 3, pageviews: 10 }, previousTotals: null }) } });

    await waitFor(() => expect(within(tile(A("kpi.viewsPerVisitor.label"))).getByText("3,3")).toBeInTheDocument());
  });

  it("writes when the figures were made", async () => {
    await renderAnalytics();

    expect(await screen.findByText(A("updatedAt").replace("{time}", dateText("2026-03-05T05:00:00.000Z", "dateTime")))).toBeInTheDocument();
  });
});

describe("ANA-13 the chart, the funnel and the lists", () => {
  it("shows the traffic chart section with its title", async () => {
    await renderAnalytics();

    expect(await screen.findByRole("heading", { level: 2, name: A("chart.title") })).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: A("chart.ariaLabel") })).toBeInTheDocument();
  });

  it("shows the funnel only when the report has one", async () => {
    const with_ = await renderAnalytics();
    expect(await screen.findByRole("heading", { level: 2, name: A("funnel.title") })).toBeInTheDocument();
    with_.unmount();

    await renderAnalytics({ answer: { status: "ok", report: report({ funnel: null }) } });
    await screen.findByText("200");
    expect(screen.queryByRole("heading", { level: 2, name: A("funnel.title") })).not.toBeInTheDocument();
  });

  it("shows four lists only when the report has breakdowns", async () => {
    const full = await renderAnalytics();
    for (const card of ["pages", "sources", "locations", "devices"]) expect(await screen.findByRole("heading", { level: 2, name: A(`cards.${card}`) })).toBeInTheDocument();
    full.unmount();

    await renderAnalytics({ answer: { status: "ok", report: report({ breakdowns: null }) } });
    await screen.findByText("200");
    expect(screen.queryByRole("heading", { level: 2, name: A("cards.pages") })).not.toBeInTheDocument();
  });

  it("offers the campaign tabs only when the plan has UTM", async () => {
    const without = await renderAnalytics({ answer: { status: "ok", report: report({ capabilities: { maxRangeDays: 30, customEvents: true, utm: false } }) } });
    const sources = (await screen.findByRole("heading", { level: 2, name: A("cards.sources") })).closest("section") as HTMLElement;
    expect(within(sources).queryAllByRole("tab")).toHaveLength(0);
    without.unmount();

    await renderAnalytics({ answer: { status: "ok", report: report({ capabilities: { maxRangeDays: 730, customEvents: true, utm: true }, breakdowns: breakdowns({ utmSources: [] }) }) } });
    const paid = (await screen.findByRole("heading", { level: 2, name: A("cards.sources") })).closest("section") as HTMLElement;
    expect(within(paid).getAllByRole("tab").map((t) => t.textContent)).toEqual([A("tabs.referrers"), A("tabs.utmSources"), A("tabs.utmMediums"), A("tabs.utmCampaigns")]);
  });

  it("gives the page and device lists their tabs, and the country list none", async () => {
    await renderAnalytics();
    const section = async (card: string) => (await screen.findByRole("heading", { level: 2, name: A(`cards.${card}`) })).closest("section") as HTMLElement;

    expect(within(await section("pages")).getAllByRole("tab").map((t) => t.textContent)).toEqual([A("tabs.pages"), A("tabs.routes")]);
    expect(within(await section("devices")).getAllByRole("tab").map((t) => t.textContent)).toEqual([A("tabs.devices"), A("tabs.browsers"), A("tabs.systems")]);
    expect(within(await section("locations")).queryAllByRole("tab")).toHaveLength(0);
  });
});

describe("ANA-14E when there is no report", () => {
  const card = () => screen.findByRole("heading", { level: 2, name: /.+/, hidden: false });

  it("explains how to connect Vercel when it is not set up, listing what is missing", async () => {
    await renderAnalytics({ answer: { status: "not_configured", missing: ["WEB_ANALYTICS_TOKEN", "WEB_ANALYTICS_PROJECT_ID"] } });

    expect(await screen.findByRole("heading", { level: 2, name: A("status.notConfigured.title") })).toBeInTheDocument();
    expect(screen.getByText("WEB_ANALYTICS_TOKEN, WEB_ANALYTICS_PROJECT_ID")).toBeInTheDocument();
    expect(screen.queryByText(A("kpi.visitors.label"))).not.toBeInTheDocument();
    void card;
  });

  it.each([
    ["auth", { status: "error", reason: "auth" } as const],
    ["plan", { status: "error", reason: "plan" } as const],
    ["unavailable", { status: "error", reason: "unavailable" } as const],
  ])("says what went wrong, by reason (%s), with a retry that asks again", async (reason, answer) => {
    const { calls } = await renderAnalytics({ answer });

    expect(await screen.findByRole("heading", { level: 2, name: A(`status.error.${reason}.title`) })).toBeInTheDocument();
    expect(screen.getByText(A(`status.error.${reason}.message`))).toBeInTheDocument();
    expect(screen.queryByText(A("kpi.visitors.label"))).not.toBeInTheDocument();
    const asks = calls.asks.length;

    await userEvent.click(screen.getByRole("button", { name: A("status.retry") }));

    await waitFor(() => expect(calls.asks.length).toBeGreaterThan(asks));
  });

  it("says it is for admins only when the route refuses the account (403)", async () => {
    await renderAnalytics({ as: "user", answer: 403 });

    expect(await screen.findByRole("heading", { level: 2, name: A("status.error.forbidden.title") })).toBeInTheDocument();
    expect(screen.getByText(A("status.error.forbidden.message"))).toBeInTheDocument();
  });

  it("says the request failed for any other failure before there is data (a network error, a 500)", async () => {
    await renderAnalytics({ answer: 500 });

    expect(await screen.findByRole("heading", { level: 2, name: A("status.error.network.title") })).toBeInTheDocument();
    expect(screen.getByText(A("status.error.network.message"))).toBeInTheDocument();
  });

  it("keeps showing the last report, not an error, when a later refresh fails", async () => {
    let calls = 0;
    const { calls: seen } = await renderAnalytics({ answer: () => (++calls === 1 ? { status: "ok", report: report() } : 500) });
    await screen.findByText("200");

    await userEvent.click(screen.getByRole("button", { name: A("actions.refresh") }));
    await waitFor(() => expect(seen.asks.length).toBeGreaterThan(1));

    expect(screen.queryByRole("heading", { level: 2, name: A("status.error.network.title") })).not.toBeInTheDocument();
    expect(within(tile(A("kpi.visitors.label"))).getByText("200")).toBeInTheDocument();
  });
});
