"use client";

export default function Footer() {
  return (
    <div
      id="outro-footer"
      style={{
        position: "fixed",
        pointerEvents: "none",
        left: 16,
        mixBlendMode: "exclusion",
        opacity: 0,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        textTransform: "uppercase",
        color: "white",
      }}
      className="bottom-6 gap-5 justify-between w-[calc(100%-32px)] text-[11px] tracking-[-0.02em] sm:bottom-8 sm:gap-20 sm:w-auto sm:text-[13px]"
    >
      <span>PRMPT (R) 2026</span>
      <span>PRIVACY POLICY</span>
    </div>
  );
}
