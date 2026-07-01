"use client";

import React, { RefObject, useMemo } from "react";

const GALLERY_IMAGES = [
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_104530_521b2f85-c0f3-4d0e-9704-b578315b4cb9.png&w=1920&q=85",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_103711_76ccdb8b-5043-4f47-9c54-4379713393ea.png&w=1920&q=85",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_103728_394f6a1b-85e2-4386-a4f6-408472a0a5b7.png&w=1920&q=85",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_103739_86743e0e-16a7-4bee-bf38-dd67985344dc.png&w=1920&q=85",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_103748_b2215dc8-a3a7-470d-b19a-5b87fa7d0c37.png&w=1920&q=85",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_103758_e919ce72-5c9d-4b87-9be6-d7647b34825c.png&w=1920&q=85",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_103808_013583d0-3386-4547-9832-37c7d8edb3ac.png&w=1920&q=85",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_103937_a0c49d0a-33eb-4ead-aea6-c1baf241acbc.png&w=1920&q=85",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_103956_d18ed8fd-7b6f-4b86-91f9-20010fe38670.png&w=1920&q=85",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_104034_ba5a9963-87ff-4008-a545-6bd686c088b5.png&w=1920&q=85",
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
