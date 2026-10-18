/* ── Shipping Types ── */

/** The BE accepts exactly these methods (`POST /api/orders` → `shippingMethod`) */
export const SHIPPING_METHOD_IDS = ["standard", "express", "store-pickup"] as const;
export type ShippingMethodId = (typeof SHIPPING_METHOD_IDS)[number];

export const SHIPPING_ICONS = ["truck", "express", "store"] as const;
export type ShippingIcon = (typeof SHIPPING_ICONS)[number];

export interface ShippingMethod {
  id: ShippingMethodId;
  name: string;
  description: string;
  estimatedDays: string;
  priceVnd: number;
  priceUsd: number;
  icon: ShippingIcon;
}

export interface ReturnPolicy {
  days: number;
  description: string;
  conditions: string[];
}

export interface ShippingInfo {
  methods: ShippingMethod[];
  returnPolicy: ReturnPolicy;
  /** Subtotal from which every method ships free; both `null` = no free shipping */
  freeShippingThresholdVnd: number | null;
  freeShippingThresholdUsd: number | null;
}
