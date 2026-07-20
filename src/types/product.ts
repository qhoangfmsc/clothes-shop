/* ── Product Types — Matches BE schema exactly ── */

export interface ProductColor {
  name: string;
  hex: string;
}

/** Category relation returned from BE (leftJoinAndSelect) */
export interface ProductCategory {
  id: string;
  slug: string;
  title: string;
  description: string;
}

/** SubCategory relation returned from BE (leftJoinAndSelect) */
export interface ProductSubCategory {
  id: number;
  slug: string;
  label: string;
  description: string;
  count: number;
}

export interface Product {
  id: string;
  slug: string;
  sku: string;
  name: string;
  price: number;
  originalPrice: number | null;
  images: string[];
  /** BE returns relation object (joined), NOT a plain string */
  category: ProductCategory | null;
  /** BE returns relation object (joined), NOT a plain string */
  subcategory: ProductSubCategory | null;
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
