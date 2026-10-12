import type { ProductBadge } from "@/src/types/enums";

/** How a product can be bought, decided by its badge:
 *  - `cart`        → normal product, goes into the bag
 *  - `soldOut`     → `sold_out`, cannot be bought
 *  - `customOrder` → `custom_order`, ordered through the contact page instead of the bag */
export type PurchaseMode = "cart" | "soldOut" | "customOrder";

export function getPurchaseMode(badge: ProductBadge | null | undefined): PurchaseMode {
  if (badge === "sold_out") return "soldOut";
  if (badge === "custom_order") return "customOrder";
  return "cart";
}

/** Can the product be added to the bag and checked out? */
export const isPurchasable = (badge: ProductBadge | null | undefined) =>
  getPurchaseMode(badge) === "cart";

/** Custom-order products are priced per request, so no price is shown for them anywhere in the storefront
 *  (label: `common.priceOnRequest`). Sold-out products keep their price. */
export const hasPublicPrice = (badge: ProductBadge | null | undefined) =>
  getPurchaseMode(badge) !== "customOrder";

/** Contact page that takes custom-order requests. Locale-less: use with `@/src/i18n/navigation`. */
export const CONTACT_PATH = "/contact";

/** Contact page link that carries the product the shopper wants to order (the page loads it by id). */
export function buildOrderInquiryHref(productId: string): string {
  return `${CONTACT_PATH}?product=${encodeURIComponent(productId)}`;
}
