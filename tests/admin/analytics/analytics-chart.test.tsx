import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrafficChart from "@/src/app/[locale]/(admin)/admin/analytics/_components/TrafficChart";
import { renderApp } from "@/tests/_support/render";

/* What the traffic chart tells the library to draw: the axis labels and the hover box (specs/admin/analytics.md, flow ANA-19B).
   The real chart cannot be measured in jsdom, so the pieces are replaced by stand-ins that call the functions the chart hands them. */

type Props = Record<string, unknown> & { children?: React.ReactNode };
const SERIES = [
  { timestamp: "2026-03-01T05:00:00.000Z", visitors: 10, pageviews: 20 },
  { timestamp: "2026-03-02T05:00:00.000Z", visitors: 1500, pageviews: 3000 },
];

vi.mock("recharts", () => {
  const Box = ({ children }: Props) => <div>{children}</div>;
  return {
    ResponsiveContainer: Box,
    AreaChart: ({ data, children }: Props) => <div data-testid="area" data-points={(data as unknown[]).length}>{children}</div>,
    CartesianGrid: () => null,
    XAxis: ({ tickFormatter, dataKey }: Props) => <span data-testid="x-axis" data-key={dataKey as string}>{(tickFormatter as (v: string) => string)("2026-03-01T05:00:00.000Z")}</span>,
    YAxis: ({ tickFormatter }: Props) => <span data-testid="y-axis">{(tickFormatter as (v: number) => string)(12_000)}</span>,
    Tooltip: ({ content }: { content: (p: { active: boolean; payload?: Array<{ payload: unknown }> }) => React.ReactNode }) => (
      <div>
        <div data-testid="hover">{content({ active: true, payload: [{ payload: SERIES[1] }] })}</div>
        <div data-testid="idle">{content({ active: false, payload: [{ payload: SERIES[1] }] })}</div>
        <div data-testid="empty">{content({ active: true, payload: [] })}</div>
      </div>
    ),
    Area: ({ dataKey, stroke }: Props) => <span data-testid={`area-${dataKey as string}`} data-stroke={stroke as string} />,
    Line: ({ dataKey, stroke }: Props) => <span data-testid={`line-${dataKey as string}`} data-stroke={stroke as string} />,
  };
});

describe("ANA-19B what the chart draws", () => {
  it("draws the visitors as a filled area and the page views as a line, in their colours, from the points it was given", async () => {
    await renderApp(<TrafficChart series={SERIES} granularity="day" />);

    expect(screen.getByTestId("area")).toHaveAttribute("data-points", "2");
    expect(screen.getByTestId("area-visitors")).toHaveAttribute("data-stroke", "#B08A3E");
    expect(screen.getByTestId("line-pageviews")).toHaveAttribute("data-stroke", "#2D6CA2");
    expect(screen.getByTestId("x-axis")).toHaveAttribute("data-key", "timestamp");
  });

  it("writes the time axis as day and month for days, and as the hour and minute for hours", async () => {
    const days = await renderApp(<TrafficChart series={SERIES} granularity="day" />);
    expect(screen.getByTestId("x-axis")).toHaveTextContent("1 thg 3");
    days.unmount();

    await renderApp(<TrafficChart series={SERIES} granularity="hour" />);
    expect(screen.getByTestId("x-axis")).toHaveTextContent("12:00");
  });

  it("writes the count axis in short form", async () => {
    await renderApp(<TrafficChart series={SERIES} granularity="day" />);

    expect(screen.getByTestId("y-axis")).toHaveTextContent("12 N");
  });

  it("shows, on hover, the full time and both figures with their names", async () => {
    await renderApp(<TrafficChart series={SERIES} granularity="day" />);
    const box = screen.getByTestId("hover");

    expect(within(box).getByText("2 thg 3, 2026")).toBeInTheDocument();
    expect(within(box).getByText("1.500")).toBeInTheDocument();
    expect(within(box).getByText("3.000")).toBeInTheDocument();
    expect(within(box).getByText("Khách truy cập")).toBeInTheDocument();
    expect(within(box).getByText("Lượt xem trang")).toBeInTheDocument();
  });

  it("shows the hour and the date in the hover box when the points are hours", async () => {
    await renderApp(<TrafficChart series={SERIES} granularity="hour" />);

    expect(within(screen.getByTestId("hover")).getByText("12:00 2 thg 3")).toBeInTheDocument();
  });

  it("shows nothing when nothing is hovered", async () => {
    await renderApp(<TrafficChart series={SERIES} granularity="day" />);

    expect(screen.getByTestId("idle")).toBeEmptyDOMElement();
    expect(screen.getByTestId("empty")).toBeEmptyDOMElement();
  });
});
