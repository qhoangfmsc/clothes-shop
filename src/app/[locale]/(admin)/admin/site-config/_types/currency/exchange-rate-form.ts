/* Form model of the EXCHANGE_RATE site config: `{"vndPerUsd": 25000}`. The BE accepts a number from 1 to 1.000.000
   with at most 2 decimals and refuses any other field (1503). The admin only edits the value here: the FE never
   uses it to convert a price. */

export const EXCHANGE_RATE_LIMITS = { min: 1, max: 1_000_000 } as const;

export type ExchangeRateError = "number" | "range";

/** VND per 1 USD of a saved `value` string, or `null` when it is missing or broken */
export function parseExchangeRateValue(value: string | undefined): number | null {
  if (!value) return null;
  try {
    const { vndPerUsd } = JSON.parse(value) as { vndPerUsd?: unknown };
    return typeof vndPerUsd === "number" && Number.isFinite(vndPerUsd) ? vndPerUsd : null;
  } catch {
    return null;
  }
}

/** The number in the box: digits, optionally a `.` and 1–2 decimals (no thousand separators, so `25.000` is refused) */
const RATE_PATTERN = /^\d+(\.\d{1,2})?$/;

/** Same rules as the BE, so the admin sees the problem before the request */
export function validateExchangeRate(text: string): ExchangeRateError | null {
  const value = text.trim();
  if (!RATE_PATTERN.test(value)) return "number";
  const rate = Number(value);
  return rate < EXCHANGE_RATE_LIMITS.min || rate > EXCHANGE_RATE_LIMITS.max ? "range" : null;
}

/** The string for `PUT /api/admin/site-config/EXCHANGE_RATE` (`{ value }`) — call only on a valid text */
export function serializeExchangeRate(text: string): string {
  return JSON.stringify({ vndPerUsd: Number(text.trim()) });
}
