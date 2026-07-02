"use client";

export default function WhiteOverlay() {
  return (
    <div
      id="outro-overlay"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 12,
        background: "var(--bg-primary)",
        opacity: 0,
      }}
    />
  );
}
