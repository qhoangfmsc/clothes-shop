"use client";

export default function ViewButton() {
  return (
    <div
      id="outro-buy"
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 20,
        transformOrigin: "right bottom",
        transform: "scale(0)",
        background: "#000",
        borderRadius: "var(--radius-pill)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "var(--shadow-lg)",
      }}
      className="left-4 right-4 bottom-[60px] h-[72px] sm:left-auto sm:right-8 sm:bottom-8 sm:w-[200px] sm:h-[60px]"
    >
      <span
        className="text-[26px] sm:text-[32px]"
        style={{
          letterSpacing: "-0.04em",
          color: "var(--color-white)",
          textTransform: "lowercase",
        }}
      >
        explore
      </span>
    </div>
  );
}
