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
      className="left-4 right-4 bottom-[60px] h-[100px] sm:left-auto sm:right-8 sm:bottom-8 sm:w-[330px] sm:h-[174px]"
    >
      <span
        className="text-[72px] sm:text-[110px]"
        style={{
          letterSpacing: "-0.04em",
          color: "#fff",
          mixBlendMode: "exclusion",
        }}
      >
        view
      </span>
    </div>
  );
}
