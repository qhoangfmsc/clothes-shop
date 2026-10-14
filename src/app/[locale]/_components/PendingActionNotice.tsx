"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ListChecks } from "lucide-react";

interface PendingActionNoticeProps {
  /** Count from `usePendingCounts()`; `undefined` (no permission) or 0 hides the notice */
  count: number | undefined;
  /** Headline with the number, e.g. "3 đơn cần xử lý" */
  title: string;
  /** What is counted, and what is left out */
  includes: string;
  excludes?: string;
  /** What the admin does about it */
  how: string;
  /** Extra remark under the steps (a known catch) */
  note?: string;
  /** The list below is showing exactly the counted rows */
  active: boolean;
  /** Label of the button that turns the filter on */
  viewLabel: string;
  /** Label of the button that turns it off (default "View all") */
  viewAllLabel?: string;
  onToggle: () => void;
  /** At zero, keep a one-line "all done" with the way back while the filter is on (for filters the admin switched on) */
  keepWhenDone?: boolean;
  /** A second line without a count (e.g. "approved, waiting for the parcel") with its own button */
  extra?: ReactNode;
}

/**
 * "Work waiting" box at the top of an admin page: the number, what it counts, how to deal with it, and one
 * button that filters the list to exactly those rows. Soft gold, not an alarm: it is a to-do, not an error.
 * Hidden at zero; with `keepWhenDone`, while the filter is on and everything got done it shrinks to a one-line "all done".
 */
export default function PendingActionNotice({
  count,
  title,
  includes,
  excludes,
  how,
  note,
  active,
  viewLabel,
  viewAllLabel,
  onToggle,
  keepWhenDone = false,
  extra,
}: PendingActionNoticeProps) {
  const t = useTranslations("admin.components.pendingNotice");
  if (count === undefined) return null;

  const button = (label: string) => (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className="shrink-0 py-1.5 px-3 pointer-coarse:min-h-11 text-xs font-semibold font-primary rounded-sm border border-[var(--accent-primary)] bg-transparent text-[var(--text-accent)] cursor-pointer hover:bg-[rgba(201,169,110,0.15)]"
    >
      {label}
    </button>
  );

  if (count === 0) {
    if (!active || !keepWhenDone) return null;
    return (
      <div
        role="status"
        className="shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] py-2.5 px-4 font-primary text-sm text-[var(--text-secondary)]"
      >
        <span>{t("allDone")}</span>
        {button(viewAllLabel ?? t("viewAll"))}
      </div>
    );
  }

  return (
    <section
      aria-label={title}
      className="shrink-0 rounded-lg border border-[rgba(201,169,110,0.4)] bg-[rgba(201,169,110,0.08)] p-4 flex flex-col gap-3 font-primary"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="m-0 flex items-center gap-2 text-sm font-semibold text-[var(--text-heading)]">
          <ListChecks size={16} className="shrink-0 text-[var(--accent-primary)]" />
          {title}
        </h2>
        {button(active ? (viewAllLabel ?? t("viewAll")) : viewLabel)}
      </div>
      {active && <p className="m-0 text-xs font-medium text-[var(--text-accent)]">{t("filtering")}</p>}
      <div className="flex flex-col gap-1.5 text-xs text-[var(--text-secondary)] leading-[150%]">
        <p className="m-0">{includes}</p>
        {excludes && <p className="m-0 text-[var(--text-muted)]">{excludes}</p>}
        <p className="m-0">
          <strong className="font-semibold text-[var(--text-primary)]">{t("howLabel")}</strong> {how}
        </p>
        {note && <p className="m-0 text-[var(--text-muted)]">{note}</p>}
      </div>
      {extra}
    </section>
  );
}
