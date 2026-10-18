/* ═══════════════════════════════════════════════════════════
   CART MODULE TYPES — CartItem entity

   Part of cart module _common/ — private to the cart feature.
   ═══════════════════════════════════════════════════════════ */

import type { ProductBadge } from "@/src/types/enums";

export interface CartItem {
  /** Server-side cart item ID (set after API sync) */
  serverItemId?: string;
  productId: string;
  name: string;
  /** Unit price: whole dong and the BE's USD conversion */
  priceVnd: number;
  priceUsd: number;
  /** Line total as the BE priced it (`lineTotalVnd/Usd`); `null` while the quantity changed here and the BE has not answered yet */
  lineTotalVnd: number | null;
  lineTotalUsd: number | null;
  image: string;
  size: string;
  color: string;
  colorHex: string;
  quantity: number;
  category: string;
  subcategory: string;
  /** Badge of the product. `sold_out` / `custom_order` lines stay in the bag but cannot be ticked or checked out. */
  badge?: ProductBadge | null;
}

/** A line as built from a product, before the BE has priced it */
export type NewCartItem = Omit<CartItem, "quantity" | "serverItemId" | "lineTotalVnd" | "lineTotalUsd">;
