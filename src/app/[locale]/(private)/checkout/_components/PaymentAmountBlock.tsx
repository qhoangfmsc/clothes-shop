"use client";

import { useMoney } from "@/src/hooks/use-money";
import type { PaymentAmount } from "../_common/payment";

/** The amount of a payment in the currency of the UI language, as the BE reported it (QR session or status answer). */
export default function PaymentAmountBlock({ amount, label }: { amount: PaymentAmount; label: string }) {
  const { format } = useMoney();

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase font-medium">
        {label}
      </span>
      <span className="font-display text-2xl text-[var(--text-heading)] tracking-[-0.04em] leading-none">
        {format({ vnd: amount.amountVnd, usd: amount.amountUsd })}
      </span>
    </div>
  );
}
