"use client";

import { useState, useEffect } from "react";

/**
 * Hook detecting current breakpoint.
 * Returns `{ isMobile, isTablet, isDesktop }`.
 *
 * Breakpoints:
 *   mobile  < 640px
 *   tablet  640px–1023px
 *   desktop ≥ 1024px
 */
const BREAKPOINTS = {
  tablet: 640,
  desktop: 1024,
} as const;

export function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    isMobile: width < BREAKPOINTS.tablet,
    isTablet: width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop,
    isDesktop: width >= BREAKPOINTS.desktop,
  };
}
