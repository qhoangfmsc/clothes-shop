/* ── Collection Types — Matches BE schema ── */

import type { Product } from "@/src/types/product";

export interface Collection {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  image: string;
  productIds: string[];
  /** Full products (always with `category` and `subcategory`), nested by the list endpoints (`/api/collections`, `/api/admin/collections`); the `?slug=` answer sends them next to `data` instead */
  products?: Product[];
  season: string;
  createdAt: string;
  updatedAt: string;
}
