import type { ProductBadge } from "@/src/types/enums";

/** Overlay pill on product cards (shop grid, collection detail). Label: `common.productBadge.<badge>`. */
export const PRODUCT_CARD_BADGE_STYLES: Record<ProductBadge, string> = {
  new: "bg-[rgba(201,169,110,0.9)] text-[var(--text-on-gold)]",
  sale: "bg-[rgba(212,165,165,0.9)] text-[var(--color-pearl-cream)]",
  bestseller: "bg-[rgba(10,10,8,0.85)] text-[var(--color-pearl-cream)]",
  sold_out: "bg-[rgba(107,101,96,0.9)] text-[var(--color-pearl-cream)]",
  limited: "bg-[rgba(184,165,200,0.9)] text-[var(--text-on-gold)]",
  custom_order: "bg-[rgba(143,163,180,0.9)] text-[var(--color-pearl-cream)]",
};

/** Pill on the product detail page. Label: `public.product.detail.badge.<badge>`. */
export const PRODUCT_DETAIL_BADGE_STYLES: Record<ProductBadge, string> = {
  new: "bg-[rgba(201,169,110,0.15)] text-[var(--color-deep-gold)]",
  sale: "bg-[rgba(212,165,165,0.15)] text-[var(--color-deep-rose)]",
  bestseller: "bg-[rgba(10,10,8,0.08)] text-[var(--text-secondary)]",
  sold_out: "bg-[rgba(107,101,96,0.12)] text-[var(--text-muted)]",
  limited: "bg-[rgba(184,165,200,0.2)] text-[var(--text-secondary)]",
  custom_order: "bg-[rgba(143,163,180,0.18)] text-[var(--text-secondary)]",
};

/** Admin products table. */
export const ADMIN_BADGE_STYLES: Record<ProductBadge, string> = {
  new: "bg-[rgba(143,163,180,0.15)] text-[var(--accent-blue)]",
  sale: "bg-[rgba(212,165,165,0.15)] text-[var(--accent-rose)]",
  bestseller: "bg-[rgba(201,169,110,0.15)] text-[var(--accent-primary)]",
  sold_out: "bg-[rgba(107,101,96,0.1)] text-[var(--color-ash)]",
  limited: "bg-[rgba(184,165,200,0.15)] text-[var(--accent-lavender)]",
  custom_order: "bg-[rgba(163,177,138,0.15)] text-[var(--accent-sage)]",
};
