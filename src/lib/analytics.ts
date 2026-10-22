/* Typed custom events for Vercel Web Analytics; they feed the storefront funnel on /admin/analytics. At most two properties per event
   (Pro plan limit); never personal data, only ids and totals. An amount is ONE property named after its currency (`vnd` / `usd`,
   see `moneyProp`): the language picks the currency and the number is the BE's own field. */

import { track } from "@vercel/analytics";
import { currencyForLocale, type Money } from "@/src/lib/money";

/** An amount in the currency of the UI language: `{ vnd }` for Vietnamese, `{ usd }` otherwise */
export type AnalyticsAmount = { vnd: number; usd?: never } | { usd: number; vnd?: never };

export type AnalyticsEventMap = {
  view_product: { productId: string } & AnalyticsAmount;
  add_to_cart: { productId: string } & AnalyticsAmount;
  begin_checkout: { items: number } & AnalyticsAmount;
  purchase: { orderId: string } & AnalyticsAmount;
};

export function moneyProp(money: Money, locale: string): AnalyticsAmount {
  return currencyForLocale(locale) === "VND" ? { vnd: money.vnd } : { usd: money.usd };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

/** Funnel order, shared by the tracker and the admin report. */
export const FUNNEL_EVENTS = [
  "view_product",
  "add_to_cart",
  "begin_checkout",
  "purchase",
] as const satisfies readonly AnalyticsEventName[];

export function trackEvent<E extends AnalyticsEventName>(name: E, data: AnalyticsEventMap[E]) {
  try {
    track(name, data);
  } catch {
    /* Analytics must never break the storefront (ad blockers, offline, SSR) */
  }
}
