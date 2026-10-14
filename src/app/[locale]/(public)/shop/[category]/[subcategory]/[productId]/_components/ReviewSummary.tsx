"use client";

import { useFormatter, useTranslations } from "next-intl";
import StarRating from "@/src/app/[locale]/_components/StarRating";
import { REVIEW_FITS, type ReviewSummary as ReviewSummaryData } from "@/src/types/review";

interface ReviewSummaryProps {
  summary: ReviewSummaryData;
  /** Star filter currently applied to the list (1–5) */
  activeRating: number | null;
  /** Tap a distribution row to filter the list by that star count (again to clear) */
  onSelectRating: (rating: number | null) => void;
}

const STARS_DESC = [5, 4, 3, 2, 1] as const;

/** Average, count, 1–5 star bars and (when anyone answered) the fit bars. Every number is the BE's. */
export default function ReviewSummary({ summary, activeRating, onSelectRating }: ReviewSummaryProps) {
  const t = useTranslations("public.product.reviews.summary");
  const tFit = useTranslations("shared.reviews.fit");
  const format = useFormatter();
  const { ratingAverage, ratingCount, distribution, fit } = summary;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <span className="font-primary text-[32px] font-medium text-[var(--text-heading)] tracking-[-0.04em] leading-none">
            {ratingAverage !== null ? format.number(ratingAverage, "decimal1") : "–"}
          </span>
          {ratingAverage !== null && <StarRating rating={ratingAverage} size={18} />}
        </div>
        <span className="font-primary text-[13px] font-medium text-[var(--text-muted)] tracking-[-0.02em]">
          {t("basedOn", { count: ratingCount })}
        </span>
      </div>

      <ul className="m-0 p-0 list-none flex flex-col gap-1" aria-label={t("distribution")}>
        {STARS_DESC.map((stars) => {
          const count = distribution[String(stars) as "1"] ?? 0;
          const active = activeRating === stars;
          return (
            <li key={stars}>
              <button
                type="button"
                onClick={() => onSelectRating(active ? null : stars)}
                aria-pressed={active}
                aria-label={t("row", { stars, count })}
                className={`flex w-full items-center gap-3 min-h-9 pointer-coarse:min-h-11 rounded-sm border-0 bg-transparent px-1 cursor-pointer font-primary text-xs tracking-[-0.02em] transition-colors motion-reduce:transition-none hover:bg-[var(--bg-elevated)] ${
                  active ? "bg-[var(--bg-elevated)] text-[var(--text-heading)] font-semibold" : "text-[var(--text-muted)]"
                }`}
              >
                <span className="w-4 shrink-0 text-right tabular-nums" aria-hidden="true">
                  {stars}
                </span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-elevated)]" aria-hidden="true">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-champagne-gold)]"
                    style={{ width: ratingCount > 0 ? `${(count / ratingCount) * 100}%` : "0%" }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right tabular-nums" aria-hidden="true">
                  {count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {fit.total > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="m-0 font-primary text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-accent)]">
            {t("fitTitle")}
          </h3>
          <ul className="m-0 p-0 list-none flex flex-col gap-2">
            {REVIEW_FITS.map((key) => (
              <li key={key} className="flex items-center gap-3 font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">
                <span className="w-24 shrink-0 text-[var(--text-secondary)]">{tFit(key)}</span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-elevated)]" aria-hidden="true">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent-primary)]"
                    style={{ width: `${(fit[key] / fit.total) * 100}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right tabular-nums">{fit[key]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
