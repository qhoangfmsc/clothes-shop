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
  price: number;
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
