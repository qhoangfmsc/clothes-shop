"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsReport, AnalyticsSeriesPoint } from "@/src/types/analytics";
import { SERIES_COLORS } from "../_common/constants";

interface TrafficChartProps {
  series: AnalyticsSeriesPoint[];
  granularity: AnalyticsReport["granularity"];
}

export default function TrafficChart({ series, granularity }: TrafficChartProps) {
  const t = useTranslations("admin.analytics.chart");
  const format = useFormatter();
  const [showTable, setShowTable] = useState(false);

  const hasTraffic = series.some((p) => p.pageviews > 0);
  const formatTime = (timestamp: string, long = false) =>
    format.dateTime(
      new Date(timestamp),
      granularity === "hour"
        ? { hour: "2-digit", minute: "2-digit", ...(long && { day: "numeric", month: "short" }) }
        : { day: "numeric", month: "short", ...(long && { year: "numeric" }) }
    );

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-3)]">
        <ul className="flex items-center gap-[var(--space-5)] m-0 p-0 list-none">
          {(["visitors", "pageviews"] as const).map((key) => (
            <li
              key={key}
              className="flex items-center gap-2 text-xs font-primary text-[var(--text-secondary)]"
            >
              <span
                aria-hidden
                className="inline-block w-4 h-0.5 rounded-full"
                style={{ background: SERIES_COLORS[key] }}
              />
              {t(`series.${key}`)}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-pressed={showTable}
          className="bg-transparent border border-[var(--border-default)] rounded-[var(--radius-md)] py-1 px-3 text-xs font-primary font-medium text-[var(--text-secondary)] cursor-pointer hover:border-[var(--border-gold)]"
        >
          {showTable ? t("viewChart") : t("viewTable")}
        </button>
      </div>

      {!hasTraffic ? (
        <p className="m-0 py-[var(--space-12)] text-center text-sm text-[var(--text-muted)] font-primary">
          {t("empty")}
        </p>
      ) : showTable ? (
        <div className="max-h-[20rem] overflow-auto">
          <table className="w-full border-collapse text-xs font-primary">
            <thead>
              <tr className="text-left text-[var(--text-muted)]">
                <th className="py-1.5 pr-3 font-semibold sticky top-0 bg-[var(--bg-secondary)]">
                  {t("table.time")}
                </th>
                <th className="py-1.5 px-3 font-semibold text-right sticky top-0 bg-[var(--bg-secondary)]">
                  {t("series.visitors")}
                </th>
                <th className="py-1.5 pl-3 font-semibold text-right sticky top-0 bg-[var(--bg-secondary)]">
                  {t("series.pageviews")}
                </th>
              </tr>
            </thead>
            <tbody>
              {series.map((p) => (
                <tr key={p.timestamp} className="border-t border-[var(--border-subtle)]">
                  <td className="py-1.5 pr-3 text-[var(--text-secondary)]">
                    {formatTime(p.timestamp, true)}
                  </td>
                  <td className="py-1.5 px-3 text-right text-[var(--text-primary)] font-semibold">
                    {format.number(p.visitors)}
                  </td>
                  <td className="py-1.5 pl-3 text-right text-[var(--text-primary)] font-semibold">
                    {format.number(p.pageviews)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-[17.5rem] w-full" role="img" aria-label={t("ariaLabel")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="visitorsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES_COLORS.visitors} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={SERIES_COLORS.visitors} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value: string) => formatTime(value)}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              />
              <YAxis
                width={44}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => format.number(value, { notation: "compact" })}
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              />
              <Tooltip
                cursor={{ stroke: "var(--text-muted)", strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  const point = active ? (payload?.[0]?.payload as AnalyticsSeriesPoint) : null;
                  if (!point) return null;
                  return (
                    <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] py-2 px-3 shadow-md font-primary">
                      <p className="m-0 mb-1.5 text-xs text-[var(--text-muted)]">
                        {formatTime(point.timestamp, true)}
                      </p>
                      {(["visitors", "pageviews"] as const).map((key) => (
                        <p key={key} className="m-0 flex items-center gap-2 text-xs">
                          <span
                            aria-hidden
                            className="inline-block w-3 h-0.5 rounded-full"
                            style={{ background: SERIES_COLORS[key] }}
                          />
                          <strong className="text-[var(--text-primary)]">
                            {format.number(point[key])}
                          </strong>
                          <span className="text-[var(--text-muted)]">{t(`series.${key}`)}</span>
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="visitors"
                stroke={SERIES_COLORS.visitors}
                strokeWidth={2}
                fill="url(#visitorsFill)"
                dot={false}
                activeDot={{ r: 4, stroke: "var(--bg-primary)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="pageviews"
                stroke={SERIES_COLORS.pageviews}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: "var(--bg-primary)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
