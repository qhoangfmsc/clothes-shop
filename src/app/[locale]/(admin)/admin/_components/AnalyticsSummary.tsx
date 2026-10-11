"use client";

import { useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { BarChart3, ChevronRight } from "lucide-react";
import { Link } from "@/src/i18n/navigation";
import { useAdminAnalytics } from "@/src/hooks/use-admin-analytics";
import { percentChange } from "@/src/lib/percent-change";
import type { AdminOrder } from "@/src/hooks/use-admin-api";

interface AnalyticsSummaryProps {
  orders: AdminOrder[];
  ordersLoading: boolean;
}

/** Dashboard section: last 7 days of storefront traffic, with a link to the full Analytics page.
   Conversion = non-cancelled orders in the same window ÷ unique visitors. */
export default function AnalyticsSummary({ orders, ordersLoading }: AnalyticsSummaryProps) {
  const t = useTranslations("admin.dashboard.analytics");
  const format = useFormatter();
  const { data, isLoading } = useAdminAnalytics("7d", "summary");
  const report = data?.status === "ok" ? data.report : null;

  const ordersInRange = useMemo(() => {
    if (!report) return 0;
    const since = Date.parse(report.since);
    return orders.filter((o) => o.status !== "cancelled" && Date.parse(o.createdAt) >= since)
      .length;
  }, [orders, report]);

  const loading = isLoading || ordersLoading;
  const visitors = report?.totals.visitors ?? 0;
  const conversion = visitors > 0 ? ordersInRange / visitors : null;

  return (
    <section className="flex flex-col gap-[var(--space-4)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-[var(--space-5)]">
      <div className="flex items-center justify-between gap-[var(--space-3)]">
        <div className="flex items-center gap-[var(--space-2)]">
          <BarChart3 size={16} className="text-[var(--accent-primary)]" aria-hidden />
          <h2 className="text-sm font-semibold text-[var(--text-primary)] font-primary m-0">
            {t("title")}
          </h2>
        </div>
        <Link
          href="/admin/analytics"
          className="inline-flex items-center gap-1 text-xs font-primary font-semibold text-[var(--text-brand)] no-underline"
        >
          {t("viewDetails")} <ChevronRight size={12} aria-hidden />
        </Link>
      </div>

      {!loading && !report ? (
        <p className="m-0 py-[var(--space-4)] text-sm text-[var(--text-muted)] font-primary">
          {t(data?.status === "not_configured" ? "notConfigured" : "unavailable")}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[repeat(3,1fr)_minmax(0,1.4fr)] gap-[var(--space-5)] items-end">
          <Metric
            label={t("visitors")}
            value={loading ? "—" : format.number(visitors)}
            change={report ? percentChange(visitors, report.previousTotals?.visitors) : null}
          />
          <Metric
            label={t("pageviews")}
            value={loading ? "—" : format.number(report?.totals.pageviews ?? 0)}
            change={
              report
                ? percentChange(report.totals.pageviews, report.previousTotals?.pageviews)
                : null
            }
          />
          <Metric
            label={t("conversion")}
            value={
              loading || conversion === null
                ? "—"
                : format.number(conversion, { style: "percent", maximumFractionDigits: 2 })
            }
            hint={t("conversionHint", { count: ordersInRange })}
          />
          <Sparkline values={report?.series.map((p) => p.visitors) ?? []} label={t("sparkline")} />
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  change,
  hint,
}: {
  label: string;
  value: string;
  change?: number | null;
  hint?: string;
}) {
  const t = useTranslations("admin.dashboard.analytics");
  const format = useFormatter();
  return (
    <div className="flex flex-col gap-0.5 min-w-0 font-primary">
      <p className="m-0 text-xs font-semibold text-[var(--text-secondary)]">{label}</p>
      <p className="m-0 font-display text-xl leading-tight text-[var(--text-heading)]">{value}</p>
      <p className="m-0 text-xs text-[var(--text-muted)]">
        {hint ??
          (change === null || change === undefined
            ? t("last7Days")
            : t("vsPrevious", {
                value: format.number(change, {
                  style: "percent",
                  maximumFractionDigits: 1,
                  signDisplay: "exceptZero",
                }),
              }))}
      </p>
    </div>
  );
}

/** Tiny dependency-free trend line; the full chart (Recharts) lives on the Analytics page. */
function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return <div aria-hidden className="h-12" />;

  const max = Math.max(1, ...values);
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${26 - (v / max) * 24}`)
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className="w-full h-12 overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent-primary)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
