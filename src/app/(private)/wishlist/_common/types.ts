/* ═══════════════════════════════════════════════════════════
   WISHLIST MODULE TYPES — WishlistItem entity

   Part of wishlist module _common/ — private to the wishlist feature.
   ═══════════════════════════════════════════════════════════ */

export interface WishlistItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  category: string;
  subcategory: string;
  addedAt: string;
}
