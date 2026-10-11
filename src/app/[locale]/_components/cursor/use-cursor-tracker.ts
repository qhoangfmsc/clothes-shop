import { useEffect, useRef, useState } from "react";
import { useMotionValue } from "framer-motion";
import {
  CursorVariant,
  NATIVE_SELECTOR,
  POINTER_SELECTOR,
  TEXT_SELECTOR,
} from "./cursor-config";

interface CursorTrackerState {
  /** Whether a fine pointer (mouse/trackpad) is available at all — false on touch devices. */
  isSupported: boolean;
  /** Whether the pointer currently sits inside the viewport. */
  isVisible: boolean;
  /** Whether the primary button is currently held down. */
  isPressed: boolean;
  variant: CursorVariant | "native";
}

function resolveVariant(target: EventTarget | null): CursorVariant | "native" {
  if (!(target instanceof Element)) return "default";
  if (target.closest(NATIVE_SELECTOR)) return "native";
  if (target.closest(TEXT_SELECTOR)) return "text";
  if (target.closest(POINTER_SELECTOR)) return "pointer";
  return "default";
}

/**
 * Tracks the pointer as framer-motion values (no React re-render per mousemove) plus the
 * derived cursor variant/visibility/pressed state, which only change on meaningful events.
 */
export function useCursorTracker() {
  const [state, setState] = useState<CursorTrackerState>({
    isSupported: false,
    isVisible: false,
    isPressed: false,
    variant: "default",
  });

  // Raw motion values, set 1:1 from pointermove — no spring smoothing, so the
  // cursor tracks the real pointer with zero added lag (movement is the one
  // thing that must never feel delayed).
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const lastVariant = useRef<CursorTrackerState["variant"]>("default");

  useEffect(() => {
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (!hasFinePointer) return;

    setState((prev) => ({ ...prev, isSupported: true }));

    const handleMove = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);

      const variant = resolveVariant(event.target);
      if (variant !== lastVariant.current) {
        lastVariant.current = variant;
        setState((prev) => ({ ...prev, isVisible: true, variant }));
      } else {
        setState((prev) => (prev.isVisible ? prev : { ...prev, isVisible: true }));
      }
    };

    const handleLeave = () => setState((prev) => ({ ...prev, isVisible: false }));
    const handleDown = () => setState((prev) => ({ ...prev, isPressed: true }));
    const handleUp = () => setState((prev) => ({ ...prev, isPressed: false }));

    window.addEventListener("pointermove", handleMove, { passive: true });
    document.addEventListener("mouseleave", handleLeave);
    window.addEventListener("pointerdown", handleDown);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("blur", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      document.removeEventListener("mouseleave", handleLeave);
      window.removeEventListener("pointerdown", handleDown);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("blur", handleUp);
    };
  }, [x, y]);

  return { ...state, x, y };
}
