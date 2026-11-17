import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import BreakdownCard from "@/src/app/[locale]/(admin)/admin/analytics/_components/BreakdownCard";
import FunnelCard from "@/src/app/[locale]/(admin)/admin/analytics/_components/FunnelCard";
import StatTile from "@/src/app/[locale]/(admin)/admin/analytics/_components/StatTile";
import StatusCard from "@/src/app/[locale]/(admin)/admin/analytics/_components/StatusCard";
import TrafficChart from "@/src/app/[locale]/(admin)/admin/analytics/_components/TrafficChart";
import { SERIES_COLORS } from "@/src/app/[locale]/(admin)/admin/analytics/_common/constants";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";
import { breakdowns, report } from "./analytics-kit";

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactElement }) => <div data-testid="chart-box" style={{ width: 600, height: 280 }}>{children}</div> };
});

/* The pieces of the analytics page, each on its own (specs/admin/analytics.md, flows ANA-15 to ANA-19E). */

const A = (key: string) => msg(`admin.analytics.${key}`);

describe("ANA-15 a key figure", () => {
  const tile = (props: Partial<React.ComponentProps<typeof StatTile>> = {}) => renderApp(<StatTile label="Visitors" value="1.200" hint="Distinct people" change={null} loading={false} {...props} />);

  it("shows the label, the figure and its hint when there is nothing to compare", async () => {
    await tile();

    expect(screen.getByText("Visitors")).toBeInTheDocument();
    expect(screen.getByText("1.200")).toBeInTheDocument();
    expect(screen.getByText("Distinct people")).toBeInTheDocument();
    expect(screen.queryByText(A("kpi.vsPrevious"))).not.toBeInTheDocument();
  });

  it("shows a rise as a percent with an arrow up, in the calm colour, and says 'against the last period' instead of the hint", async () => {
    await tile({ change: 0.256 });

    const mark = screen.getByLabelText("Tăng 25,6% so với kỳ trước");
    expect(mark).toHaveTextContent("25,6%");
    expect(mark.getAttribute("style")).toContain("--text-secondary");
    expect(mark.querySelector("svg.lucide-trending-up")).not.toBeNull();
    expect(screen.getByText(A("kpi.vsPrevious"))).toBeInTheDocument();
    expect(screen.queryByText("Distinct people")).not.toBeInTheDocument();
  });

  it("shows a fall without a minus sign, with an arrow down, in rose", async () => {
    await tile({ change: -0.5 });

    const mark = screen.getByLabelText("Giảm 50% so với kỳ trước");
    expect(mark).toHaveTextContent("50%");
    expect(mark.textContent).not.toContain("-");
    expect(mark.getAttribute("style")).toContain("--accent-rose");
    expect(mark.querySelector("svg.lucide-trending-down")).not.toBeNull();
  });

  it("counts no change as a rise", async () => {
    await tile({ change: 0 });

    expect(screen.getByLabelText("Tăng 0% so với kỳ trước")).toBeInTheDocument();
  });

  it("shows a dash and the hint, with no change, while loading", async () => {
    await tile({ change: 0.5, loading: true });

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("1.200")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/so với kỳ trước/)).not.toBeInTheDocument();
    expect(screen.getByText("Distinct people")).toBeInTheDocument();
  });
});

describe("ANA-16 the funnel", () => {
  const steps = report().funnel!;

  it("lists the steps in order with how many times each happened, and the share of the step before", async () => {
    await renderApp(<FunnelCard steps={steps} />);
    const items = screen.getAllByRole("listitem");

    expect(items.map((li) => li.querySelector("span.text-\\[var\\(--text-primary\\)\\]")?.textContent)).toEqual(["Xem sản phẩm", "Thêm vào giỏ", "Bắt đầu thanh toán", "Đặt hàng"]);
    expect(items.map((li) => li.querySelector("strong")?.textContent)).toEqual(["400", "100", "50", "20"]);
    expect(within(items[0]).queryByText(/so với bước trước/)).not.toBeInTheDocument();
    expect(within(items[1]).getByText("25% so với bước trước")).toBeInTheDocument();
    expect(within(items[2]).getByText("50% so với bước trước")).toBeInTheDocument();
    expect(within(items[3]).getByText("40% so với bước trước")).toBeInTheDocument();
  });

  it("writes the share of the step before to one decimal", async () => {
    await renderApp(<FunnelCard steps={[{ event: "view_product", count: 60, visitors: 6 }, { event: "add_to_cart", count: 20, visitors: 5 }, { event: "begin_checkout", count: 10, visitors: 5 }, { event: "purchase", count: 5, visitors: 5 }]} />);

    expect(within(screen.getAllByRole("listitem")[1]).getByText("33,3% so với bước trước")).toBeInTheDocument();
  });

  it("says how many of the product views ended in an order", async () => {
    await renderApp(<FunnelCard steps={steps} />);

    expect(screen.getByText("5% lượt xem sản phẩm dẫn đến mua hàng")).toBeInTheDocument();
  });

  it("draws each bar as wide as its share of the first step, never wider than the whole", async () => {
    await renderApp(<FunnelCard steps={[{ event: "view_product", count: 10, visitors: 5 }, { event: "add_to_cart", count: 20, visitors: 5 }, { event: "begin_checkout", count: 5, visitors: 5 }, { event: "purchase", count: 0, visitors: 0 }]} />);

    const widths = screen.getAllByRole("listitem").map((li) => (li.querySelector("div.h-full") as HTMLElement).style.width);

    expect(widths).toEqual(["100%", "100%", "50%", "0%"]);
    expect((screen.getAllByRole("listitem")[0].querySelector("div.h-full") as HTMLElement).style.background).toContain("rgb(176, 138, 62)");
  });

  it("shows no share for a step after a step nobody reached", async () => {
    await renderApp(<FunnelCard steps={[{ event: "view_product", count: 10, visitors: 5 }, { event: "add_to_cart", count: 0, visitors: 0 }, { event: "begin_checkout", count: 3, visitors: 3 }, { event: "purchase", count: 1, visitors: 1 }]} />);

    const items = screen.getAllByRole("listitem");
    expect(within(items[1]).getByText("0% so với bước trước")).toBeInTheDocument();
    expect(within(items[2]).queryByText(/so với bước trước/)).not.toBeInTheDocument();
  });

  it("says nothing was recorded, with no steps and no overall rate, when the first step is zero", async () => {
    await renderApp(<FunnelCard steps={steps.map((s) => ({ ...s, count: 0 }))} />);

    expect(screen.getByText(A("funnel.empty"))).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.queryByText(/dẫn đến mua hàng/)).not.toBeInTheDocument();
  });

  it("copes with an empty list of steps", async () => {
    await renderApp(<FunnelCard steps={[]} />);

    expect(screen.getByText(A("funnel.empty"))).toBeInTheDocument();
  });
});

describe("ANA-17 a ranked list", () => {
  const card = (name: "pages" | "sources" | "locations" | "devices", tabs: React.ComponentProps<typeof BreakdownCard>["tabs"], data = breakdowns(), locale: "vi" | "en" = "vi") =>
    renderApp(<BreakdownCard card={name} tabs={tabs} data={data} />, { locale });

  it("shows the title, the column names, and each row's name, visitors and page views", async () => {
    await card("pages", ["pages", "routes"]);

    expect(screen.getByRole("heading", { level: 2, name: A("cards.pages") })).toBeInTheDocument();
    expect(screen.getByText(A("breakdown.visitors"))).toBeInTheDocument();
    expect(screen.getByText(A("breakdown.pageviews"))).toBeInTheDocument();
    const shop = screen.getByText("/shop").closest("div.relative") as HTMLElement;
    expect(within(shop).getByText("80")).toBeInTheDocument();
    expect(within(shop).getByText("120")).toBeInTheDocument();
  });

  it("draws each row's bar as wide as its share of the busiest row's visitors", async () => {
    await card("pages", ["pages"]);

    const bar = (name: string) => (screen.getByText(name).closest("div.relative")!.querySelector("span[aria-hidden]") as HTMLElement).style.width;
    expect(bar("/shop")).toBe("100%");
    expect(bar("/")).toBe("50%");
  });

  it("has tabs only for more than one list, starts on the first and moves to the one clicked", async () => {
    await card("pages", ["pages", "routes"]);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.getAttribute("aria-selected"))).toEqual(["true", "false"]);
    expect(screen.queryByText("/[locale]/shop")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: A("tabs.routes") }));

    expect(screen.getByText("/[locale]/shop")).toBeInTheDocument();
    expect(screen.queryByText("/shop")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: A("tabs.routes") })).toHaveAttribute("aria-selected", "true");
  });

  it("shows no tabs for a single list", async () => {
    await card("locations", ["countries"]);

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("calls a source with no name direct traffic, and anything else with no name unknown", async () => {
    await card("sources", ["referrers"]);
    expect(screen.getByText(A("breakdown.direct"))).toBeInTheDocument();
    expect(screen.getByText("google.com")).toBeInTheDocument();
  });

  it("writes a country as its flag and its name in the language, and calls an empty one unknown", async () => {
    await card("locations", ["countries"]);

    expect(screen.getByText("🇻🇳 Việt Nam")).toBeInTheDocument();
    expect(screen.getByText(A("breakdown.unknown"))).toBeInTheDocument();
    expect(screen.getByText("🇻🇳 Việt Nam")).toHaveAttribute("title", "🇻🇳 Việt Nam");
  });

  it("writes the country in English in English", async () => {
    await card("locations", ["countries"], breakdowns(), "en");

    expect(screen.getByText("🇻🇳 Vietnam")).toBeInTheDocument();
  });

  it("shows a country code it cannot name as it was sent, without a flag for anything that is not two letters", async () => {
    await card("locations", ["countries"], breakdowns({ countries: [{ key: "zz", visitors: 1, pageviews: 1 }, { key: "Atlantis", visitors: 1, pageviews: 1 }, { key: "1", visitors: 1, pageviews: 1 }] }));

    expect(screen.getByText(/^🇿🇿 /)).toBeInTheDocument();
    expect(screen.getByText("Atlantis").textContent).toBe("Atlantis");
    expect(screen.getByText("1", { selector: "span.truncate" })).toBeInTheDocument();
  });

  it("keeps a row's visitors in bold and its page views in the quiet colour", async () => {
    await card("pages", ["pages"]);
    const row = screen.getByText("/shop").closest("div.relative") as HTMLElement;

    expect(within(row).getByText("80").className).toContain("font-semibold");
    expect(within(row).getByText("120").className).toContain("text-[var(--text-muted)]");
  });

  it("draws the bars in the colour of the visitors line", async () => {
    await card("pages", ["pages"]);

    expect((screen.getByText("/shop").closest("div.relative")!.querySelector("span[aria-hidden]") as HTMLElement).style.background).toContain("rgb(176, 138, 62)");
  });

  it("colours only the chosen tab", async () => {
    await card("pages", ["pages", "routes"]);

    expect(screen.getByRole("tab", { name: A("tabs.pages") }).className).toContain("bg-[var(--accent-primary)]");
    expect(screen.getByRole("tab", { name: A("tabs.routes") }).className).not.toContain("bg-[var(--accent-primary)]");
    await userEvent.click(screen.getByRole("tab", { name: A("tabs.routes") }));
    expect(screen.getByRole("tab", { name: A("tabs.routes") }).className).toContain("bg-[var(--accent-primary)]");
  });

  it("names a kind of device in the language, whatever the capitals, and shows one it has no word for as it came", async () => {
    await card("devices", ["devices"]);

    expect(screen.getByText("Điện thoại")).toBeInTheDocument();
    expect(screen.getByText("weird")).toBeInTheDocument();
    expect(screen.getByText(A("breakdown.unknown"))).toBeInTheDocument();
  });

  it("shows browsers and systems as they came", async () => {
    await card("devices", ["devices", "browsers", "systems"]);

    await userEvent.click(screen.getByRole("tab", { name: A("tabs.browsers") }));
    expect(screen.getByText("Chrome")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: A("tabs.systems") }));
    expect(screen.getByText("iOS")).toBeInTheDocument();
  });

  it("gives each row's full name as a hint", async () => {
    await card("pages", ["pages"]);

    expect(screen.getByText("/shop")).toHaveAttribute("title", "/shop");
  });

  it("says there is no data for an empty list, and that it could not be loaded for a missing one", async () => {
    const empty = await card("pages", ["pages"], breakdowns({ pages: [] }));
    expect(screen.getByText(A("breakdown.empty"))).toBeInTheDocument();
    expect(screen.queryByText(A("breakdown.visitors"))).not.toBeInTheDocument();
    empty.unmount();

    await card("pages", ["pages"], breakdowns({ pages: null }));
    expect(screen.getByText(A("breakdown.unavailable"))).toBeInTheDocument();
  });

  it("shows a list of rows with no visitors with bars of zero width, not broken", async () => {
    await card("pages", ["pages"], breakdowns({ pages: [{ key: "/a", visitors: 0, pageviews: 3 }] }));

    expect((screen.getByText("/a").closest("div.relative")!.querySelector("span[aria-hidden]") as HTMLElement).style.width).toBe("0%");
  });
});

describe("ANA-18E a card instead of the report", () => {
  it("lists the steps to connect Vercel, with a link to create the token and the names of the settings", async () => {
    await renderApp(<StatusCard kind="not_configured" missing={["WEB_ANALYTICS_TOKEN"]} />);

    expect(screen.getByRole("heading", { level: 2, name: A("status.notConfigured.title") })).toBeInTheDocument();
    expect(screen.getByText(A("status.notConfigured.description"))).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    const link = screen.getByRole("link", { name: "access token" });
    expect(link).toHaveAttribute("href", "https://vercel.com/account/tokens");
    expect(link).toHaveAttribute("target", "_blank");
    for (const name of ["WEB_ANALYTICS_TOKEN", "WEB_ANALYTICS_PROJECT_ID", "WEB_ANALYTICS_TEAM_ID", "WEB_ANALYTICS_PLAN"]) expect(screen.getAllByText(name, { selector: "code" }).length).toBeGreaterThan(0);
    expect(screen.getByText(A("status.notConfigured.steps.redeploy"))).toBeInTheDocument();
  });

  it("says which settings are missing, and leaves that line out when none are", async () => {
    const some = await renderApp(<StatusCard kind="not_configured" missing={["WEB_ANALYTICS_TOKEN", "WEB_ANALYTICS_PROJECT_ID"]} />);
    expect(screen.getByText("WEB_ANALYTICS_TOKEN, WEB_ANALYTICS_PROJECT_ID", { selector: "code" })).toBeInTheDocument();
    some.unmount();

    await renderApp(<StatusCard kind="not_configured" missing={[]} />);
    expect(screen.queryByText(/Còn thiếu/)).not.toBeInTheDocument();
  });

  it.each(["auth", "plan", "unavailable", "forbidden", "network"] as const)("tells a %s problem in words with a retry button", async (reason) => {
    const onRetry = vi.fn();
    await renderApp(<StatusCard kind="error" reason={reason} onRetry={onRetry} />);

    expect(screen.getByRole("heading", { level: 2, name: A(`status.error.${reason}.title`) })).toBeInTheDocument();
    expect(screen.getByText(A(`status.error.${reason}.message`))).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: A("status.retry") }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});

describe("ANA-19 the traffic chart", () => {
  const SERIES = [
    { timestamp: "2026-03-01T00:00:00.000Z", visitors: 10, pageviews: 20 },
    { timestamp: "2026-03-02T00:00:00.000Z", visitors: 1500, pageviews: 3000 },
  ];

  it("names the two lines with their colours, and offers the table", async () => {
    await renderApp(<TrafficChart series={SERIES} granularity="day" />);

    const legend = screen.getAllByRole("listitem");
    expect(legend.map((li) => li.textContent)).toEqual([A("chart.series.visitors"), A("chart.series.pageviews")]);
    expect((legend[0].querySelector("span") as HTMLElement).style.background).toContain("rgb(176, 138, 62)");
    expect((legend[1].querySelector("span") as HTMLElement).style.background).toContain("rgb(45, 108, 162)");
    expect(SERIES_COLORS.visitors).toBe("#B08A3E");
    expect(screen.getByRole("button", { name: A("chart.viewTable") })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("img", { name: A("chart.ariaLabel") })).toBeInTheDocument();
  });

  it("switches to a table with a row for each time and back to the chart", async () => {
    await renderApp(<TrafficChart series={SERIES} granularity="day" />);

    await userEvent.click(screen.getByRole("button", { name: A("chart.viewTable") }));

    expect(screen.queryByRole("img", { name: A("chart.ariaLabel") })).not.toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText(A("chart.table.time"))).toBeInTheDocument();
    expect(within(rows[1]).getByText("1 thg 3, 2026")).toBeInTheDocument();
    expect(within(rows[2]).getByText("1.500")).toBeInTheDocument();
    expect(within(rows[2]).getByText("3.000")).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: A("chart.viewChart") });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(toggle);
    expect(screen.getByRole("img", { name: A("chart.ariaLabel") })).toBeInTheDocument();
  });

  it("writes the hours of a day with the hour and minute, and the day with the date when the buckets are hours", async () => {
    await renderApp(<TrafficChart series={[{ timestamp: "2026-03-01T05:00:00.000Z", visitors: 1, pageviews: 2 }]} granularity="hour" />);

    await userEvent.click(screen.getByRole("button", { name: A("chart.viewTable") }));

    expect(screen.getAllByRole("row")[1].querySelector("td")!.textContent).toBe("12:00 1 thg 3");
  });

  it("says nothing was recorded, with neither chart nor table, when there are no page views", async () => {
    await renderApp(<TrafficChart series={SERIES.map((p) => ({ ...p, visitors: 0, pageviews: 0 }))} granularity="day" />);

    expect(screen.getByText(A("chart.empty"))).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: A("chart.ariaLabel") })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: A("chart.viewTable") }));
    expect(screen.getByText(A("chart.empty"))).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("is not empty when only page views were recorded for some of the times", async () => {
    await renderApp(<TrafficChart series={[{ timestamp: "2026-03-01T00:00:00.000Z", visitors: 0, pageviews: 0 }, { timestamp: "2026-03-02T00:00:00.000Z", visitors: 0, pageviews: 1 }]} granularity="day" />);

    expect(screen.queryByText(A("chart.empty"))).not.toBeInTheDocument();
  });

  it("works with the translations of another language", async () => {
    render(
      <NextIntlClientProvider locale="en" messages={(await import("@/tests/_support/messages")).MESSAGES.en}>
        <TrafficChart series={SERIES} granularity="day" />
      </NextIntlClientProvider>
    );

    expect(screen.getByRole("button", { name: msg("admin.analytics.chart.viewTable", "en") })).toBeInTheDocument();
  });
});
