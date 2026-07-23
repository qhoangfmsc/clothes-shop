/* ═══════════════════════════════════════════════════════════
   ROUTE TRANSITION — Smooth cream fade between pages
   
   Prevents blank flash and image pop-in:
   - Fade in on link click
   - Hold until new page content + images start rendering
   - Fade out smoothly
   ═══════════════════════════════════════════════════════════ */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Phase = "idle" | "in" | "out";

export default function RouteTransition() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const prevPathname = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const startRef = useRef(0);

  /* ── Intercept internal link clicks → fade in ── */
  const handleClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      /* Skip if the actual click target is a button or inside a button
         (e.g., "Add to Bag" inside a product card Link) */
      if (target.closest("button, [role='button'], input, select, textarea")) return;

      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || href === pathname) return;
      if (anchor.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey) return;

      startRef.current = Date.now();
      setPhase("in");

      /* Safety: auto-dismiss after 4s */
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setPhase("out"), 4000);
    },
    [pathname]
  );

  useEffect(() => {
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [handleClick]);

  /* ── Pathname changed → content ready → hold briefly → fade out ── */
  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;

    if (phase === "idle") return;

    clearTimeout(timerRef.current);

    /* Minimum overlay display: 300ms so it feels intentional */
    const elapsed = Date.now() - startRef.current;
    const minHold = 300;
    const wait = Math.max(0, minHold - elapsed);

    timerRef.current = setTimeout(() => {
      /* Triple-RAF: wait for React commit + browser layout + paint settle */
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setPhase("out");
          });
        });
      });
    }, wait);
  }, [pathname, phase]);

  /* ── After fade-out animation → idle ── */
  useEffect(() => {
    if (phase === "out") {
      const t = setTimeout(() => setPhase("idle"), 350);
      return () => clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (phase === "idle") return null;

  return (
    <div
      className={`fixed inset-0 z-9999 bg-[var(--bg-primary)] pointer-events-none ${
        phase === "in"
          ? "animate-[rt-in_180ms_ease-out_forwards]"
          : "animate-[rt-out_350ms_ease-in-out_forwards]"
      }`}
      aria-hidden="true"
    />
  );
}
