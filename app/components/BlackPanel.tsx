"use client";

import React, { RefObject, useMemo } from "react";

const GALLERY_IMAGES = [
  "/images/model_intro_1.webp",
  "/images/model_intro_2.webp",
  "/images/model_intro_3.webp",
  "/images/model_intro_4.webp",
  "/images/model_intro_5.webp",
  "/images/model_intro_6.webp",
  "/images/model_intro_7.webp",
  "/images/model_intro_8.webp",
  "/images/model_intro_9.webp",
  "/images/model_intro_10.webp",
];

/* Build scattered grid layout */
function buildLayout(count: number, cols: number): { col: number; imageIdx: number }[][] {
  const rows: { col: number; imageIdx: number }[][] = [];
  let imgIdx = 0;

  const totalRows = Math.ceil((count * 2.5) / 1); // generous rows
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

interface BlackPanelProps {
  panelRef: RefObject<HTMLDivElement | null>;
  wrapRef: RefObject<HTMLDivElement | null>;
}

export default function BlackPanel({ panelRef, wrapRef }: BlackPanelProps) {
  /* Compute layouts for each breakpoint (we'll use CSS grid + responsive cols) */
  const cols4Layout = useMemo(() => buildLayout(GALLERY_IMAGES.length, 4), []);
  const cols3Layout = useMemo(() => buildLayout(GALLERY_IMAGES.length, 3), []);
  const cols2Layout = useMemo(() => buildLayout(GALLERY_IMAGES.length, 2), []);

  /* We render a single grid and use responsive column counts.
     For simplicity, we'll render based on a flat list with grid placement. */

  // Build flat grid cells for 4-column layout (desktop default)
  const renderGrid = (layout: { col: number; imageIdx: number }[][], cols: number) => {
    const cells: React.JSX.Element[] = [];

    layout.forEach((row, rowIdx) => {
      // Create a full row of cells
      for (let c = 0; c < cols; c++) {
        const item = row.find((r) => r.col === c);
        if (item) {
          const isLeftHalf = c < cols / 2;
          cells.push(
            <div
              key={`${rowIdx}-${c}`}
              className="bp-card"
              style={{
                aspectRatio: "2/3",
                opacity: 0,
                overflow: "hidden",
              }}
            >
              <img
                src={GALLERY_IMAGES[item.imageIdx]}
                alt={`Gallery ${item.imageIdx + 1}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
                loading="lazy"
              />
            </div>
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
        background: "var(--bg-panel)",
        zIndex: 10,
        transform: "translateY(100vh)",
        overflow: "hidden",
      }}
    >
      <div
        ref={wrapRef}
        style={{
          width: "100%",
          paddingTop: "min(100px, 10vh)",
        }}
      >
        {/* Mobile: 2 cols */}
        <div
          className="grid sm:hidden"
          style={{
            gridTemplateColumns: "repeat(2, 1fr)",
          }}
        >
          {renderGrid(cols2Layout, 2)}
        </div>

        {/* Tablet: 3 cols */}
        <div
          className="hidden sm:grid lg:hidden"
          style={{
            gridTemplateColumns: "repeat(3, 1fr)",
          }}
        >
          {renderGrid(cols3Layout, 3)}
        </div>

        {/* Desktop: 4 cols */}
        <div
          className="hidden lg:grid"
          style={{
            gridTemplateColumns: "repeat(4, 1fr)",
          }}
        >
          {renderGrid(cols4Layout, 4)}
        </div>
      </div>
    </div>
  );
}
