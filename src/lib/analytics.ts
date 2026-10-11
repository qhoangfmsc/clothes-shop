/* ═══════════════════════════════════════════════════════════
   ANALYTICS — typed custom events for Vercel Web Analytics

   Page views are collected automatically by <VercelTelemetry />.
   These events feed the storefront funnel on /admin/analytics:
   view_product → add_to_cart → begin_checkout → purchase.

   Rules:
   - Two properties per event at most (the Vercel Pro plan limit).
   - Never send personal data (name, email, phone, address): ids and totals only.

   Usage:
     import { trackEvent } from "@/src/lib/analytics";
     trackEvent("add_to_cart", { productId: product.id, value: price * quantity });
   ═══════════════════════════════════════════════════════════ */

import { track } from "@vercel/analytics";

export type AnalyticsEventMap = {
  view_product: { productId: string; price: number };
  add_to_cart: { productId: string; value: number };
  begin_checkout: { items: number; value: number };
  purchase: { orderId: string; value: number };
};

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
