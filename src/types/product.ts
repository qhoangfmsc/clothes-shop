/* ── Product Types — Matches BE schema ── */

export interface Product {
  id: string;
  slug: string;
  sku: string;
  name: string;
  price: number;
  originalPrice: number | null;
  images: string[];
  category: string;
  subcategory: string;
  badge: string | null;
  status: string;
  description: string;
  material: string;
  care: string;
  sizes: string[];
  colors: ProductColor[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductColor {
  name: string;
  hex: string;
}
