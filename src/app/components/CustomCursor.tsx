"use client";

import { useEffect, useRef } from "react";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cursorRef.current;
    if (!el) return;

    const move = (e: MouseEvent) => {
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
    };

    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div
      ref={cursorRef}
      className="hidden lg:block"
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 50,
        transform: "translate(-50%, -50%)",
        mixBlendMode: "exclusion",
        width: 48,
        height: 48,
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="24" cy="24" r="22.75" stroke="white" strokeWidth="2.5" />
        {/* Main pad */}
        <ellipse cx="24" cy="30" rx="9" ry="7.5" fill="white" />
        {/* Top-left toe */}
        <ellipse cx="12" cy="20" rx="4" ry="5" transform="rotate(-15 14 18)" fill="white" />
        {/* Top-right toe */}
        <ellipse cx="36" cy="20" rx="4" ry="5" transform="rotate(15 34 18)" fill="white" />
        {/* Inner-left toe */}
        <ellipse cx="20" cy="14" rx="3.5" ry="4.5" transform="rotate(-5 19 14)" fill="white" />
        {/* Inner-right toe */}
        <ellipse cx="28" cy="14" rx="3.5" ry="4.5" transform="rotate(5 29 14)" fill="white" />
      </svg>
    </div>
  );
}
