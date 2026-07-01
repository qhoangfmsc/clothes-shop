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
        <circle
          cx="24"
          cy="24"
          r="22.75"
          stroke="white"
          strokeWidth="2.5"
        />
        <path
          d="M24 14C22.5 14 21.2 14.5 20.2 15.3C19.2 16.1 18.5 17.2 18.2 18.5C17.9 19.8 18 21.2 18.5 22.4C19 23.6 19.9 24.6 21 25.2V26C21 26.6 21.2 27.1 21.6 27.5C22 27.9 22.5 28.1 23 28.1H25C25.5 28.1 26 27.9 26.4 27.5C26.8 27.1 27 26.6 27 26V25.2C28.1 24.6 29 23.6 29.5 22.4C30 21.2 30.1 19.8 29.8 18.5C29.5 17.2 28.8 16.1 27.8 15.3C26.8 14.5 25.5 14 24 14Z"
          fill="white"
        />
        <path
          d="M22 30H26V31C26 31.5 25.8 32 25.4 32.4C25 32.8 24.5 33 24 33C23.5 33 23 32.8 22.6 32.4C22.2 32 22 31.5 22 31V30Z"
          fill="white"
        />
      </svg>
    </div>
  );
}
