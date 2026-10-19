"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useFormatter, useTranslations } from "next-intl";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useAdminAnalytics } from "@/src/hooks/use-admin-analytics";
import { ApiError } from "@/src/lib/api";
import { percentChange } from "@/src/lib/percent-change";
import {
  ANALYTICS_RANGES,
  ANALYTICS_RANGE_DAYS,
  type AnalyticsRange,
  type AnalyticsReport,
} from "@/src/types/analytics";
import { BREAKDOWN_TABS, UTM_TABS, VERCEL_ANALYTICS_URL } from "./_common/constants";
import BreakdownCard from "./_components/BreakdownCard";
import FunnelCard from "./_components/FunnelCard";
import StatTile from "./_components/StatTile";
import StatusCard from "./_components/StatusCard";

/* Recharts is ~100 KB: keep it out of every other admin page's bundle */
const TrafficChart = dynamic(() => import("./_components/TrafficChart"), {
  ssr: false,
  loading: () => <div className="h-[17.5rem]" />,
});

const CARD =
  "bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-[var(--space-5)]";

export default function AnalyticsContent() {
  const t = useTranslations("admin.analytics");
  const format = useFormatter();
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const { data, error, isLoading, isValidating, refresh } = useAdminAnalytics(range, "full");

  const report = data?.status === "ok" ? data.report : null;
  const ranges = ANALYTICS_RANGES.filter(
    (r) => !report || ANALYTICS_RANGE_DAYS[r] <= report.capabilities.maxRangeDays
  );
  /* The server may clamp the range to what the plan covers; follow what it actually returned */
  const activeRange = report?.range ?? range;

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <header className="flex flex-wrap items-start justify-between gap-[var(--space-4)]">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl text-[var(--text-heading)] font-normal m-0">
            {t("title")}
          </h1>
          <p className="m-0 text-sm text-[var(--text-muted)] font-primary">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-[var(--space-2)]">
          <button
            type="button"
            onClick={refresh}
            disabled={isValidating}
            className="inline-flex items-center gap-2 py-2 px-3 bg-transparent border border-[var(--border-default)] rounded-[var(--radius-md)] text-xs font-primary font-medium text-[var(--text-secondary)] cursor-pointer disabled:opacity-50 disabled:cursor-default"
          >
            <RefreshCw
              size={14}
              aria-hidden
              className={isValidating ? "animate-spin" : undefined}
            />
            {t("actions.refresh")}
          </button>
          <a
            href={VERCEL_ANALYTICS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 py-2 px-3 bg-transparent border border-[var(--border-default)] rounded-[var(--radius-md)] text-xs font-primary font-medium text-[var(--text-secondary)] no-underline"
          >
            <ExternalLink size={14} aria-hidden />
            {t("actions.openVercel")}
          </a>
        </div>
      </header>

      {/* One filter row above everything it scopes */}
      <div role="tablist" aria-label={t("range.label")} className="flex flex-wrap gap-2">
        {ranges.map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={r === activeRange}
            onClick={() => setRange(r)}
            className={`border rounded-[var(--radius-pill)] py-1.5 px-4 text-xs font-primary font-semibold cursor-pointer transition-colors ${
              r === activeRange
                ? "bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--text-on-gold)]"
                : "bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-gold)]"
            }`}
          >
            {t(`range.${r}`)}
          </button>
        ))}
      </div>

      {data?.status === "not_configured" ? (
        <StatusCard kind="not_configured" missing={data.missing} />
      ) : data?.status === "error" ? (
        <StatusCard kind="error" reason={data.reason} onRetry={refresh} />
      ) : error && !data ? (
        <StatusCard
          kind="error"
          reason={error instanceof ApiError && error.status === 403 ? "forbidden" : "network"}
          onRetry={refresh}
        />
      ) : (
        <div
          className={`flex flex-col gap-[var(--space-6)] transition-opacity ${
            isValidating && report ? "opacity-60" : ""
          }`}
        >
          <KpiRow report={report} loading={isLoading || !report} />

          <section className={`${CARD} flex flex-col gap-[var(--space-3)]`}>
            <h2 className="m-0 text-sm font-semibold text-[var(--text-primary)] font-primary">
              {t("chart.title")}
            </h2>
            {report ? (
              <TrafficChart series={report.series} granularity={report.granularity} />
            ) : (
              <div className="h-[17.5rem]" />
            )}
          </section>

          {report?.funnel && <FunnelCard steps={report.funnel} />}

          {report?.breakdowns && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--space-6)]">
              <BreakdownCard card="pages" tabs={BREAKDOWN_TABS.pages} data={report.breakdowns} />
              <BreakdownCard
                card="sources"
                tabs={BREAKDOWN_TABS.sources.filter(
                  (tab) => report.capabilities.utm || !(UTM_TABS as readonly string[]).includes(tab)
                )}
                data={report.breakdowns}
              />
              <BreakdownCard card="locations" tabs={["countries"]} data={report.breakdowns} />
              <BreakdownCard
                card="devices"
                tabs={BREAKDOWN_TABS.devices}
                data={report.breakdowns}
              />
            </div>
          )}

          {report && (
            <p className="m-0 text-xs text-[var(--text-muted)] font-primary">
              {t("updatedAt", { time: format.dateTime(new Date(report.generatedAt), "dateTime") })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function KpiRow({ report, loading }: { report: AnalyticsReport | null; loading: boolean }) {
  const t = useTranslations("admin.analytics.kpi");
  const format = useFormatter();

  const totals = report?.totals;
  const previous = report?.previousTotals;
  const perVisitor = totals && totals.visitors > 0 ? totals.pageviews / totals.visitors : 0;
  const previousPerVisitor =
    previous && previous.visitors > 0 ? previous.pageviews / previous.visitors : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--space-5)]">
      <StatTile
        label={t("visitors.label")}
        value={format.number(totals?.visitors ?? 0)}
        hint={t("visitors.hint")}
        change={totals ? percentChange(totals.visitors, previous?.visitors) : null}
        loading={loading}
      />
      <StatTile
        label={t("pageviews.label")}
        value={format.number(totals?.pageviews ?? 0)}
        hint={t("pageviews.hint")}
        change={totals ? percentChange(totals.pageviews, previous?.pageviews) : null}
        loading={loading}
      />
      <StatTile
        label={t("viewsPerVisitor.label")}
        value={format.number(perVisitor, { maximumFractionDigits: 1 })}
        hint={t("viewsPerVisitor.hint")}
        change={percentChange(perVisitor, previousPerVisitor)}
        loading={loading}
      />
    </div>
  );
}
