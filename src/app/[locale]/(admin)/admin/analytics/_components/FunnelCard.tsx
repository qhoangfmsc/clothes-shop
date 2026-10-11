"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { AnalyticsFunnelStep } from "@/src/types/analytics";
import { SERIES_COLORS } from "../_common/constants";

export default function FunnelCard({ steps }: { steps: AnalyticsFunnelStep[] }) {
  const t = useTranslations("admin.analytics.funnel");
  const format = useFormatter();

  const first = steps[0]?.count ?? 0;
  const last = steps[steps.length - 1]?.count ?? 0;
  const percent = (value: number) =>
    format.number(value, { style: "percent", maximumFractionDigits: 1 });

  return (
    <section className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-[var(--space-5)] flex flex-col gap-[var(--space-4)]">
      <div className="flex flex-wrap items-baseline justify-between gap-[var(--space-3)]">
        <h2 className="m-0 text-sm font-semibold text-[var(--text-primary)] font-primary">
          {t("title")}
        </h2>
        {first > 0 && (
          <p className="m-0 text-xs text-[var(--text-muted)] font-primary">
            {t("overall", { rate: percent(last / first) })}
          </p>
        )}
      </div>

      {first === 0 ? (
        <p className="m-0 py-[var(--space-8)] text-center text-sm text-[var(--text-muted)] font-primary">
          {t("empty")}
        </p>
      ) : (
        <ol className="m-0 p-0 list-none flex flex-col gap-[var(--space-3)]">
          {steps.map((step, i) => {
            const previous = steps[i - 1]?.count ?? 0;
            return (
              <li key={step.event} className="flex flex-col gap-1.5 font-primary">
                <div className="flex items-baseline justify-between gap-[var(--space-3)] text-sm">
                  <span className="text-[var(--text-primary)]">{t(`steps.${step.event}`)}</span>
                  <span className="flex items-baseline gap-2">
                    <strong className="text-[var(--text-primary)]">
                      {format.number(step.count)}
                    </strong>
                    {i > 0 && previous > 0 && (
                      <span className="text-xs text-[var(--text-muted)]">
                        {t("fromPrevious", { rate: percent(step.count / previous) })}
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 bg-[var(--bg-elevated)] rounded-[var(--radius-pill)] overflow-hidden">
                  <div
                    className="h-full rounded-[var(--radius-pill)]"
                    style={{
                      width: `${Math.min(100, (step.count / first) * 100)}%`,
                      background: SERIES_COLORS.visitors,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
