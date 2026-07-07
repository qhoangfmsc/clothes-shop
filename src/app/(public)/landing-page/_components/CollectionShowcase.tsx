"use client";

import React, { RefObject, useEffect, useMemo } from "react";
import Link from "next/link";
import { useCollections } from "@/src/hooks/use-api";

type GalleryItem = { image: string; name: string; slug: string };

/* Build scattered grid layout */
function buildLayout(count: number, cols: number): { col: number; imageIdx: number }[][] {
  const rows: { col: number; imageIdx: number }[][] = [];
  let imgIdx = 0;

  for (let r = 0; imgIdx < count; r++) {
    const row: { col: number; imageIdx: number }[] = [];

    // Primary column placement
    const a = (r * 2 + (r % 2)) % cols;
    if (imgIdx < count) {
      row.push({ col: a, imageIdx: imgIdx++ });
    }

    // Every 3rd row, place a second image
    if (r % 3 === 0 && imgIdx < count) {
      let b = (a + 2) % cols;
      if (b === a) b = (a + 1) % cols;
      row.push({ col: b, imageIdx: imgIdx++ });
    }

    rows.push(row);
  }

  return rows;
}

interface CollectionShowcaseProps {
  panelRef: RefObject<HTMLDivElement | null>;
  wrapRef: RefObject<HTMLDivElement | null>;
}

export default function CollectionShowcase({ panelRef, wrapRef }: CollectionShowcaseProps) {
  const { collections } = useCollections();

  /* Derive gallery items from API data */
  const GALLERY_ITEMS: GalleryItem[] = useMemo(
    () => collections.map((c) => ({ image: c.image, name: c.name, slug: c.slug })),
    [collections]
  );

  /* When data loads, trigger recalc of parent's spacer height */
  useEffect(() => {
    if (GALLERY_ITEMS.length > 0) {
      /* Small delay to let DOM update with new grid items */
      const t = setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 50);
      return () => clearTimeout(t);
    }
  }, [GALLERY_ITEMS.length]);

  /* Compute layouts for each breakpoint (we'll use CSS grid + responsive cols) */
  const cols4Layout = useMemo(() => buildLayout(GALLERY_ITEMS.length, 4), [GALLERY_ITEMS.length]);
  const cols3Layout = useMemo(() => buildLayout(GALLERY_ITEMS.length, 3), [GALLERY_ITEMS.length]);
  const cols2Layout = useMemo(() => buildLayout(GALLERY_ITEMS.length, 2), [GALLERY_ITEMS.length]);

  // Build flat grid cells for N-column layout
  const renderGrid = (layout: { col: number; imageIdx: number }[][], cols: number) => {
    const cells: React.JSX.Element[] = [];

    layout.forEach((row, rowIdx) => {
      // Create a full row of cells
      for (let c = 0; c < cols; c++) {
        const item = row.find((r) => r.col === c);
        if (item) {
          const galleryItem = GALLERY_ITEMS[item.imageIdx];
          /* Cards in left half of grid → origin right bottom,
             cards in right half → origin left bottom */
          const isLeftHalf = c < cols / 2;
          const origin = isLeftHalf ? "right bottom" : "left bottom";

          cells.push(
            <Link
              key={`${rowIdx}-${c}`}
              href={`/collections/${galleryItem.slug}`}
              className="collection-card"
              style={{
                aspectRatio: "2/3",
                overflow: "hidden",
                transform: "scale(0)",
                transformOrigin: origin,
                display: "block",
                position: "relative",
                textDecoration: "none",
              }}
            >
              <img
                src={galleryItem.image}
                alt={galleryItem.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  transition: "transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                loading="lazy"
              />
              {/* Name overlay */}
              <div
                className="collection-card__overlay"
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  padding: "var(--space-4)",
                  background:
                    "linear-gradient(to top, rgba(10, 10, 8, 0.65) 0%, rgba(10, 10, 8, 0.1) 40%, transparent 100%)",
                  opacity: 0,
                  transition: "opacity 400ms cubic-bezier(0.25, 0.1, 0.25, 1)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display), serif",
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--font-weight-display)",
                    color: "var(--color-pearl-cream)",
                    letterSpacing: "-0.04em",
                    lineHeight: "100%",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  {galleryItem.name}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-primary)",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--font-weight-body)",
                    color: "var(--color-champagne-gold)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-1)",
                  }}
                >
                  Shop Now
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 8H13M13 8L9 4M13 8L9 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </Link>
          );
        } else {
          cells.push(<div key={`${rowIdx}-${c}`} style={{ aspectRatio: "2/3" }} />);
        }
      }
    });

    return cells;
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 10,
        transform: "translateY(100vh)",
        overflow: "hidden",
      }}
    >
      {/* CSS for hover effects */}
      <style>{`
        .collection-card:hover img {
          transform: scale(1.06);
        }
        .collection-card:hover .collection-card__overlay {
          opacity: 1 !important;
        }
        @media (hover: none) {
          .collection-card .collection-card__overlay {
            opacity: 1 !important;
          }
        }
      `}</style>

      <div
        ref={wrapRef}
        style={{
          width: "100%",
          paddingTop: "40vh",
          paddingBottom: "80vh",
        }}
      >
        {/* Mobile: 2 cols */}
        <div
          className="grid sm:hidden"
          style={{
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "var(--space-2)",
            padding: "0 var(--space-4)",
          }}
        >
          {renderGrid(cols2Layout, 2)}
        </div>

        {/* Tablet: 3 cols */}
        <div
          className="hidden sm:grid lg:hidden"
          style={{
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--space-3)",
            padding: "0 var(--space-6)",
          }}
        >
          {renderGrid(cols3Layout, 3)}
        </div>

        {/* Desktop: 4 cols */}
        <div
          className="hidden lg:grid"
          style={{
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "var(--space-4)",
            padding: "0 var(--space-8)",
          }}
        >
          {renderGrid(cols4Layout, 4)}
        </div>
      </div>
    </div>
  );
}
