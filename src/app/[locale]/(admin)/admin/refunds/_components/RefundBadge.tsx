"use client";

import { useTranslations } from "next-intl";

const STYLES: Record<string, string> = {
  REQUESTED: "bg-[rgba(240,228,166,0.2)] text-[var(--color-honey)]",
  COMPLETED: "bg-[rgba(163,177,138,0.15)] text-[var(--accent-sage)]",
  REJECTED: "bg-[rgba(107,101,96,0.08)] text-[var(--text-muted)]",
};

/** State of one refund request */
export default function RefundBadge({ status }: { status: string }) {
  const t = useTranslations("admin.refunds.status");
  return (
    <span
      className={`inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary whitespace-nowrap ${
        STYLES[status] ?? STYLES.REJECTED
      }`}
    >
      {t.has(status as never) ? t(status as never) : status}
    </span>
  );
}
