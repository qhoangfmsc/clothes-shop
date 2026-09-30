/* ── Category Types — Matches BE schema ── */

export interface SubCategory {
  id: number;
  slug: string;
  label: string;
  description: string;
  count: number;
}

export interface Category {
  id: string;
  slug: string;
  title: string;
  description: string;
  /** Hero banner image for CategoryGrid; null until an admin sets one. */
  heroImage: string | null;
  subcategories: SubCategory[];
  createdAt: string;
  updatedAt: string;
}
