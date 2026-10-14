"use client";

import { useTranslations } from "next-intl";

const STYLES: Record<string, string> = {
  REQUESTED: "bg-[rgba(240,228,166,0.2)] text-[var(--color-honey)]",
  APPROVED: "bg-[rgba(143,163,180,0.15)] text-[var(--accent-blue)]",
  RECEIVED: "bg-[rgba(184,165,200,0.15)] text-[var(--accent-lavender)]",
  REFUNDED: "bg-[rgba(163,177,138,0.15)] text-[var(--accent-sage)]",
  REJECTED: "bg-[rgba(212,165,165,0.15)] text-[var(--accent-rose)]",
  CANCELLED: "bg-[rgba(107,101,96,0.08)] text-[var(--text-muted)]",
};

/** State of one return request */
export default function ReturnBadge({ status }: { status: string }) {
  const t = useTranslations("admin.returns.status");
  return (
    <span
      className={`inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary whitespace-nowrap ${
        STYLES[status] ?? STYLES.CANCELLED
      }`}
    >
      {t.has(status as never) ? t(status as never) : status}
    </span>
  );
}
