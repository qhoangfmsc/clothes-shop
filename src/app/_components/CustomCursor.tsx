"use client";

import { useEffect, useRef } from "react";

/**
 * Luxury Custom Cursor
 * - Small golden dot (4px) follows mouse instantly
 * - Thin elegant ring (36px) trails with smooth lerp
 * - Ring expands on interactive elements (links, buttons)
 * - Subtle gold glow on hover
 * - Mix-blend-mode exclusion for contrast
 */
export default function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    let mouseX = 0;
    let mouseY = 0;
    let ringX = 0;
    let ringY = 0;
    let currentScale = 1;
    let targetScale = 1;
    let isHovering = false;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    /* Track mouse position */
    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = `${mouseX}px`;
      dot.style.top = `${mouseY}px`;
    };

    /* Detect hoverable elements */
    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("a, button, [role='button'], input, select, textarea, .product-card")
      ) {
        targetScale = 1.6;
        isHovering = true;
        ring.style.borderColor = "rgba(201, 169, 110, 0.5)";
        ring.style.boxShadow = "0 0 12px rgba(201, 169, 110, 0.15)";
        dot.style.opacity = "0.6";
        dot.style.transform = "translate(-50%, -50%) scale(1.5)";
      }
    };

    const onOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("a, button, [role='button'], input, select, textarea, .product-card")
      ) {
        targetScale = 1;
        isHovering = false;
        ring.style.borderColor = "rgba(255, 255, 255, 0.35)";
        ring.style.boxShadow = "none";
        dot.style.opacity = "1";
        dot.style.transform = "translate(-50%, -50%) scale(1)";
      }
    };

    /* Hide when leaving window */
    const onLeave = () => {
      ring.style.opacity = "0";
      dot.style.opacity = "0";
    };

    const onEnter = () => {
      ring.style.opacity = "1";
      dot.style.opacity = "1";
    };

    /* Smooth animation loop */
    let rafId: number;
    const tick = () => {
      ringX = lerp(ringX, mouseX, 0.12);
      ringY = lerp(ringY, mouseY, 0.12);
      currentScale = lerp(currentScale, targetScale, 0.1);

      ring.style.left = `${ringX}px`;
      ring.style.top = `${ringY}px`;
      ring.style.transform = `translate(-50%, -50%) scale(${currentScale})`;

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, []);

  return (
    <>
      {/* Outer ring — smooth trailing, expands on hover */}
      <div
        ref={ringRef}
        className="hidden lg:block"
        style={{
          position: "fixed",
          pointerEvents: "none",
          zIndex: 50,
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "1px solid rgba(255, 255, 255, 0.35)",
          mixBlendMode: "exclusion",
          transition: "border-color 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease",
          willChange: "transform",
        }}
      />

      {/* Center dot — instant follow, gold tinted */}
      <div
        ref={dotRef}
        className="hidden lg:block"
        style={{
          position: "fixed",
          pointerEvents: "none",
          zIndex: 50,
          transform: "translate(-50%, -50%)",
          mixBlendMode: "exclusion",
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "white",
          transition: "opacity 0.2s ease, transform 0.2s ease",
          willChange: "transform",
        }}
      />
    </>
  );
}
