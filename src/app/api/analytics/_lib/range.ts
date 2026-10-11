import {
  ANALYTICS_RANGES,
  ANALYTICS_RANGE_DAYS,
  type AnalyticsRange,
  type AnalyticsSeriesPoint,
} from "@/src/types/analytics";

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
/** Timestamps sent upstream are rounded to this, so repeated requests share one cached response */
const CACHE_BUCKET_MS = 300_000;

const RANGE_DAYS = ANALYTICS_RANGE_DAYS;

export function parseRange(value: string | null): AnalyticsRange {
  return ANALYTICS_RANGES.find((r) => r === value) ?? "7d";
}

/** Longest range that fits the plan's reporting window (the requested one when it fits). */
export function clampRange(range: AnalyticsRange, maxRangeDays: number): AnalyticsRange {
  if (RANGE_DAYS[range] <= maxRangeDays) return range;
  return [...ANALYTICS_RANGES].reverse().find((r) => RANGE_DAYS[r] <= maxRangeDays) ?? "24h";
}

export interface RangeWindow {
  granularity: "hour" | "day";
  bucketMs: number;
  bucketCount: number;
  /** Start of the first bucket */
  since: Date;
  until: Date;
  /** The period of equal length right before `since` */
  previousSince: Date;
  previousUntil: Date;
}

/** Buckets are UTC hours / days, like Vercel's own dashboard.
   The newest bucket is the current (partial) hour / day. */
export function resolveWindow(range: AnalyticsRange, nowMs = Date.now()): RangeWindow {
  const now = Math.floor(nowMs / CACHE_BUCKET_MS) * CACHE_BUCKET_MS;
  const granularity = range === "24h" ? "hour" : "day";
  const bucketMs = granularity === "hour" ? HOUR_MS : DAY_MS;
  const bucketCount = granularity === "hour" ? 24 : RANGE_DAYS[range];

  const currentBucketStart = Math.floor(now / bucketMs) * bucketMs;
  const since = currentBucketStart - (bucketCount - 1) * bucketMs;
  const spanMs = bucketCount * bucketMs;

  return {
    granularity,
    bucketMs,
    bucketCount,
    since: new Date(since),
    until: new Date(now),
    previousSince: new Date(since - spanMs),
    previousUntil: new Date(since - 1),
  };
}

/** One point per bucket, zero where Vercel returned no row, so the chart axis has no gaps. */
export function fillSeries(
  rows: Array<{ timestamp?: string; pageviews?: number; visitors?: number }>,
  window: RangeWindow
): AnalyticsSeriesPoint[] {
  const byBucket = new Map<number, { pageviews: number; visitors: number }>();
  for (const row of rows) {
    const time = Date.parse(row.timestamp ?? "");
    if (Number.isNaN(time)) continue;
    const bucket = Math.floor(time / window.bucketMs) * window.bucketMs;
    byBucket.set(bucket, {
      pageviews: Number(row.pageviews ?? 0),
      visitors: Number(row.visitors ?? 0),
    });
  }

  const first = window.since.getTime();
  return Array.from({ length: window.bucketCount }, (_, i) => {
    const time = first + i * window.bucketMs;
    const value = byBucket.get(time);
    return {
      timestamp: new Date(time).toISOString(),
      pageviews: value?.pageviews ?? 0,
      visitors: value?.visitors ?? 0,
    };
  });
}
