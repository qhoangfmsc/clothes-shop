/* ── Product Types ── */

export interface Product {
  id: string;
  slug: string;
  sku: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  secondaryImage: string;
  category: string;
  subcategory: string;
  badge?: "new" | "sale" | "bestseller";
  status: "active" | "draft" | "archived";
  description: string;
  material: string;
  care: string;
  sizes: string[];
  colors: ProductColor[];
  tags: string[];
  createdAt: string;
}

export interface ProductColor {
  name: string;
  hex: string;
}
