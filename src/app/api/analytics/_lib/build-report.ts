import { FUNNEL_EVENTS } from "@/src/lib/analytics";
import type {
  AnalyticsBreakdownRow,
  AnalyticsBreakdowns,
  AnalyticsCapabilities,
  AnalyticsErrorReason,
  AnalyticsFunnelStep,
  AnalyticsRange,
  AnalyticsReport,
  AnalyticsTotals,
  AnalyticsView,
} from "@/src/types/analytics";
import { fillSeries, resolveWindow, type RangeWindow } from "./range";
import {
  aggregateEvents,
  aggregateVisits,
  countVisits,
  UpstreamError,
  type AggregateRow,
  type VercelCredentials,
} from "./vercel-client";

/* Vercel rejects day/hour queries wider than 62 days ("invalid_group_by"), so the 90-day trend is
   fetched in chunks of at most this many buckets and stitched back together. */
const MAX_BUCKETS_PER_QUERY = 60;

function seriesPeriods(window: RangeWindow) {
  const periods: Array<{ since: Date; until: Date }> = [];
  for (let first = 0; first < window.bucketCount; first += MAX_BUCKETS_PER_QUERY) {
    const start = window.since.getTime() + first * window.bucketMs;
    const end = start + MAX_BUCKETS_PER_QUERY * window.bucketMs - 1;
    periods.push({
      since: new Date(start),
      until: new Date(Math.min(end, window.until.getTime())),
    });
  }
  return periods;
}

const num = (value: unknown) => Number(value ?? 0) || 0;

const toTotals = (data: { pageviews?: number; visitors?: number }): AnalyticsTotals => ({
  pageviews: num(data.pageviews),
  visitors: num(data.visitors),
});

const toBreakdown = (rows: AggregateRow[], dimension: string): AnalyticsBreakdownRow[] =>
  rows.map((row) => ({
    key: String(row[dimension] ?? ""),
    pageviews: num(row.pageviews),
    visitors: num(row.visitors),
  }));

/** Resolves to the value, or `null` when that single query fails: one broken card must not blank the page. */
const orNull = <T>(promise: Promise<T>): Promise<T | null> => promise.catch(() => null);

/** Which of the plan-/config-related failures to tell the admin about. */
export function toErrorReason(error: unknown): AnalyticsErrorReason {
  if (!(error instanceof UpstreamError)) return "unavailable";
  if ([401, 403, 404].includes(error.status)) return "auth";
  if ([402, 410].includes(error.status)) return "plan";
  return "unavailable";
}

async function loadBreakdowns(
  credentials: VercelCredentials,
  window: RangeWindow,
  capabilities: AnalyticsCapabilities
): Promise<AnalyticsBreakdowns> {
  const period = { since: window.since, until: window.until };
  const list = async (dimension: string) => {
    const rows = await orNull(aggregateVisits(credentials, period, dimension));
    return rows && toBreakdown(rows, dimension);
  };
  const utm = (dimension: string) => (capabilities.utm ? list(dimension) : Promise.resolve(null));

  const [
    pages,
    routes,
    referrers,
    utmSources,
    utmMediums,
    utmCampaigns,
    countries,
    devices,
    browsers,
    systems,
  ] = await Promise.all([
    list("requestPath"),
    list("route"),
    list("referrerHostname"),
    utm("utmSource"),
    utm("utmMedium"),
    utm("utmCampaign"),
    list("country"),
    list("deviceType"),
    list("browserName"),
    list("osName"),
  ]);

  return {
    pages,
    routes,
    referrers,
    utmSources,
    utmMediums,
    utmCampaigns,
    countries,
    devices,
    browsers,
    systems,
  };
}

async function loadFunnel(
  credentials: VercelCredentials,
  window: RangeWindow
): Promise<AnalyticsFunnelStep[] | null> {
  const rows = await orNull(
    aggregateEvents(credentials, { since: window.since, until: window.until }, "eventName")
  );
  if (!rows) return null;

  const byName = new Map(rows.map((row) => [String(row.eventName ?? ""), row]));
  return FUNNEL_EVENTS.map((event) => {
    const row = byName.get(event);
    return { event, count: num(row?.count), visitors: num(row?.visitors) };
  });
}

/** Builds the report with the fewest upstream calls the view needs.
   Throws `UpstreamError` only when the core numbers (trend + totals) both fail. */
export async function buildReport(
  credentials: VercelCredentials,
  range: AnalyticsRange,
  view: AnalyticsView,
  capabilities: AnalyticsCapabilities
): Promise<AnalyticsReport> {
  const window = resolveWindow(range);
  const current = { since: window.since, until: window.until };
  const previous = { since: window.previousSince, until: window.previousUntil };

  /* Secondary queries start now and never reject (`orNull`), so only the two core ones are settled below */
  const previousPromise = orNull(countVisits(credentials, previous));
  const breakdownsPromise =
    view === "full" ? loadBreakdowns(credentials, window, capabilities) : null;
  const funnelPromise =
    view === "full" && capabilities.customEvents ? loadFunnel(credentials, window) : null;

  const [seriesResult, totalsResult] = await Promise.allSettled([
    Promise.all(
      seriesPeriods(window).map((period) =>
        aggregateVisits(credentials, period, window.granularity, 100)
      )
    ).then((chunks) => chunks.flat()),
    countVisits(credentials, current),
  ]);
  if (seriesResult.status === "rejected" && totalsResult.status === "rejected") {
    throw seriesResult.reason;
  }

  const series = fillSeries(seriesResult.status === "fulfilled" ? seriesResult.value : [], window);
  /* Daily visitors are not additive, so the fallback only approximates unique visitors */
  const totals =
    totalsResult.status === "fulfilled"
      ? toTotals(totalsResult.value)
      : series.reduce<AnalyticsTotals>(
          (sum, p) => ({
            pageviews: sum.pageviews + p.pageviews,
            visitors: sum.visitors + p.visitors,
          }),
          { pageviews: 0, visitors: 0 }
        );
  const [previousData, breakdowns, funnel] = await Promise.all([
    previousPromise,
    breakdownsPromise,
    funnelPromise,
  ]);

  return {
    range,
    granularity: window.granularity,
    since: window.since.toISOString(),
    capabilities,
    totals,
    previousTotals: previousData ? toTotals(previousData) : null,
    series,
    breakdowns,
    funnel,
    generatedAt: new Date().toISOString(),
  };
}
