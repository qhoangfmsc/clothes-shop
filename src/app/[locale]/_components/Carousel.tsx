"use client";

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useTranslations } from "next-intl";
import { useAutoAdvance } from "@/src/hooks/use-auto-advance";
import { CarouselArrow, CarouselDots, type CarouselTone } from "./CarouselControls";

/* ═══════════════════════════════ Layout tokens ═══════════════════════════════
   Tailwind only emits classes it can read as literal strings, so every supported
   value has an explicit entry here. Add a value to the union AND the table. */

type Breakpoint = "base" | "sm" | "lg";
type BreakpointClasses = Record<Breakpoint, string>;

/** A value, or a value per breakpoint (`sm` / `lg` inherit the previous one when omitted). */
export type Responsive<T> = T | ({ base: T } & Partial<Record<"sm" | "lg", T>>);

/** Slides visible at once. Fractions (1.25, 2.5) let the next slide peek in to hint it scrolls. */
export type SlidesPerView = 1 | 1.25 | 2 | 2.5 | 3 | 4 | 5 | 6;

/** Gap between slides, in Tailwind spacing units (4 = 1rem). */
export type CarouselGap = 0 | 2 | 3 | 4 | 5 | 6;

const SLIDES_CLASSES: Record<SlidesPerView, BreakpointClasses> = {
  1: { base: "[--slides:1]", sm: "sm:[--slides:1]", lg: "lg:[--slides:1]" },
  1.25: { base: "[--slides:1.25]", sm: "sm:[--slides:1.25]", lg: "lg:[--slides:1.25]" },
  2: { base: "[--slides:2]", sm: "sm:[--slides:2]", lg: "lg:[--slides:2]" },
  2.5: { base: "[--slides:2.5]", sm: "sm:[--slides:2.5]", lg: "lg:[--slides:2.5]" },
  3: { base: "[--slides:3]", sm: "sm:[--slides:3]", lg: "lg:[--slides:3]" },
  4: { base: "[--slides:4]", sm: "sm:[--slides:4]", lg: "lg:[--slides:4]" },
  5: { base: "[--slides:5]", sm: "sm:[--slides:5]", lg: "lg:[--slides:5]" },
  6: { base: "[--slides:6]", sm: "sm:[--slides:6]", lg: "lg:[--slides:6]" },
};

const GAP_CLASSES: Record<CarouselGap, BreakpointClasses> = {
  0: { base: "[--gap:0px]", sm: "sm:[--gap:0px]", lg: "lg:[--gap:0px]" },
  2: { base: "[--gap:0.5rem]", sm: "sm:[--gap:0.5rem]", lg: "lg:[--gap:0.5rem]" },
  3: { base: "[--gap:0.75rem]", sm: "sm:[--gap:0.75rem]", lg: "lg:[--gap:0.75rem]" },
  4: { base: "[--gap:1rem]", sm: "sm:[--gap:1rem]", lg: "lg:[--gap:1rem]" },
  5: { base: "[--gap:1.25rem]", sm: "sm:[--gap:1.25rem]", lg: "lg:[--gap:1.25rem]" },
  6: { base: "[--gap:1.5rem]", sm: "sm:[--gap:1.5rem]", lg: "lg:[--gap:1.5rem]" },
};

function responsiveClasses<T extends number>(
  value: Responsive<T>,
  table: Record<T, BreakpointClasses>
): string {
  const v = typeof value === "object" ? value : { base: value };
  return [
    table[v.base].base,
    v.sm !== undefined && table[v.sm].sm,
    v.lg !== undefined && table[v.lg].lg,
  ]
    .filter(Boolean)
    .join(" ");
}

function maxSlidesPerView(value: Responsive<SlidesPerView>): number {
  const v = typeof value === "object" ? value : { base: value };
  return Math.max(v.base, v.sm ?? 0, v.lg ?? 0);
}

/* ── Looping page math (virtual slide index 0 = first real slide, may be < 0 or ≥ n inside clones) ──
   Pages group `pv` slides; when n isn't a multiple of pv the last page wraps onto the first slides,
   so page k of cycle c starts at c·n + p·pv (p = k mod pages). */
function loopPageStart(k: number, n: number, pv: number): number {
  const pages = Math.ceil(n / pv);
  const cycle = Math.floor(k / pages);
  return cycle * n + (k - cycle * pages) * pv;
}

/** Page number (any integer, may be < 0 or ≥ pages) whose start is closest to virtual slide `v`. */
function loopPageNear(v: number, n: number, pv: number): number {
  const pages = Math.ceil(n / pv);
  const cycle = Math.floor(v / n);
  const k = cycle * pages + Math.floor((v - cycle * n) / pv);
  return Math.abs(loopPageStart(k + 1, n, pv) - v) < Math.abs(loopPageStart(k, n, pv) - v) ? k + 1 : k;
}

/* ═══════════════════════════════ Types ═══════════════════════════════ */

/** Imperative control — pass a ref via `carouselRef` (e.g. thumbnails that jump to a slide). */
export interface CarouselHandle {
  next: () => void;
  prev: () => void;
  /** Pages = what a dot represents: one per slide, or one per group of visible slides. */
  scrollToPage: (page: number) => void;
}

export interface CarouselProps {
  /** Each direct child is one slide. */
  children: ReactNode;
  /** Accessible name of the whole carousel (translated). */
  ariaLabel: string;
  /** Slides visible at once (default 1). */
  slidesPerView?: Responsive<SlidesPerView>;
  /** Gap between slides (default 4 = 1rem). */
  gap?: Responsive<CarouselGap>;
  /* Defaults — every carousel in the project has all five on: arrows, dots, autoplay, loop, mouse drag.
     Turn one off only with a reason (see .agent/rules/components.md). */
  /** Prev / next buttons. `true` (default) = always visible, `"hover"` = on hover only (always on touch), `false` = none. */
  arrows?: boolean | "hover";
  /** Position dots. `true` (default) = below the slides, `"overlay"` = on top of them, `false` = none. */
  dots?: boolean | "overlay";
  arrowsTone?: CarouselTone;
  /** Defaults to `onImage` for overlay dots and `onSurface` for dots below. */
  dotsTone?: CarouselTone;
  /** Auto-advance every N ms (default 5000). Pauses on hover / touch / focus / off-screen / reduced motion. */
  autoplay?: number | false;
  /** Endless: past the last slide it keeps going to the first (and back), by swipe, drag, arrows and autoplay.
   *  Default true; only applies when there are more slides than fit on screen. */
  loop?: boolean;
  /** Mouse drag-to-scroll (touch and trackpads always scroll natively). Default true. */
  draggable?: boolean;
  /** ← / → move the carousel while focus is inside it. Default true. */
  keyboard?: boolean;
  /** Stretch to the parent's height (galleries) instead of the slides' height. */
  fill?: boolean;
  className?: string;
  slideClassName?: string;
  carouselRef?: RefObject<CarouselHandle | null>;
  /** Fires when the visible page changes (scroll, arrows, dots, drag). */
  onPageChange?: (page: number) => void;
}

/* ═══════════════════════════════ Component ═══════════════════════════════ */

export const DEFAULT_AUTOPLAY_MS = 5000;
/** After the scroll settles inside the cloned slides, jump (invisibly) to the identical real position. */
const LOOP_SETTLE_MS = 120;
const SNAP_TOLERANCE_PX = 2;
const DRAG_THRESHOLD_PX = 5;

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

export default function Carousel({
  children,
  ariaLabel,
  slidesPerView = 1,
  gap = 4,
  arrows = true,
  dots = true,
  arrowsTone = "onImage",
  dotsTone,
  autoplay = DEFAULT_AUTOPLAY_MS,
  loop = true,
  draggable = true,
  keyboard = true,
  fill = false,
  className = "",
  slideClassName = "",
  carouselRef,
  onPageChange,
}: CarouselProps) {
  const t = useTranslations("shared.carousel");
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stopsRef = useRef<number[]>([0]);
  const pagesRef = useRef<number[]>([0]);
  const pageRef = useRef(0);
  const frameRef = useRef(0);

  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  const slides = Children.toArray(children);
  const slideCount = slides.length;

  /* ── Infinite loop: the real slides are framed by clones of the first / last few, so a swipe
        past either end keeps scrolling. Once the scroll settles inside a clone, we jump to its
        identical real twin. The leading clones are added after mount (hydration-safe): the
        server markup then starts on the first real slide, with no jump to hide. ── */
  const maxView = maxSlidesPerView(slidesPerView);
  const loopActive = loop && slideCount > maxView;
  const cloneCount = loopActive ? Math.ceil(maxView) : 0;
  const [mounted, setMounted] = useState(false);
  const lead = loopActive && mounted ? cloneCount : 0;
  const loopRef = useRef<{ lead: number; n: number; pv: number; start: number; cycle: number } | null>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Measure: snap stops → pages, and which page is showing ── */
  const sync = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    const slideEls = Array.from(track.children) as HTMLElement[];

    /* Slides moved per page = slides fully visible at once (fractions round down, min 1). */
    let perView = 1;
    if (slideEls.length > 1) {
      const unit = slideEls[1].offsetLeft - slideEls[0].offsetLeft;
      const gapPx = unit - slideEls[0].offsetWidth;
      perView = Math.max(1, Math.floor((track.clientWidth + gapPx + 1) / unit));
    }

    stopsRef.current = slideEls.map((el) => Math.min(el.offsetLeft, max));

    /* Looping: pages are plain groups of real slides; position wraps modulo one full cycle. */
    if (lead > 0 && slideEls.length >= lead + slideCount + 1) {
      const start = slideEls[lead].offsetLeft;
      const cycle = slideEls[lead + slideCount].offsetLeft - start;
      loopRef.current = { lead, n: slideCount, pv: perView, start, cycle };

      let nearest = 0;
      slideEls.forEach((el, i) => {
        if (Math.abs(el.offsetLeft - track.scrollLeft) < Math.abs(slideEls[nearest].offsetLeft - track.scrollLeft)) nearest = i;
      });
      const pageTotal = Math.ceil(slideCount / perView);
      const virtualPage = loopPageNear(nearest - lead, slideCount, perView);

      pageRef.current = ((virtualPage % pageTotal) + pageTotal) % pageTotal;
      setPageCount(pageTotal);
      setPage(pageRef.current);
      setAtStart(false);
      setAtEnd(false);
      return;
    }

    /* Not looping: stops clamp at the end of the track, last page = last reachable stop. */
    loopRef.current = null;
    const offsets = stopsRef.current;
    const stops = offsets.filter((o, i) => i === 0 || o - offsets[i - 1] > SNAP_TOLERANCE_PX);
    const pages = stops.filter((_, i) => i % perView === 0);
    const lastStop = stops[stops.length - 1];
    if (pages[pages.length - 1] !== lastStop) pages.push(lastStop);

    let nearest = 0;
    pages.forEach((p, i) => {
      if (Math.abs(p - track.scrollLeft) < Math.abs(pages[nearest] - track.scrollLeft)) nearest = i;
    });

    pagesRef.current = pages;
    pageRef.current = nearest;
    setPageCount(pages.length);
    setPage(nearest);
    setAtStart(track.scrollLeft <= SNAP_TOLERANCE_PX);
    setAtEnd(track.scrollLeft >= max - SNAP_TOLERANCE_PX);
  }, [lead, slideCount]);

  /* Inside a clone → jump to the identical real position (invisible: same pixels). */
  const normalizeLoop = useCallback(() => {
    const track = trackRef.current;
    const loopState = loopRef.current;
    if (!track || !loopState || dragRef.current?.moved) return;
    const { start, cycle } = loopState;
    if (track.scrollLeft < start - SNAP_TOLERANCE_PX) track.scrollLeft += cycle;
    else if (track.scrollLeft >= start + cycle - SNAP_TOLERANCE_PX) track.scrollLeft -= cycle;
  }, []);

  const onScroll = useCallback(() => {
    if (!frameRef.current) {
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = 0;
        sync();
      });
    }
    if (loopRef.current) {
      if (settleRef.current) clearTimeout(settleRef.current);
      settleRef.current = setTimeout(normalizeLoop, LOOP_SETTLE_MS);
    }
  }, [sync, normalizeLoop]);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  /* Leading clones just appeared (or the slide set changed): start on the first real slide. */
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (track && lead > 0) track.scrollLeft = (track.children[lead] as HTMLElement).offsetLeft;
  }, [lead, slideCount]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    sync();
    const observer = new ResizeObserver(() => {
      sync();
      /* Keep the same page in view after a resize changes slide widths. */
      const loopState = loopRef.current;
      if (loopState) {
        const el = track.children[loopState.lead + pageRef.current * loopState.pv] as HTMLElement | undefined;
        if (el) track.scrollLeft = el.offsetLeft;
      }
    });
    observer.observe(track);
    return () => {
      observer.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (settleRef.current) clearTimeout(settleRef.current);
    };
  }, [sync, slideCount]);

  useEffect(() => {
    onPageChange?.(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  /* ── Navigation ── */
  const scrollToOffset = useCallback((left: number) => {
    trackRef.current?.scrollTo({ left, behavior: scrollBehavior() });
  }, []);

  const scrollToPage = useCallback(
    (target: number) => {
      const track = trackRef.current;
      const loopState = loopRef.current;
      if (track && loopState) {
        const pageTotal = Math.ceil(loopState.n / loopState.pv);
        const clamped = Math.max(0, Math.min(target, pageTotal - 1));
        scrollToOffset((track.children[loopState.lead + clamped * loopState.pv] as HTMLElement).offsetLeft);
        return;
      }
      const pages = pagesRef.current;
      scrollToOffset(pages[Math.max(0, Math.min(target, pages.length - 1))] ?? 0);
    },
    [scrollToOffset]
  );

  const move = useCallback(
    (direction: 1 | -1) => {
      const track = trackRef.current;
      const loopState = loopRef.current;
      if (track && loopState) {
        /* Step one page from where we are — past either end this lands on the clones, then wraps. */
        const els = Array.from(track.children) as HTMLElement[];
        let nearest = 0;
        els.forEach((el, i) => {
          if (Math.abs(el.offsetLeft - track.scrollLeft) < Math.abs(els[nearest].offsetLeft - track.scrollLeft)) nearest = i;
        });
        const { lead: l, n, pv } = loopState;
        const page = loopPageNear(nearest - l, n, pv);
        const target = Math.max(0, Math.min(l + loopPageStart(page + direction, n, pv), els.length - 1));
        scrollToOffset(els[target].offsetLeft);
        return;
      }
      const count = pagesRef.current.length;
      if (count < 2) return;
      let target = pageRef.current + direction;
      if (target >= count) target = loop ? 0 : count - 1;
      if (target < 0) target = loop ? count - 1 : 0;
      scrollToPage(target);
    },
    [loop, scrollToPage, scrollToOffset]
  );

  useImperativeHandle(carouselRef, () => ({
    next: () => move(1),
    prev: () => move(-1),
    scrollToPage,
  }));

  const pause = useAutoAdvance(rootRef, {
    enabled: autoplay !== false && pageCount > 1,
    intervalMs: autoplay || 0,
    onAdvance: () => move(1),
  });

  const handleArrow = (direction: 1 | -1) => {
    pause();
    move(direction);
  };

  const handleDot = (target: number) => {
    pause();
    scrollToPage(target);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!keyboard || pageCount < 2) return;
    if (e.key === "ArrowLeft") handleArrow(-1);
    else if (e.key === "ArrowRight") handleArrow(1);
  };

  /* ── Mouse drag-to-scroll (touch / trackpad scroll natively) ── */
  const suppressClickRef = useRef(false);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!draggable || !track || e.pointerType !== "mouse" || e.button !== 0) return;
    dragRef.current = { x: e.clientX, left: track.scrollLeft, moved: false };

    const onMove = (ev: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = ev.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > DRAG_THRESHOLD_PX) {
        drag.moved = true;
        setDragging(true);
      }
      if (drag.moved) track.scrollLeft = drag.left - dx;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag?.moved) return;
      /* The click that ends a drag must not follow the link under the cursor. */
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      const nearest = stopsRef.current.reduce(
        (best, stop) =>
          Math.abs(stop - track.scrollLeft) < Math.abs(best - track.scrollLeft) ? stop : best,
        stopsRef.current[0] ?? 0
      );
      track.scrollTo({ left: nearest, behavior: scrollBehavior() });
      setDragging(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  /* ── Render ── */
  const multiplePages = pageCount > 1;
  const canPrev = loopActive || !atStart;
  const canNext = loopActive || !atEnd;
  const dotsOverlay = dots === "overlay";
  const showArrows = arrows !== false && multiplePages;
  const arrowVisibility =
    arrows === "hover"
      ? "opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-80"
      : "";
  const fullHeight = fill ? "h-full" : "";

  /* Real slides in order, framed by clones when looping. */
  const realSlides = slides.map((node, i) => ({
    node,
    key: isValidElement(node) && node.key !== null ? String(node.key) : String(i),
    realIndex: i,
    clone: false,
  }));
  const cloneOf = (i: number, prefix: string) => ({ ...realSlides[i], key: `${prefix}-${realSlides[i].key}`, clone: true });
  const slideList = loopActive
    ? [
        ...(lead > 0 ? realSlides.slice(-lead).map((s) => cloneOf(s.realIndex, "lead")) : []),
        ...realSlides,
        ...realSlides.slice(0, cloneCount).map((s) => cloneOf(s.realIndex, "trail")),
      ]
    : realSlides;

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={`group/carousel ${fill ? "flex flex-col h-full" : ""} ${responsiveClasses(slidesPerView, SLIDES_CLASSES)} ${responsiveClasses(gap, GAP_CLASSES)} ${className}`}
    >
      <div className={`relative ${fill ? "flex-1 min-h-0" : ""}`}>
        <div
          ref={trackRef}
          onScroll={onScroll}
          onPointerDown={onPointerDown}
          onDragStart={(e) => e.preventDefault()}
          onClickCapture={(e) => {
            if (suppressClickRef.current) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          className={`relative flex gap-[var(--gap)] overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${fullHeight} ${
            dragging
              ? "snap-none cursor-grabbing select-none"
              : `snap-x snap-mandatory ${draggable && multiplePages ? "[@media(pointer:fine)]:cursor-grab" : ""}`
          }`}
        >
          {slideList.map(({ node, key, realIndex, clone }) => (
            <div
              key={key}
              role="group"
              aria-roledescription="slide"
              aria-label={t("slide", { number: realIndex + 1, total: slideCount })}
              aria-hidden={clone || undefined}
              inert={clone || undefined}
              className={`min-w-0 shrink-0 snap-start basis-[calc((100%_-_(var(--slides)_-_1)_*_var(--gap))_/_var(--slides))] ${fullHeight} ${slideClassName}`}
            >
              {node}
            </div>
          ))}
        </div>

        {showArrows && canPrev && (
          <CarouselArrow
            direction="prev"
            tone={arrowsTone}
            onClick={() => handleArrow(-1)}
            className={`absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 ${arrowVisibility}`}
          />
        )}
        {showArrows && canNext && (
          <CarouselArrow
            direction="next"
            tone={arrowsTone}
            onClick={() => handleArrow(1)}
            className={`absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 ${arrowVisibility}`}
          />
        )}

        {dots && dotsOverlay && (
          <CarouselDots
            count={pageCount}
            index={page}
            onSelect={handleDot}
            tone={dotsTone ?? "onImage"}
            className="absolute bottom-2 inset-x-0 z-[3] pointer-events-none [&_button]:pointer-events-auto"
          />
        )}
      </div>

      {/* Reserve the row while slides exist so the dots appearing after measuring don't shift the layout */}
      {dots && !dotsOverlay && slideCount > 1 && (
        <div className="h-8 mt-2 shrink-0">
          <CarouselDots
            count={pageCount}
            index={page}
            onSelect={handleDot}
            tone={dotsTone ?? "onSurface"}
          />
        </div>
      )}
    </div>
  );
}
