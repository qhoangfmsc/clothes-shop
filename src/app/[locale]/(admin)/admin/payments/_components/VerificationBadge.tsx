"use client";

import { useTranslations } from "next-intl";

const STYLES: Record<string, string> = {
  MATCHED: "bg-[rgba(163,177,138,0.15)] text-[var(--accent-sage)]",
  MANUALLY_CONFIRMED: "bg-[rgba(201,169,110,0.15)] text-[var(--accent-primary)]",
  UNMATCHED: "bg-[rgba(212,165,165,0.15)] text-[var(--accent-rose)]",
  ACCOUNT_MISMATCH: "bg-[rgba(212,165,165,0.15)] text-[var(--accent-rose)]",
  AMOUNT_MISMATCH: "bg-[rgba(240,228,166,0.2)] text-[var(--color-honey)]",
  LATE: "bg-[rgba(240,228,166,0.2)] text-[var(--color-honey)]",
  NOT_PAYABLE: "bg-[rgba(184,165,200,0.15)] text-[var(--accent-lavender)]",
  DUPLICATE_PAYMENT: "bg-[rgba(184,165,200,0.15)] text-[var(--accent-lavender)]",
  IGNORED: "bg-[rgba(107,101,96,0.08)] text-[var(--text-muted)]",
};

/** Result of reconciling a bank transaction with a payment session */
export default function VerificationBadge({ status }: { status: string }) {
  const t = useTranslations("admin.payments.verification");
  return (
    <span
      className={`inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary whitespace-nowrap ${
        STYLES[status] ?? STYLES.IGNORED
      }`}
    >
      {t.has(status as never) ? t(status as never) : status}
    </span>
  );
}
