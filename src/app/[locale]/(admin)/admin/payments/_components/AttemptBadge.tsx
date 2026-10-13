"use client";

import { useTranslations } from "next-intl";

const STYLES: Record<string, string> = {
  PENDING: "bg-[rgba(240,228,166,0.2)] text-[var(--color-honey)]",
  PAID: "bg-[rgba(163,177,138,0.15)] text-[var(--accent-sage)]",
  /* A shopper may still have paid an expired code: make it stand out */
  EXPIRED: "bg-[rgba(212,165,165,0.2)] text-[var(--accent-rose)]",
  CANCELLED: "bg-[rgba(107,101,96,0.08)] text-[var(--text-muted)]",
};

/** State of one transfer code (QR payment session) */
export default function AttemptBadge({ status }: { status: string }) {
  const t = useTranslations("admin.payments.attempt");
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
