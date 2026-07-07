/* ── Collection Types ── */

export interface Collection {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  image: string;
  productIds: string[];
  season: string;
  bgColor: string;
}
