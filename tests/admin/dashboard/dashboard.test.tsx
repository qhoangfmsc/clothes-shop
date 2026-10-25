import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { API } from "@/tests/_support/api";
import { dateText, msg } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { adminOrder, product, renderDashboard, report, user } from "./dashboard-kit";

/* The admin home page: KPI cards, recent orders, orders by state, traffic summary (specs/admin/dashboard.md, flows ADB-1 to ADB-5E). */

const D = (key: string) => msg(`admin.dashboard.${key}`);
const card = (label: string) => screen.getByText(label, { selector: "p" }).closest("div.relative") as HTMLElement;
const orders = (list: Array<[string, string, number]>) => list.map(([id, status, totalVnd]) => adminOrder({ id, status: status as never, totalVnd }));

describe("ADB-1 the KPI cards", () => {
  it("asks for up to 200 of each of the products, orders and users", async () => {
    const { calls } = await renderDashboard();
    await screen.findByText(D("kpi.revenue.label"));

    await waitFor(() => expect(calls.users.length).toBeGreaterThan(0));
    for (const asked of [calls.orders, calls.products, calls.users]) expect(asked[0].get("limit")).toBe("200");
  });

  it("adds up the totals of the orders that are not cancelled, in dong, and counts them", async () => {
    await renderDashboard({ orders: { data: orders([["o-1", "completed", 100_000], ["o-2", "pending", 250_000], ["o-3", "cancelled", 900_000]]), total: 3 } });

    const revenue = card(D("kpi.revenue.label"));

    await waitFor(() => expect(within(revenue).getByText("350.000 VNĐ")).toBeInTheDocument());
    expect(within(revenue).getByText("từ 2 đơn hàng hoàn tất")).toBeInTheDocument();
  });

  it("counts the pending orders, and highlights the card with a pulsing dot only when there are some", async () => {
    const busy = await renderDashboard({ orders: { data: orders([["o-1", "pending", 1], ["o-2", "pending", 1], ["o-3", "shipping", 1]]), total: 3 } });
    const processing = card(D("kpi.processing.label"));
    await waitFor(() => expect(within(processing).getByText("2")).toBeInTheDocument());
    expect(within(processing).getByText(D("kpi.processing.sub"))).toBeInTheDocument();
    expect(processing.querySelector(".animate-pulse")).not.toBeNull();
    expect(processing.style.borderWidth).toBe("1.5px");
    busy.unmount();

    await renderDashboard({ orders: { data: orders([["o-1", "shipping", 1]]), total: 1 } });
    const calm = card(D("kpi.processing.label"));
    await waitFor(() => expect(within(calm).getByText("0")).toBeInTheDocument());
    expect(calm.querySelector(".animate-pulse")).toBeNull();
    expect(calm.style.borderWidth).toBe("1px");
  });

  it("shows the total number of orders from the BE, not the number it loaded, and how many are completed", async () => {
    await renderDashboard({ orders: { data: orders([["o-1", "completed", 1], ["o-2", "completed", 1], ["o-3", "pending", 1]]), total: 450 } });

    const box = card(D("kpi.orders.label"));

    await waitFor(() => expect(within(box).getByText("450")).toBeInTheDocument());
    expect(within(box).getByText("2 hoàn tất")).toBeInTheDocument();
  });

  it("shows the total number of products from the BE and how many are on sale or not", async () => {
    await renderDashboard({ products: { data: [product({ id: "a", status: "active" }), product({ id: "b", status: "active" }), product({ id: "c", status: "draft" as never })], total: 10 } });

    const box = card(D("kpi.products.label"));

    await waitFor(() => expect(within(box).getByText("10")).toBeInTheDocument());
    expect(within(box).getByText("2 đang bán · 8 ngừng bán")).toBeInTheDocument();
  });

  it("shows the number of users from the BE", async () => {
    await renderDashboard({ users: { total: 42 } });

    const box = card(D("kpi.users.label"));

    await waitFor(() => expect(within(box).getByText("42")).toBeInTheDocument());
    expect(within(box).getByText(D("kpi.users.sub"))).toBeInTheDocument();
  });

  it("shows dashes instead of numbers, and no explanation, while the data is on its way", async () => {
    await renderDashboard({ ordersDelayMs: 400, orders: { data: orders([["o-1", "completed", 100_000]]), total: 7 } });

    expect(card(D("kpi.revenue.label")).textContent).toContain("—");
    expect(within(card(D("kpi.orders.label"))).getByText("—")).toBeInTheDocument();
    expect(card(D("kpi.orders.label")).querySelectorAll("p")).toHaveLength(2);
    expect(card(D("kpi.products.label")).querySelectorAll("p")).toHaveLength(2);
    expect(card(D("kpi.processing.label")).querySelector(".animate-pulse")).toBeNull();
    await waitFor(() => expect(within(card(D("kpi.orders.label"))).getByText("7")).toBeInTheDocument());
  });

  it("reads in English in English", async () => {
    await renderDashboard({ locale: "en", orders: { data: orders([["o-1", "completed", 100_000]]), total: 1 } });

    expect(await screen.findByText(msg("admin.dashboard.kpi.revenue.label", "en"))).toBeInTheDocument();
    await waitFor(() => expect(within(card(msg("admin.dashboard.kpi.revenue.label", "en"))).getByText("from 1 completed order")).toBeInTheDocument());
  });
});

describe("ADB-2 the recent orders", () => {
  it("lists the first eight orders with their number, state, number of items, total and day", async () => {
    const list = Array.from({ length: 9 }, (_, i) => adminOrder({ id: `o-${i + 1}`, status: "shipping", totalVnd: 100_000 + i, items: i === 0 ? undefined : adminOrder().items }));
    await renderDashboard({ orders: { data: list, total: 9 } });

    await screen.findByText("#o-1");

    expect(screen.queryByText("#o-9")).not.toBeInTheDocument();
    expect(screen.getByText("#o-8")).toBeInTheDocument();
    const row = screen.getByText("#o-2").closest("tr") as HTMLElement;
    expect(within(row).getByText(msg("common.orderStatus.shipping"))).toBeInTheDocument();
    expect(within(row).getByText("1", { selector: "span.text-xs" })).toBeInTheDocument();
    expect(within(row).getByText("100.001 VNĐ")).toBeInTheDocument();
    expect(within(row).getByText(dateText("2026-03-05T05:00:00.000Z", "short"))).toBeInTheDocument();
    expect(within(screen.getByText("#o-1").closest("tr") as HTMLElement).getByText("0", { selector: "span.text-xs" })).toBeInTheDocument();
  });

  it("colours each state its own way", async () => {
    const states = ["pending", "confirmed", "shipping", "delivered", "completed", "cancelled"];
    await renderDashboard({ orders: { data: states.map((status, i) => adminOrder({ id: `o-${i + 1}`, status: status as never })), total: 6 } });
    await screen.findByText("#o-1");
    const pill = (id: string, status: string) => within(screen.getByText(`#${id}`).closest("tr") as HTMLElement).getByText(msg(`common.orderStatus.${status}`), { selector: "span.rounded-\\[var\\(--radius-pill\\)\\]" });

    expect(pill("o-1", "pending").className).toContain("color-honey");
    expect(pill("o-2", "confirmed").className).toContain("accent-blue");
    expect(pill("o-3", "shipping").className).toContain("accent-lavender");
    expect(pill("o-4", "delivered").className).toContain("accent-sage");
    expect(pill("o-5", "completed").className).toContain("accent-primary");
    expect(pill("o-6", "cancelled").className).toContain("accent-rose");
  });

  it("hides the item and day columns on phones", async () => {
    await renderDashboard({ orders: { data: orders([["o-1", "pending", 1]]), total: 1 } });
    await screen.findByText("#o-1");

    expect(screen.getByRole("columnheader", { name: D("recentOrders.columns.items"), hidden: true }).className).toContain("hidden sm:table-cell");
    expect(screen.getByRole("columnheader", { name: D("recentOrders.columns.date"), hidden: true }).className).toContain("hidden sm:table-cell");
    expect(screen.getByRole("columnheader", { name: D("recentOrders.columns.total"), hidden: true }).className).not.toContain("hidden");
  });

  it("says there are no orders yet, and has no search box", async () => {
    await renderDashboard({ orders: { data: [], total: 0 } });

    expect(await screen.findByText(D("recentOrders.empty"))).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(msg("admin.components.dataTable.search.placeholder"))).not.toBeInTheDocument();
  });
});

describe("ADB-3 the orders by state", () => {
  const rowOf = (status: string) => screen.getByText(msg(`common.orderStatus.${status}`), { selector: "span.text-sm" }).closest("div.justify-between") as HTMLElement;

  it("shows the six states with their counts and a bar as wide as their share of all orders (the BE's total)", async () => {
    await renderDashboard({ orders: { data: orders([["o-1", "pending", 1], ["o-2", "pending", 1], ["o-3", "completed", 1]]), total: 4 } });
    await waitFor(() => expect(within(rowOf("pending")).getByText("2")).toBeInTheDocument());

    expect(["pending", "confirmed", "shipping", "delivered", "completed", "cancelled"].map((s) => within(rowOf(s)).getAllByText(/^\d+$/).at(-1)?.textContent)).toEqual(["2", "0", "0", "0", "1", "0"]);
    expect((rowOf("pending").querySelector("div.h-full") as HTMLElement).style.width).toBe("50%");
    expect((rowOf("completed").querySelector("div.h-full") as HTMLElement).style.width).toBe("25%");
    expect((rowOf("confirmed").querySelector("div.h-full") as HTMLElement).style.width).toBe("0%");
  });

  it("lists the states in the order an order goes through them", async () => {
    await renderDashboard({ orders: { data: orders([["o-1", "pending", 1]]), total: 1 } });
    await waitFor(() => expect(screen.queryByText(D("orderStatus.loading"))).not.toBeInTheDocument());

    const labels = Array.from(rowOf("pending").parentElement!.querySelectorAll("span.text-sm.text-\\[var\\(--text-primary\\)\\]")).map((e) => e.textContent);

    expect(labels).toEqual(["pending", "confirmed", "shipping", "delivered", "completed", "cancelled"].map((s) => msg(`common.orderStatus.${s}`)));
  });

  it("rounds the share to a whole number and shows empty bars when there are no orders", async () => {
    const some = await renderDashboard({ orders: { data: orders([["o-1", "pending", 1]]), total: 3 } });
    await waitFor(() => expect(within(rowOf("pending")).getByText("1")).toBeInTheDocument());
    expect((rowOf("pending").querySelector("div.h-full") as HTMLElement).style.width).toBe("33%");
    some.unmount();

    await renderDashboard({ orders: { data: [], total: 0 } });
    await waitFor(() => expect(screen.queryByText(D("orderStatus.loading"))).not.toBeInTheDocument());
    expect((rowOf("pending").querySelector("div.h-full") as HTMLElement).style.width).toBe("0%");
  });

  it("colours each state's bar and number", async () => {
    await renderDashboard({ orders: { data: orders([["o-1", "pending", 1]]), total: 1 } });
    await waitFor(() => expect(screen.queryByText(D("orderStatus.loading"))).not.toBeInTheDocument());

    expect((rowOf("pending").querySelector("div.h-full") as HTMLElement).style.background).toContain("--color-honey");
    expect((rowOf("cancelled").querySelector("div.h-full") as HTMLElement).style.background).toContain("--accent-rose");
  });

  it("says it is loading while the orders are on their way", async () => {
    await renderDashboard({ ordersDelayMs: 400 });

    const panel = (await screen.findByRole("heading", { level: 2, name: D("orderStatus.title") })).parentElement!.parentElement as HTMLElement;
    expect(within(panel).getByText(D("orderStatus.loading"))).toBeInTheDocument();
    await waitFor(() => expect(within(panel).queryByText(D("orderStatus.loading"))).not.toBeInTheDocument());
  });
});

describe("ADB-4 the traffic summary", () => {
  const box = () => screen.getByRole("heading", { level: 2, name: D("analytics.title") }).closest("section") as HTMLElement;
  const metric = (label: string) => within(box()).getByText(label).closest("div") as HTMLElement;

  it("links to the full analytics page", async () => {
    await renderDashboard();

    const link = await screen.findByRole("link", { name: new RegExp(D("analytics.viewDetails")) });

    expect(link).toHaveAttribute("href", "/admin/analytics");
  });

  it("asks for the last seven days, summary only", async () => {
    const { calls } = await renderDashboard();
    await screen.findByText(D("analytics.title"));

    await waitFor(() => expect(calls.analytics.length).toBeGreaterThan(0));
    expect(Object.fromEntries(calls.analytics[0])).toEqual({ range: "7d", view: "summary" });
  });

  it("shows visitors and page views with their change from the week before, and 'last 7 days' where there is nothing to compare", async () => {
    await renderDashboard({ analytics: { status: "ok", report: report({ totals: { visitors: 1200, pageviews: 3400 }, previousTotals: { visitors: 1000, pageviews: 0 } }) } });

    await waitFor(() => expect(within(metric(D("analytics.visitors"))).getByText("1.200")).toBeInTheDocument());
    expect(within(metric(D("analytics.visitors"))).getByText("+20% so với 7 ngày trước")).toBeInTheDocument();
    expect(within(metric(D("analytics.pageviews"))).getByText("3.400")).toBeInTheDocument();
    expect(within(metric(D("analytics.pageviews"))).getByText(D("analytics.last7Days"))).toBeInTheDocument();
  });

  it("shows a fall with a minus sign, to one decimal, and no sign for no change", async () => {
    await renderDashboard({ analytics: { status: "ok", report: report({ totals: { visitors: 90, pageviews: 100 }, previousTotals: { visitors: 100, pageviews: 100 } }) } });

    await waitFor(() => expect(within(metric(D("analytics.visitors"))).getByText("-10% so với 7 ngày trước")).toBeInTheDocument());
    expect(within(metric(D("analytics.pageviews"))).getByText("0% so với 7 ngày trước")).toBeInTheDocument();
  });

  it("works out the conversion from the orders placed since the start of the window that are not cancelled, divided by visitors", async () => {
    const list = [
      adminOrder({ id: "o-1", status: "completed", createdAt: "2026-03-02T10:00:00.000Z" }),
      adminOrder({ id: "o-2", status: "pending", createdAt: "2026-03-01T00:00:00.000Z" }),
      adminOrder({ id: "o-3", status: "cancelled", createdAt: "2026-03-03T10:00:00.000Z" }),
      adminOrder({ id: "o-4", status: "completed", createdAt: "2026-02-20T10:00:00.000Z" }),
    ];
    await renderDashboard({ orders: { data: list, total: 4 }, analytics: { status: "ok", report: report({ totals: { visitors: 200, pageviews: 600 } }) } });

    await waitFor(() => expect(within(metric(D("analytics.conversion"))).getByText("1%")).toBeInTheDocument());
    expect(within(metric(D("analytics.conversion"))).getByText("2 đơn hàng ÷ khách truy cập, 7 ngày qua")).toBeInTheDocument();
  });

  it("shows a dash for the conversion when nobody visited", async () => {
    await renderDashboard({ analytics: { status: "ok", report: report({ totals: { visitors: 0, pageviews: 0 } }) } });

    await waitFor(() => expect(within(metric(D("analytics.visitors"))).getByText("0")).toBeInTheDocument());
    expect(within(metric(D("analytics.conversion"))).getByText("—")).toBeInTheDocument();
  });

  it("draws the visitors of each day as a line, and none for fewer than two days", async () => {
    const line = await renderDashboard({ analytics: { status: "ok", report: report() } });
    const svg = await screen.findByRole("img", { name: D("analytics.sparkline") });
    expect(svg.querySelector("polyline")!.getAttribute("points")).toBe("0,18 50,2 100,10");
    line.unmount();

    await renderDashboard({ analytics: { status: "ok", report: report({ series: [{ timestamp: "2026-03-01T00:00:00.000Z", visitors: 5, pageviews: 5 }] }) } });
    await waitFor(() => expect(screen.getByText("200")).toBeInTheDocument());
    expect(screen.queryByRole("img", { name: D("analytics.sparkline") })).not.toBeInTheDocument();
  });

  it("shows a flat line, not a broken one, when every day had no visitors", async () => {
    await renderDashboard({ analytics: { status: "ok", report: report({ totals: { visitors: 0, pageviews: 0 }, series: [{ timestamp: "a", visitors: 0, pageviews: 0 }, { timestamp: "b", visitors: 0, pageviews: 0 }] }) } });

    const svg = await screen.findByRole("img", { name: D("analytics.sparkline") });

    expect(svg.querySelector("polyline")!.getAttribute("points")).toBe("0,26 100,26");
  });

  it("shows dashes while the figures are on their way", async () => {
    await renderDashboard({ analytics: { status: "ok", report: report() }, ordersDelayMs: 400 });

    expect(within(await screen.findByRole("heading", { level: 2, name: D("analytics.title") }).then(() => box())).getAllByText("—").length).toBeGreaterThanOrEqual(3);
    await waitFor(() => expect(within(metric(D("analytics.visitors"))).getByText("200")).toBeInTheDocument());
  });

  it("keeps every figure as a dash until the orders have arrived too, even when the traffic report already has", async () => {
    const { calls } = await renderDashboard({ ordersDelayMs: 1500, analytics: { status: "ok", report: report() } });
    await waitFor(() => expect(calls.analytics).toHaveLength(1));

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(within(metric(D("analytics.visitors"))).getByText("—")).toBeInTheDocument();
    expect(within(metric(D("analytics.conversion"))).getByText("—")).toBeInTheDocument();
    expect(within(metric(D("analytics.visitors"))).queryByText("200")).not.toBeInTheDocument();
    await waitFor(() => expect(within(metric(D("analytics.visitors"))).getByText("200")).toBeInTheDocument());
  });

  it("shows dashes, not 'not available', while the traffic report is on its way and the orders have arrived", async () => {
    const { calls } = await renderDashboard({ analyticsDelayMs: 600, orders: { data: orders([["o-1", "pending", 1]]), total: 1 }, analytics: { status: "ok", report: report() } });
    await screen.findByText("#o-1");

    expect(screen.queryByText(D("analytics.unavailable"))).not.toBeInTheDocument();
    expect(screen.queryByText(D("analytics.notConfigured"))).not.toBeInTheDocument();
    expect(within(metric(D("analytics.visitors"))).getByText("—")).toBeInTheDocument();
    await waitFor(() => expect(within(metric(D("analytics.visitors"))).getByText("200")).toBeInTheDocument());
    expect(calls.analytics).toHaveLength(1);
  });

  it("tells the admin to connect analytics when it is not set up, listing nothing else", async () => {
    await renderDashboard({ analytics: { status: "not_configured", missing: ["WEB_ANALYTICS_TOKEN"] } });

    expect(await screen.findByText(D("analytics.notConfigured"))).toBeInTheDocument();
    expect(screen.queryByText(D("analytics.visitors"))).not.toBeInTheDocument();
  });

  it.each([
    ["Vercel refused", { status: "error", reason: "auth" } as const],
    ["the route failed", 500],
  ])("says the figures are not available when %s", async (_label, analytics) => {
    await renderDashboard({ analytics });

    expect(await screen.findByText(D("analytics.unavailable"))).toBeInTheDocument();
    expect(screen.queryByText(D("analytics.visitors"))).not.toBeInTheDocument();
  });
});

describe("ADB-5E when the BE cannot answer", () => {
  const alert = () => screen.findByRole("alert");

  it("says the numbers could not be loaded, with a retry, instead of showing zeros", async () => {
    await renderDashboard({ orders: 500, products: 500, users: 500 });

    const notice = await alert();

    expect(within(notice).getByText(D("error.message"))).toBeInTheDocument();
    expect(card(D("kpi.orders.label")).textContent).not.toContain("0");
    expect(within(card(D("kpi.orders.label"))).getByText("—")).toBeInTheDocument();
    expect(within(card(D("kpi.products.label"))).getByText("—")).toBeInTheDocument();
    expect(within(card(D("kpi.users.label"))).getByText("—")).toBeInTheDocument();
    expect(within(card(D("kpi.revenue.label"))).getByText("—")).toBeInTheDocument();
  });

  it("raises the alert when only the products fail", async () => {
    await renderDashboard({ products: 500, orders: { data: orders([["o-1", "pending", 1]]), total: 1 } });

    expect(within(await alert()).getByText(D("error.message"))).toBeInTheDocument();
    expect(within(card(D("kpi.products.label"))).getByText("—")).toBeInTheDocument();
    await waitFor(() => expect(within(card(D("kpi.orders.label"))).getByText("1")).toBeInTheDocument());
  });

  it("shows dashes only for what failed: the users, while orders and products load", async () => {
    await renderDashboard({ users: 500, orders: { data: orders([["o-1", "pending", 1]]), total: 3 } });

    await alert();

    expect(within(card(D("kpi.users.label"))).getByText("—")).toBeInTheDocument();
    await waitFor(() => expect(within(card(D("kpi.orders.label"))).getByText("3")).toBeInTheDocument());
  });

  it("does not hide a failed orders list behind 'no orders yet', nor draw empty bars", async () => {
    await renderDashboard({ orders: 500 });

    await alert();

    expect(screen.queryByText(D("recentOrders.empty"))).not.toBeInTheDocument();
    expect(screen.queryByText(D("orderStatus.loading"))).not.toBeInTheDocument();
    expect(screen.queryByText(msg("common.orderStatus.pending"), { selector: "span.text-sm" })).not.toBeInTheDocument();
  });

  it("asks everything again on Retry and shows the numbers once it works", async () => {
    await renderDashboard({ orders: 500, products: { data: [], total: 5 }, users: { total: 7 } });
    await alert();
    let again = 0;
    server.use(http.get(`${API}/api/admin/orders`, () => {
      again += 1;
      return HttpResponse.json({ data: orders([["o-1", "pending", 1]]), total: 1, page: 1, limit: 200 });
    }));

    await userEvent.click(screen.getByRole("button", { name: D("error.retry") }));

    await waitFor(() => expect(again).toBeGreaterThan(0));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(within(card(D("kpi.orders.label"))).getByText("1")).toBeInTheDocument();
  });

  it("shows no alert when all is well", async () => {
    await renderDashboard({ orders: { data: orders([["o-1", "pending", 1]]), total: 1 } });
    await screen.findByText("#o-1");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    ["a visitor", "guest"],
    ["a shopper", "user"],
  ] as const)("shows %s the alert and no numbers", async (_label, as) => {
    await renderDashboard({ as, orders: as === "guest" ? 401 : 403, products: as === "guest" ? 401 : 403, users: as === "guest" ? 401 : 403 });

    await alert();

    expect(within(card(D("kpi.orders.label"))).getByText("—")).toBeInTheDocument();
  });
});
