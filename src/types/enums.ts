/* ── Shared enums — mirror the BE values exactly (case-sensitive) ──
   BE source of truth: clothes-shop-api `src/common/constants/enum-values.constant.ts`.
   Site-config enums live in `site-config.ts`.
   Display labels are NOT here — they come from the i18n messages
   (`common.productBadge`, `common.status`, `common.role`, `common.orderStatus`). */

/* ── Product ── */

/** `null` on a product means "no badge". Values outside this list make the BE answer 400. */
export const PRODUCT_BADGES = [
  "new",
  "sale",
  "bestseller",
  "sold_out",
  "limited",
  "custom_order",
] as const;
export type ProductBadge = (typeof PRODUCT_BADGES)[number];

export const PRODUCT_STATUSES = ["active", "disabled"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/* ── User ── */

export const USER_ROLES = ["user", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["active", "disabled"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/* ── Order ── */

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipping",
  "delivered",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Payment state of an order, separate from its delivery `status` */
export const ORDER_PAYMENT_STATUSES = ["unpaid", "paid", "refunded"] as const;
export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];

/** Statuses an order can move to from each status. `completed` / `cancelled` are final. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipping", "cancelled"],
  shipping: ["delivered"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};

/** The current status plus every status it can move to — the options a status picker should offer. */
export function getSelectableOrderStatuses(current: string): readonly string[] {
  const next = ORDER_STATUS_TRANSITIONS[current as OrderStatus];
  return next ? [current, ...next] : [current];
}
