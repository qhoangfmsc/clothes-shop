"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

/** `onImage`: translucent dark control for photos / dark sections. `onSurface`: for light page backgrounds. */
export type CarouselTone = "onImage" | "onSurface";

/* ═══════════════════════════════ Arrow ═══════════════════════════════ */

const ARROW_TONE: Record<CarouselTone, string> = {
  onImage:
    "border-[var(--color-pearl-cream)]/20 bg-[var(--color-noir)]/50 text-[var(--color-pearl-cream)] backdrop-blur-lg hover:bg-[var(--color-noir)]/75",
  onSurface:
    "border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-md hover:bg-[var(--bg-secondary)]",
};

interface CarouselArrowProps {
  direction: "prev" | "next";
  onClick: () => void;
  disabled?: boolean;
  tone?: CarouselTone;
  /** Extra classes — usually positioning (`absolute left-3 top-1/2 -translate-y-1/2`). */
  className?: string;
}

export function CarouselArrow({
  direction,
  onClick,
  disabled,
  tone = "onImage",
  className = "",
}: CarouselArrowProps) {
  const t = useTranslations("shared.carousel");
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={t(direction)}
      className={`z-[3] flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border cursor-pointer transition-all duration-[150ms] disabled:opacity-0 disabled:pointer-events-none ${ARROW_TONE[tone]} ${className}`}
    >
      <Icon size={20} />
    </button>
  );
}

/* ═══════════════════════════════ Dots ═══════════════════════════════ */

const DOT_TONE: Record<CarouselTone, string> = {
  onImage:
    "bg-[var(--color-pearl-cream)]/70 shadow-[0_0_0_1px_rgba(58,49,42,0.25)] group-hover:bg-[var(--color-pearl-cream)]",
  onSurface: "bg-[var(--color-obsidian)]/20 group-hover:bg-[var(--color-obsidian)]/40",
};

interface CarouselDotsProps {
  count: number;
  index: number;
  onSelect: (index: number) => void;
  tone?: CarouselTone;
  className?: string;
}

/** Position dots: the active one stretches into a pill so the slider reads as swipeable. */
export function CarouselDots({
  count,
  index,
  onSelect,
  tone = "onImage",
  className = "",
}: CarouselDotsProps) {
  const t = useTranslations("shared.carousel");
  if (count < 2) return null;
  return (
    <div className={`flex justify-center items-center ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={t("dot", { number: i + 1, total: count })}
          aria-current={i === index}
          className="group flex items-center justify-center h-8 px-1 cursor-pointer"
        >
          <span
            className={`block h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
              i === index
                ? "w-6 bg-[var(--color-champagne-gold)]"
                : `w-1.5 ${DOT_TONE[tone]}`
            }`}
          />
        </button>
      ))}
    </div>
  );
}
