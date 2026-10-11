"use client";

import { useFormatter, useTranslations } from "next-intl";
import { TrendingDown, TrendingUp } from "lucide-react";

interface StatTileProps {
  label: string;
  value: string;
  hint: string;
  /** Fractional change vs the previous period (0.12 = +12%); null when there is no baseline */
  change: number | null;
  loading: boolean;
}

export default function StatTile({ label, value, hint, change, loading }: StatTileProps) {
  const t = useTranslations("admin.analytics.kpi");
  const format = useFormatter();

  const percent =
    change === null
      ? null
      : format.number(Math.abs(change), { style: "percent", maximumFractionDigits: 1 });
  const rising = change !== null && change >= 0;

  return (
    <div className="flex flex-col gap-1 py-[var(--space-5)] px-[var(--space-6)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)]">
      <p className="m-0 text-xs font-semibold text-[var(--text-secondary)] font-primary">{label}</p>
      <p className="m-0 font-display text-xl leading-tight text-[var(--text-heading)]">
        {loading ? "—" : value}
      </p>
      <div className="flex flex-wrap items-center gap-x-2 text-xs font-primary text-[var(--text-muted)]">
        {!loading && percent !== null && (
          <span
            className="inline-flex items-center gap-1 font-semibold"
            style={{ color: rising ? "var(--text-secondary)" : "var(--accent-rose)" }}
            aria-label={t(rising ? "increase" : "decrease", { value: percent })}
          >
            {rising ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}
            {percent}
          </span>
        )}
        <span>{!loading && percent !== null ? t("vsPrevious") : hint}</span>
      </div>
    </div>
  );
}
