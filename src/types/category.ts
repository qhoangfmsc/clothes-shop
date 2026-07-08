/* ── Category Types — Matches BE schema ── */

export interface SubCategory {
  slug: string;
  label: string;
  description: string;
  count: number;
}

export interface Category {
  slug: string;
  title: string;
  description: string;
  subcategories: SubCategory[];
}

export interface CategoryUIConfig {
  heroImage: string;
  moodImage: string;
  tagline: string;
  accentColor: string;
  bgTint: string;
}
