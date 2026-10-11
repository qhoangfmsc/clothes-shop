/* Shapes returned by GET /api/analytics (Next.js route handler → Vercel Web Analytics API).
   Shared by the route, the SWR hook, the Analytics page and the Dashboard summary. */

import type { AnalyticsEventName } from "@/src/lib/analytics";

export const ANALYTICS_RANGES = ["24h", "7d", "30d", "90d"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];
export const ANALYTICS_RANGE_DAYS: Record<AnalyticsRange, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/** `summary` = totals + trend only (Dashboard); `full` = everything (Analytics page). */
export type AnalyticsView = "summary" | "full";

/** What the configured Vercel plan lets the report show. */
export interface AnalyticsCapabilities {
  /** Longest range the reporting window covers */
  maxRangeDays: number;
  customEvents: boolean;
  utm: boolean;
}

export interface AnalyticsTotals {
  pageviews: number;
  visitors: number;
}

export interface AnalyticsSeriesPoint extends AnalyticsTotals {
  /** ISO timestamp of the start of the hour / day bucket (UTC) */
  timestamp: string;
}

/** One row of a "top N" list. An empty `key` means the value was not recorded (e.g. direct traffic). */
export interface AnalyticsBreakdownRow extends AnalyticsTotals {
  key: string;
}

/** `null` = that query failed or the plan does not allow it; the UI hides or empties the card. */
export interface AnalyticsBreakdowns {
  pages: AnalyticsBreakdownRow[] | null;
  routes: AnalyticsBreakdownRow[] | null;
  referrers: AnalyticsBreakdownRow[] | null;
  utmSources: AnalyticsBreakdownRow[] | null;
  utmMediums: AnalyticsBreakdownRow[] | null;
  utmCampaigns: AnalyticsBreakdownRow[] | null;
  countries: AnalyticsBreakdownRow[] | null;
  devices: AnalyticsBreakdownRow[] | null;
  browsers: AnalyticsBreakdownRow[] | null;
  systems: AnalyticsBreakdownRow[] | null;
}

export interface AnalyticsFunnelStep {
  event: AnalyticsEventName;
  /** Times the event fired */
  count: number;
  /** Distinct visitors who fired it */
  visitors: number;
}

export interface AnalyticsReport {
  range: AnalyticsRange;
  granularity: "hour" | "day";
  /** Start of the current range (ISO) — lets the Dashboard count its own orders over the same window */
  since: string;
  capabilities: AnalyticsCapabilities;
  totals: AnalyticsTotals;
  /** Same-length period right before `since`; null when that query failed */
  previousTotals: AnalyticsTotals | null;
  series: AnalyticsSeriesPoint[];
  /** null for the `summary` view */
  breakdowns: AnalyticsBreakdowns | null;
  /** null when custom events are unavailable (plan) or the query failed */
  funnel: AnalyticsFunnelStep[] | null;
  generatedAt: string;
}

/** Why the report could not be built. Codes, not text: the UI translates them. */
export type AnalyticsErrorReason = "auth" | "plan" | "unavailable";

/** Always HTTP 200 for configuration/upstream problems so the page can render a friendly card.
   Real 401/403 are only for the caller (not logged in / not an admin). */
export type AnalyticsResponse =
  | { status: "ok"; report: AnalyticsReport }
  | { status: "not_configured"; missing: string[] }
  | { status: "error"; reason: AnalyticsErrorReason };
