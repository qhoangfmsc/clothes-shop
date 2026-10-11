/* ═══════════════════════════════════════════════════════════
   CART MODULE TYPES — CartItem entity

   Part of cart module _common/ — private to the cart feature.
   ═══════════════════════════════════════════════════════════ */

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
}
