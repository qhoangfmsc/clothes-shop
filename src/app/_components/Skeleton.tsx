/* ═══════════════════════════════════════════════════════════
   SKELETON — Shimmer loading placeholders
   
   Usage:
     <Skeleton width="200px" height="20px" />
     <Skeleton variant="circle" width="48px" />
     <Skeleton variant="card" />
     <ProductCardSkeleton />
     <ProductGridSkeleton count={8} />
   ═══════════════════════════════════════════════════════════ */

"use client";

import "@/src/styles/skeleton.css";

type SkeletonVariant = "text" | "circle" | "rect" | "card";

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
  count?: number;
}

/* ── Base Skeleton ── */
export function Skeleton({
  variant = "rect",
  width,
  height,
  borderRadius,
  className = "",
}: SkeletonProps) {
  const variantClass = `skeleton--${variant}`;
  const style: React.CSSProperties = {};

  if (width) style.width = width;
  if (height) style.height = height;
  if (borderRadius) style.borderRadius = borderRadius;

  if (variant === "circle") {
    style.width = width ?? "48px";
    style.height = width ?? "48px";
  }

  return (
    <div
      className={`skeleton ${variantClass} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

/* ── Product Card Skeleton ── */
export function ProductCardSkeleton() {
  return (
    <div className="skeleton-product-card">
      <Skeleton variant="rect" className="skeleton-product-card__image" />
      <div className="skeleton-product-card__info">
        <Skeleton width="70%" height="14px" />
        <Skeleton width="40%" height="14px" />
      </div>
    </div>
  );
}

/* ── Product Grid Skeleton ── */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="skeleton-product-grid">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ── Collection Card Skeleton ── */
export function CollectionCardSkeleton() {
  return (
    <div className="skeleton-collection-card">
      <Skeleton variant="rect" className="skeleton-collection-card__image" />
      <div className="skeleton-collection-card__info">
        <Skeleton width="50%" height="12px" />
        <Skeleton width="80%" height="20px" />
        <Skeleton width="60%" height="14px" />
      </div>
    </div>
  );
}

/* ── PDP Skeleton ── */
export function PDPSkeleton() {
  return (
    <div className="skeleton-pdp">
      <div className="skeleton-pdp__gallery">
        <Skeleton variant="rect" className="skeleton-pdp__main-image" />
        <div className="skeleton-pdp__thumbs">
          <Skeleton variant="rect" width="64px" height="80px" borderRadius="8px" />
          <Skeleton variant="rect" width="64px" height="80px" borderRadius="8px" />
        </div>
      </div>
      <div className="skeleton-pdp__info">
        <Skeleton width="40%" height="12px" />
        <Skeleton width="80%" height="28px" />
        <Skeleton width="30%" height="20px" />
        <div className="skeleton-pdp__divider" />
        <Skeleton width="100%" height="14px" />
        <Skeleton width="90%" height="14px" />
        <Skeleton width="70%" height="14px" />
        <div className="skeleton-pdp__sizes">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} width="48px" height="40px" borderRadius="8px" />
          ))}
        </div>
        <Skeleton width="100%" height="48px" borderRadius="9999px" />
      </div>
    </div>
  );
}

/* ── Review Skeleton ── */
export function ReviewSkeleton() {
  return (
    <div className="skeleton-review">
      <div className="skeleton-review__header">
        <Skeleton variant="circle" width="40px" />
        <div className="skeleton-review__meta">
          <Skeleton width="120px" height="14px" />
          <Skeleton width="80px" height="12px" />
        </div>
      </div>
      <Skeleton width="60%" height="16px" />
      <Skeleton width="100%" height="14px" />
      <Skeleton width="85%" height="14px" />
    </div>
  );
}

/* ── Generic Section Skeleton ── */
export function SectionSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-section">
      <Skeleton width="30%" height="12px" />
      <Skeleton width="50%" height="24px" />
      <div className="skeleton-section__body">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} width={`${90 - i * 10}%`} height="14px" />
        ))}
      </div>
    </div>
  );
}
