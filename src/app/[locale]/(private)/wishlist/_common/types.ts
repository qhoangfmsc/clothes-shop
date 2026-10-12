/* ═══════════════════════════════════════════════════════════
   WISHLIST MODULE TYPES — WishlistItem entity

   Part of wishlist module _common/ — private to the wishlist feature.
   ═══════════════════════════════════════════════════════════ */

import type { ProductBadge } from "@/src/types/enums";

export interface WishlistItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  category: string;
  subcategory: string;
  /** Used to hide the price of custom-order products. Missing on items saved before it existed. */
  badge?: ProductBadge | null;
  addedAt: string;
}
