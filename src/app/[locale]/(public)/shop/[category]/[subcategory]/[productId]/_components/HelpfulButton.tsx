"use client";

import { ThumbsUp } from "lucide-react";
import { useTranslations } from "next-intl";

interface HelpfulButtonProps {
  count: number;
  voted: boolean;
  /** A request is in flight: the button cannot be pressed twice */
  busy: boolean;
  /** The visitor wrote this review: the BE refuses the vote, so a plain note replaces the button */
  own: boolean;
  onToggle: () => void;
}

/** "Helpful (n)": toggles on and off, filled when the visitor already marked the review */
export default function HelpfulButton({ count, voted, busy, own, onToggle }: HelpfulButtonProps) {
  const t = useTranslations("public.product.reviews.item");

  if (own) {
    return (
      <span className="inline-flex items-center gap-1.5 font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
        <ThumbsUp size={13} aria-hidden="true" />
        {t("helpfulOwn", { count })}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      aria-pressed={voted}
      className={`inline-flex items-center gap-1.5 min-h-9 pointer-coarse:min-h-11 rounded-full border px-3.5 font-primary text-xs font-medium cursor-pointer transition-colors motion-reduce:transition-none disabled:cursor-wait disabled:opacity-60 ${
        voted
          ? "border-[var(--accent-primary)] bg-[rgba(201,169,110,0.12)] text-[var(--accent-primary)]"
          : "border-[var(--border-subtle)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-light)]"
      }`}
    >
      <ThumbsUp size={13} fill={voted ? "currentColor" : "none"} aria-hidden="true" />
      {t("helpful", { count })}
    </button>
  );
}
