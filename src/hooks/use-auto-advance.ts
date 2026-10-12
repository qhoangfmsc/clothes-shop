import { useCallback, useEffect, useRef, type RefObject } from "react";

/** How long auto-advance stays paused after the visitor interacts with the element. */
const RESUME_AFTER_MS = 3000;

interface UseAutoAdvanceOptions {
  enabled: boolean;
  intervalMs: number;
  onAdvance: () => void;
  /** Hold while a mouse hovers the element (default true). Hero banners turn this off. */
  pauseOnHover?: boolean;
}

/**
 * Calls `onAdvance` every `intervalMs` — shared by every auto-playing slider (Carousel, banner rotators).
 * It stays idle while the element is off-screen, the tab is hidden, the visitor prefers reduced
 * motion, focus is inside, a mouse hovers it, or they touched / scrolled it a moment ago.
 *
 * Returns `pause()`: call it after a manual interaction (arrow, dot) to hold auto-advance briefly.
 */
export function useAutoAdvance<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { enabled, intervalMs, onAdvance, pauseOnHover = true }: UseAutoAdvanceOptions
) {
  const pausedUntil = useRef(0);
  const advanceRef = useRef(onAdvance);

  useEffect(() => {
    advanceRef.current = onAdvance;
  }, [onAdvance]);

  const pause = useCallback(() => {
    pausedUntil.current = Date.now() + RESUME_AFTER_MS;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    let hovering = false;
    let focused = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
      },
      { threshold: 0.3 }
    );
    observer.observe(el);

    const onEnter = () => {
      hovering = pauseOnHover;
    };
    const onLeave = () => {
      hovering = false;
      pause();
    };
    const onFocusIn = () => {
      focused = true;
    };
    const onFocusOut = () => {
      focused = false;
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", pause, { passive: true });
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("wheel", pause, { passive: true });
    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);

    const timer = setInterval(() => {
      if (reducedMotion.matches || !inView || hovering || focused || document.hidden) return;
      if (Date.now() < pausedUntil.current) return;
      advanceRef.current();
    }, intervalMs);

    return () => {
      clearInterval(timer);
      observer.disconnect();
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("wheel", pause);
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("focusout", onFocusOut);
    };
  }, [ref, enabled, intervalMs, pauseOnHover, pause]);

  return pause;
}
