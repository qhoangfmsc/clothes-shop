/* Server-only client for the Vercel Web Analytics API
   (https://vercel.com/docs/analytics/web-analytics-api). The access token never leaves the server. */

const BASE_URL = "https://api.vercel.com/v1/query/web-analytics";
const CACHE_SECONDS = 300;
const TIMEOUT_MS = 15_000;

export interface VercelCredentials {
  token: string;
  projectId: string;
  /** Omit for projects owned by a personal account */
  teamId?: string;
}

/** Upstream answered with a non-2xx status. Carries no text: the UI translates the reason. */
export class UpstreamError extends Error {
  constructor(readonly status: number) {
    super("");
  }
}

export function readCredentials():
  { ok: true; credentials: VercelCredentials } | { ok: false; missing: string[] } {
  const token = process.env.WEB_ANALYTICS_TOKEN?.trim();
  const projectId = process.env.WEB_ANALYTICS_PROJECT_ID?.trim();
  const teamId = process.env.WEB_ANALYTICS_TEAM_ID?.trim();

  const missing = [
    !token && "WEB_ANALYTICS_TOKEN",
    !projectId && "WEB_ANALYTICS_PROJECT_ID",
  ].filter((name): name is string => Boolean(name));
  if (!token || !projectId) return { ok: false, missing };

  return { ok: true, credentials: { token, projectId, teamId: teamId || undefined } };
}

type Resource = "visits/count" | "visits/aggregate" | "events/aggregate";
type Params = Record<string, string | undefined>;

/** A row of an aggregate query: the grouped dimension (e.g. `country`) plus the metrics. */
export type AggregateRow = Record<string, string | number | null | undefined>;

async function query<T>(
  credentials: VercelCredentials,
  resource: Resource,
  params: Params
): Promise<T> {
  const url = new URL(`${BASE_URL}/${resource}`);
  url.searchParams.set("projectId", credentials.projectId);
  if (credentials.teamId) url.searchParams.set("teamId", credentials.teamId);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${credentials.token}` },
    next: { revalidate: CACHE_SECONDS },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new UpstreamError(res.status);

  const body = (await res.json()) as { data: T };
  return body.data;
}

interface Period {
  since: Date;
  until: Date;
}

const toQuery = ({ since, until }: Period) => ({
  since: since.toISOString(),
  until: until.toISOString(),
});

/** Total page views and *unique* visitors for the period (a sum of daily visitors would double count). */
export function countVisits(credentials: VercelCredentials, period: Period) {
  return query<{ pageviews?: number; visitors?: number }>(
    credentials,
    "visits/count",
    toQuery(period)
  );
}

/** Rows grouped by `by` — a time bucket (`hour`, `day`) or a dimension (`route`, `country`, …). */
export function aggregateVisits(
  credentials: VercelCredentials,
  period: Period,
  by: string,
  limit = 10
) {
  return query<AggregateRow[]>(credentials, "visits/aggregate", {
    ...toQuery(period),
    by,
    limit: String(limit),
  });
}

export function aggregateEvents(
  credentials: VercelCredentials,
  period: Period,
  by: string,
  limit = 10
) {
  return query<AggregateRow[]>(credentials, "events/aggregate", {
    ...toQuery(period),
    by,
    limit: String(limit),
  });
}
