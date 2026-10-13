"use client";

import { useOrderPaymentStatusLabel } from "@/src/i18n/use-labels";

const STYLES: Record<string, string> = {
  paid: "bg-[rgba(163,177,138,0.15)] text-[var(--accent-sage)]",
  unpaid: "bg-[rgba(240,228,166,0.2)] text-[var(--color-honey)]",
};

/** Paid / unpaid pill of an order (admin tables and panels) */
export default function OrderPaymentBadge({ status }: { status: string }) {
  const label = useOrderPaymentStatusLabel();
  return (
    <span
      className={`inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary whitespace-nowrap ${
        STYLES[status] ?? "bg-[rgba(107,101,96,0.05)] text-[var(--text-muted)]"
      }`}
    >
      {label(status)}
    </span>
  );
}
