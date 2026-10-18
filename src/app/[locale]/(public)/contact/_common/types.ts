/* ═══════════════════════════════════════════════════════════
   CONTACT MODULE TYPES — custom-order request
   Co-located with the module — NOT in src/types/.
   ═══════════════════════════════════════════════════════════ */

import type { ProductBadge } from "@/src/types/enums";

/** The product a custom order is about, trimmed to what the form needs (built on the server). */
export interface OrderProduct {
  id: string;
  name: string;
  /** Reference code, only put into the message. */
  sku: string;
  priceVnd: number;
  priceUsd: number;
  originalPriceVnd: number | null;
  originalPriceUsd: number | null;
  badge: ProductBadge | null;
  images: string[];
  categoryTitle: string | null;
  subcategoryLabel: string | null;
  description: string;
  material: string;
  /** Absolute, locale-prefixed product page URL, put into the message. */
  url: string;
}

export interface Measurements {
  height: string;
  bust: string;
  waist: string;
  hips: string;
}

export type MeasurementKey = keyof Measurements;

export interface OrderRequestValues {
  /** The personalised design request — what the shopper wants changed or made for them. */
  note: string;
  quantity: number;
  measurements: Measurements;
  /** Body weight in kg (free text, digits only) — optional, not part of `Measurements` because its unit is not cm. */
  weight: string;
  /** `YYYY-MM-DD` from the date input, or empty. */
  neededBy: string;
  fullName: string;
  phone: string;
}

export type OrderRequestErrors = Partial<Record<"note" | "fullName" | "phone", true>>;

/** The message the shopper sends. */
export interface OrderRequestMessage {
  subject: string;
  body: string;
}
