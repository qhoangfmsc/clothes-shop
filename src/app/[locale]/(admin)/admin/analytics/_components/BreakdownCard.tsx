"use client";

import { useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { AnalyticsBreakdownRow, AnalyticsBreakdowns } from "@/src/types/analytics";
import { SERIES_COLORS } from "../_common/constants";

export type BreakdownKey = keyof AnalyticsBreakdowns;

interface BreakdownCardProps {
  /** Card title key under `admin.analytics.cards` */
  card: "pages" | "sources" | "locations" | "devices";
  tabs: readonly BreakdownKey[];
  data: AnalyticsBreakdowns;
}

/** "VN" → "🇻🇳" (regional indicator symbols); empty for anything that is not a 2-letter code */
const flagOf = (code: string) =>
  /^[A-Za-z]{2}$/.test(code)
    ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)))
    : "";

export default function BreakdownCard({ card, tabs, data }: BreakdownCardProps) {
  const t = useTranslations("admin.analytics");
  const format = useFormatter();
  const locale = useLocale();
  const [active, setActive] = useState<BreakdownKey>(tabs[0]);

  const rows = data[tabs.includes(active) ? active : tabs[0]];
  const topVisitors = Math.max(1, ...(rows ?? []).map((r) => r.visitors));

  const regionNames = new Intl.DisplayNames([locale], { type: "region" });
  const labelOf = (key: BreakdownKey, row: AnalyticsBreakdownRow) => {
    if (!row.key) return t(key === "referrers" ? "breakdown.direct" : "breakdown.unknown");
    if (key === "countries") {
      let name = row.key;
      try {
        name = regionNames.of(row.key.toUpperCase()) ?? row.key;
      } catch {
        /* not a region code: show it as sent */
      }
      return `${flagOf(row.key)} ${name}`.trim();
    }
    if (key === "devices") {
      const messageKey = `breakdown.deviceTypes.${row.key.toLowerCase()}`;
      return t.has(messageKey as never) ? t(messageKey as never) : row.key;
    }
    return row.key;
  };

  return (
    <section className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-[var(--space-5)] flex flex-col gap-[var(--space-4)] min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-3)]">
        <h2 className="m-0 text-sm font-semibold text-[var(--text-primary)] font-primary">
          {t(`cards.${card}`)}
        </h2>
        {tabs.length > 1 && (
          <div role="tablist" className="flex flex-wrap gap-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={tab === active}
                onClick={() => setActive(tab)}
                className={`border-none rounded-[var(--radius-pill)] py-1 px-2.5 text-xs font-primary font-medium cursor-pointer transition-colors ${
                  tab === active
                    ? "bg-[var(--accent-primary)] text-[var(--text-on-gold)]"
                    : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {t(`tabs.${tab}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {!rows || rows.length === 0 ? (
        <p className="m-0 py-[var(--space-8)] text-center text-sm text-[var(--text-muted)] font-primary">
          {t(rows ? "breakdown.empty" : "breakdown.unavailable")}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex justify-end gap-[var(--space-4)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] font-primary pb-1">
            <span className="w-16 text-right">{t("breakdown.visitors")}</span>
            <span className="w-16 text-right">{t("breakdown.pageviews")}</span>
          </div>
          {rows.map((row, i) => (
            <div
              key={`${row.key}-${i}`}
              className="relative flex items-center gap-[var(--space-4)] py-1.5 px-2 rounded-[var(--radius-sm)] text-sm font-primary"
            >
              {/* Bar behind the row = share of the busiest row's visitors */}
              <span
                aria-hidden
                className="absolute inset-y-0.5 left-0 rounded-[var(--radius-sm)] opacity-15"
                style={{
                  width: `${(row.visitors / topVisitors) * 100}%`,
                  background: SERIES_COLORS.visitors,
                }}
              />
              <span
                className="relative flex-1 min-w-0 truncate text-[var(--text-primary)]"
                title={labelOf(active, row)}
              >
                {labelOf(active, row)}
              </span>
              <span className="relative w-16 text-right font-semibold text-[var(--text-primary)]">
                {format.number(row.visitors)}
              </span>
              <span className="relative w-16 text-right text-[var(--text-muted)]">
                {format.number(row.pageviews)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
