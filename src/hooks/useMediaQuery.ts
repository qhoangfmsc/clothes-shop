import { useState, useEffect, useCallback } from "react";

/* ─────────────────────────────────────────────────────────
   BREAKPOINTS — synced with design-system.css
   Mobile:     < 640px
   Tablet:     ≥ 640px  (sm)
   Desktop:    ≥ 1024px (lg)
   Wide:       ≥ 1440px (xl)
   ───────────────────────────────────────────────────────── */

const BREAKPOINTS = {
  sm: 640,
  lg: 1024,
  xl: 1440,
} as const;

type BreakpointKey = keyof typeof BREAKPOINTS;

/* ═══════════════════════════════════════════════════════════
   useMediaQuery — generic media query hook
   ═══════════════════════════════════════════════════════════

   Usage:
     const isWide = useMediaQuery("(min-width: 1440px)");
     const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
     const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
*/
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/* ═══════════════════════════════════════════════════════════
   useBreakpoint — design-system-aware breakpoint hook
   ═══════════════════════════════════════════════════════════

   Returns current breakpoint state synced with CSS breakpoints.

   Usage:
     const { isMobile, isTablet, isDesktop, isWide, breakpoint } = useBreakpoint();
     const fontSize = isDesktop ? 24 : 52;
*/
interface BreakpointState {
  /** Below 640px */
  isMobile: boolean;
  /** Between 640px and 1023px */
  isTablet: boolean;
  /** 1024px and above */
  isDesktop: boolean;
  /** 1440px and above */
  isWide: boolean;
  /** Current named breakpoint: "mobile" | "tablet" | "desktop" | "wide" */
  breakpoint: "mobile" | "tablet" | "desktop" | "wide";
  /** Check if viewport is at or above a given breakpoint */
  isAbove: (bp: BreakpointKey) => boolean;
  /** Check if viewport is below a given breakpoint */
  isBelow: (bp: BreakpointKey) => boolean;
}

export function useBreakpoint(): BreakpointState {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isAbove = useCallback(
    (bp: BreakpointKey) => width >= BREAKPOINTS[bp],
    [width],
  );

  const isBelow = useCallback(
    (bp: BreakpointKey) => width < BREAKPOINTS[bp],
    [width],
  );

  const isMobile = width < BREAKPOINTS.sm;
  const isTablet = width >= BREAKPOINTS.sm && width < BREAKPOINTS.lg;
  const isDesktop = width >= BREAKPOINTS.lg;
  const isWide = width >= BREAKPOINTS.xl;

  const breakpoint: BreakpointState["breakpoint"] = isWide
    ? "wide"
    : isDesktop
      ? "desktop"
      : isTablet
        ? "tablet"
        : "mobile";

  return { isMobile, isTablet, isDesktop, isWide, breakpoint, isAbove, isBelow };
}

/* ═══════════════════════════════════════════════════════════
   useReducedMotion — accessibility helper
   ═══════════════════════════════════════════════════════════

   Usage:
     const prefersReducedMotion = useReducedMotion();
     const duration = prefersReducedMotion ? 0 : 0.6;
*/
export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
