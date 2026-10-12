/* ═══════════════════════════════════════════════════════════
   LIST QUERY — the one contract every BE list endpoint shares

   Query:    ?search=&sort=&page=&limit=   (+ module filters)
   Sort:     `field` = ascending, `-field` = descending, ONE field.
             Never send old styles (`newest`, `price_asc`, `sorts=`) — the BE answers 400.
   Limit:    25 by default, 200 at most (BE rejects more with 400).
   Response: { data, total, page, limit, totalPages }

   Every list thunk / SWR hook builds its URL with `buildListQuery`, so the rules
   live in one place. See .agent/skills/05-list-pages.md.
   ═══════════════════════════════════════════════════════════ */

/** Records per page unless a screen has a reason to ask for more. */
export const LIST_DEFAULT_LIMIT = 25;

/** Hard cap the BE enforces on every list (`limit` above it → 400). */
export const LIST_MAX_LIMIT = 200;

/** `field` ascending, `-field` descending. */
export type SortValue = string;

export interface ListParams {
  search?: string;
  sort?: SortValue;
  page?: number;
  limit?: number;
}

export interface ListResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

/** Clamp a requested page size into 1..LIST_MAX_LIMIT. */
export function clampLimit(limit: number | undefined): number {
  if (!limit || limit < 1) return LIST_DEFAULT_LIMIT;
  return Math.min(Math.floor(limit), LIST_MAX_LIMIT);
}

type FilterValue = string | number | boolean | null | undefined;

/**
 * Query string (no leading `?`) for a list endpoint. Empty / undefined values are dropped,
 * `page` is omitted on page 1, and `limit` is clamped to the BE maximum.
 * Module filters go in `filters` (e.g. `{ status, category }`).
 */
export function buildListQuery(params: ListParams, filters: Record<string, FilterValue> = {}): string {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  }
  if (params.sort) qs.set("sort", params.sort);
  if (params.page && params.page > 1) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(clampLimit(params.limit)));
  return qs.toString();
}
