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
  subcategories: SubCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryUIConfig {
  heroImage: string;
  moodImage: string;
  tagline: string;
  accentColor: string;
  bgTint: string;
}
