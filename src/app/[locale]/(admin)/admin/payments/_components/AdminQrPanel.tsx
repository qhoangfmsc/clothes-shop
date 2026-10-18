"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import MoneyText from "@/src/app/[locale]/_components/MoneyText";
import { moneyOf } from "@/src/lib/money";
import { CheckCircle, Loader2, Maximize2 } from "lucide-react";
import DetailRow from "@/src/app/[locale]/(private)/checkout/_components/DetailRow";
import { isSafeQrUrl } from "@/src/app/[locale]/(private)/checkout/_common/payment";
import type { AdminQrSession } from "../_common/types";
import QrPresentation from "./QrPresentation";

interface AdminQrPanelProps {
  qr: AdminQrSession;
  /** The order's payment state came back `paid` */
  paid: boolean;
  /** The code's expiry has passed without payment */
  expired: boolean;
}

/** The QR an admin just generated, shown the way the customer's payment page shows it: image, amount, bank details. */
export default function AdminQrPanel({ qr, paid, expired }: AdminQrPanelProps) {
  const t = useTranslations("admin.payments.orderTab.qr");
  const format = useFormatter();
  /* Full-screen view for the customer: it must outlive the paid state so they see the "received" message too */
  const [presenting, setPresenting] = useState(false);

  if (paid && !presenting) {
    return (
      <div
        role="status"
        className="mt-3 rounded-lg border border-[var(--accent-sage)] bg-[var(--color-sage-cream)] p-4 flex items-center gap-2 text-sm font-semibold font-primary text-[var(--accent-sage)]"
      >
        <CheckCircle size={18} /> {t("paid")}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 flex flex-col sm:flex-row gap-4">
      <div className="flex flex-col items-center gap-2 sm:w-[180px] shrink-0">
        {isSafeQrUrl(qr.qrUrl) && (
          /* eslint-disable-next-line @next/next/no-img-element -- the QR is a BE-generated image of any host; it must reach the banking app untouched */
          <img
            src={qr.qrUrl}
            alt={t("alt")}
            className="w-full max-w-[180px] aspect-square rounded-md bg-white p-1.5 border border-[var(--border-subtle)] object-contain"
          />
        )}
        <MoneyText money={moneyOf(qr, "amount")} amountClassName="text-lg font-semibold font-primary text-[var(--text-heading)]" />
        <button
          type="button"
          onClick={() => setPresenting(true)}
          className="inline-flex items-center gap-1.5 py-1.5 px-3 pointer-coarse:min-h-11 text-xs font-semibold font-primary rounded-sm border border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-primary)] cursor-pointer hover:border-[var(--text-disabled)]"
        >
          <Maximize2 size={14} /> {t("present.open")}
        </button>
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-2">
        <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3">
          <DetailRow label={t("bank")} value={qr.bankName} />
          <DetailRow label={t("accountName")} value={qr.accountName} />
          <DetailRow label={t("accountNumber")} value={qr.accountNumber} copyable />
          <DetailRow label={t("transferContent")} value={qr.transferContent} copyable />
        </div>
        <p
          role="status"
          className={`m-0 inline-flex items-center gap-2 text-xs font-primary ${
            expired ? "text-[var(--accent-rose)] font-semibold" : "text-[var(--text-muted)]"
          }`}
        >
          {!expired && <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />}
          {expired
            ? t("expired")
            : qr.expiresAt
              ? t("waiting", { date: format.dateTime(new Date(qr.expiresAt), "dateTime") })
              : t("waitingNoExpiry")}
        </p>
        {qr.supersededTransferCodes.length > 0 && (
          <p className="m-0 text-xs font-primary text-[var(--text-muted)] leading-[150%]">
            {t("superseded", { codes: qr.supersededTransferCodes.join(", ") })}
          </p>
        )}
      </div>
      {presenting && <QrPresentation qr={qr} paid={paid} onClose={() => setPresenting(false)} />}
    </div>
  );
}
