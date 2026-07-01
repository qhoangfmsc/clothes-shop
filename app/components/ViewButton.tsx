"use client";

export default function ViewButton() {
  return (
    <div
      id="outro-buy"
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 20,
        mixBlendMode: "exclusion",
        transformOrigin: "right bottom",
        transform: "scale(0)",
        background: "#fff",
        borderRadius: 1335,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      className="left-4 right-4 bottom-[60px] h-[72px] sm:left-auto sm:right-8 sm:bottom-8 sm:w-[220px] sm:h-[80px]"
    >
      <span
        className="text-[26px] sm:text-[42px]"
        style={{
          letterSpacing: "-0.04em",
          color: "#fff",
          mixBlendMode: "exclusion",
        }}
      >
        explore
      </span>
    </div>
  );
}
