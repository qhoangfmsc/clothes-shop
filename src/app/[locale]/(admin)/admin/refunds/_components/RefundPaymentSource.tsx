"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useMoney } from "@/src/hooks/use-money";
import { moneyOf } from "@/src/lib/money";
import CopyButton from "@/src/app/[locale]/_components/CopyButton";
import type { Refund } from "../_common/types";

/** The money that came in for a refunded order: the admin sends it back to this source */
export default function RefundPaymentSource({ payment }: { payment: Refund["payment"] }) {
  const t = useTranslations("admin.refunds.source");
  const format = useFormatter();
  const { format: formatMoney } = useMoney();
  return (
    <div className="flex flex-col gap-1 text-xs font-primary text-[var(--text-secondary)] min-w-0">
      <span className="inline-flex items-center gap-1 min-w-0">
        <code className="font-mono font-semibold text-[var(--text-primary)] break-all">{payment.transferCode}</code>
        <CopyButton value={payment.transferCode} label={t("transferCode")} />
      </span>
      {payment.transactionRef && (
        <span className="inline-flex items-center gap-1 min-w-0 text-[var(--text-muted)]">
          <span className="break-all">{payment.transactionRef}</span>
          <CopyButton value={payment.transactionRef} label={t("transactionRef")} />
        </span>
      )}
      {payment.transferContent && (
        <span className="break-words text-[var(--text-muted)]">{payment.transferContent}</span>
      )}
      <span className="text-[var(--text-muted)]">
        {[
          payment.provider,
          formatMoney(moneyOf(payment, "paidAmount")),
          payment.paidAt ? format.dateTime(new Date(payment.paidAt), "dateTime") : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </div>
  );
}
