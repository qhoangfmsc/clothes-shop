"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

interface StarPickerProps {
  /** 0 = nothing chosen yet */
  value: number;
  onChange: (rating: number) => void;
  invalid?: boolean;
}

/**
 * 1–5 star choice built on radio inputs, so arrow keys, focus and screen readers work for free.
 * Each star is a 44 px target; the mouse previews the star under the pointer, touch just taps.
 */
export default function StarPicker({ value, onChange, invalid = false }: StarPickerProps) {
  const t = useTranslations("shared.reviews.form.rating");
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex flex-col gap-1.5">
      <div role="radiogroup" aria-label={t("label")} aria-invalid={invalid} className="flex items-center" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <label
            key={star}
            onMouseEnter={() => setHover(star)}
            className="relative flex size-11 cursor-pointer items-center justify-center rounded-full has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--accent-primary)]"
          >
            <input
              type="radio"
              name="review-rating"
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              aria-label={t("option", { stars: star })}
              className="sr-only"
            />
            <Star
              size={30}
              aria-hidden="true"
              fill={star <= shown ? "currentColor" : "none"}
              className={`transition-colors motion-reduce:transition-none ${
                star <= shown ? "text-[var(--color-champagne-gold)]" : invalid ? "text-[var(--accent-rose)]" : "text-[var(--text-disabled)]"
              }`}
            />
          </label>
        ))}
      </div>
      <span className="min-h-4 font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]" aria-live="polite">
        {value > 0 ? t(`hint.${value as 1 | 2 | 3 | 4 | 5}`) : ""}
      </span>
    </div>
  );
}
