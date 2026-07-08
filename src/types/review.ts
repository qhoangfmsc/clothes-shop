/* ── Review Types — Matches BE schema ── */

export interface Review {
  id: string;
  productId: string;
  userId: string | null;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  title: string;
  content: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}
