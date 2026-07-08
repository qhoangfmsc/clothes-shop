/* ── Collection Types — Matches BE schema ── */

export interface Collection {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  image: string;
  productIds: string[];
  season: string;
  createdAt: string;
  updatedAt: string;
}
