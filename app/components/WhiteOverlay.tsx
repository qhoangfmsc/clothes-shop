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
        background: "#fff",
        opacity: 0,
      }}
    />
  );
}
