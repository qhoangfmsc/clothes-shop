import { useCallback, useEffect, useRef, useState } from "react";
import { useAutoAdvance } from "./use-auto-advance";

const DEFAULT_ROTATE_MS = 5000;

/**
 * Index state + auto-advance for crossfading banner heroes (render with `BannerFade`).
 * Attach `ref` to the hero element; show `CarouselDots` wired to `index` / `goTo`.
 * Resets to the first banner whenever the `banners` array itself changes.
 */
export function useBannerRotation<T extends HTMLElement>(
  banners: readonly unknown[],
  intervalMs = DEFAULT_ROTATE_MS
) {
  const ref = useRef<T>(null);
  const [index, setIndex] = useState(0);
  const count = banners.length;

  useEffect(() => {
    setIndex(0);
  }, [banners]);

  const pause = useAutoAdvance(ref, {
    enabled: count > 1,
    intervalMs,
    pauseOnHover: false,
    onAdvance: () => setIndex((i) => (i + 1) % count),
  });

  const goTo = useCallback(
    (i: number) => {
      setIndex(i);
      pause();
    },
    [pause]
  );

  return { ref, index, goTo, count };
}
