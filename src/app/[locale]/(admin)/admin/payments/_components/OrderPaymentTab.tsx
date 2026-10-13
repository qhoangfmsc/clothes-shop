"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import OrderPaymentBadge from "@/src/app/[locale]/_components/OrderPaymentBadge";
import CopyButton from "@/src/app/[locale]/_components/CopyButton";
import { RoleGuard } from "@/src/app/[locale]/_components/RoleGuard";
import { PERMISSIONS } from "@/src/lib/permissions";
import { useAppDispatch } from "@/src/store/hooks";
import { fetchOrderPayment } from "../_common/moduleSlice";
import {
  CONFIRMABLE_VERIFICATION_STATUSES,
  type OrderPaymentOverview,
  type PaymentTransaction,
} from "../_common/types";
import AttemptBadge from "./AttemptBadge";
import ConfirmPaymentModal from "./ConfirmPaymentModal";
import VerificationBadge from "./VerificationBadge";

interface OrderPaymentTabProps {
  orderId: string;
  /** Called after an admin confirmed the payment, so the order list and panel can refresh */
  onChanged: () => void;
}

const SECTION_TITLE =
  "text-sm font-semibold text-[var(--text-primary)] font-primary mt-6 mb-3 pt-4 border-t border-[var(--border-subtle)]";
const ACTION_BUTTON =
  "py-1.5 px-3 pointer-coarse:min-h-11 text-xs font-semibold font-primary rounded-sm border-0 cursor-pointer bg-[var(--accent-primary)] text-[var(--text-on-gold)] hover:opacity-90";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-3 py-1.5">
      <span className="text-xs text-[var(--text-muted)] font-primary font-medium">{label}</span>
      <span className="text-sm text-[var(--text-primary)] font-primary text-right">{children}</span>
    </div>
  );
}

/** "Payment" tab of the order panel: the order's payment state, every QR session and every bank transaction */
export default function OrderPaymentTab({ orderId, onChanged }: OrderPaymentTabProps) {
  const t = useTranslations("admin.payments.orderTab");
  const format = useFormatter();
  const toErrorMessage = useErrorMessage();
  const dispatch = useAppDispatch();

  const [overview, setOverview] = useState<OrderPaymentOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  /* `{}` = record a transaction by hand; with `transaction` = attach that one */
  const [confirming, setConfirming] = useState<{
    transaction?: PaymentTransaction;
    code?: { transferCode: string; amount: number };
  } | null>(null);

  useEffect(() => {
    let stale = false;
    setIsLoading(true);
    dispatch(fetchOrderPayment(orderId))
      .unwrap()
      .then((data) => {
        if (stale) return;
        setOverview(data);
        setError(null);
      })
      .catch((err) => {
        if (!stale) setError(toErrorMessage(err, t("loadFailed")));
      })
      .finally(() => {
        if (!stale) setIsLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [orderId, reloadKey, dispatch, toErrorMessage, t]);

  const handleConfirmed = useCallback(() => {
    setConfirming(null);
    setReloadKey((key) => key + 1);
    onChanged();
  }, [onChanged]);

  if (isLoading && !overview) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-[var(--border-light)] border-t-[var(--accent-primary)] rounded-full animate-spin" />
      </div>
    );
  }
  if (error || !overview) {
    return <p className="m-0 p-6 text-sm text-[var(--accent-rose)] font-primary">{error ?? t("loadFailed")}</p>;
  }

  const { order, attempts, transactions } = overview;
  const date = (iso: string) => format.dateTime(new Date(iso), "dateTime");

  return (
    <div className="p-6">
      <Row label={t("paymentStatus")}>
        <OrderPaymentBadge status={order.paymentStatus} />
      </Row>
      {order.paidAt && <Row label={t("paidAt")}>{date(order.paidAt)}</Row>}
      <Row label={t("total")}>{format.number(Number(order.total), "priceFixed")}</Row>
      <Row label={t("customer")}>
        {[order.customer?.fullName, order.customer?.phone].filter(Boolean).join(" · ") || "—"}
      </Row>

      {order.paymentStatus === "unpaid" && (
        <RoleGuard permission={PERMISSIONS.PAYMENT_ADMIN_CONFIRM}>
          <div className="mt-3">
            <button type="button" className={ACTION_BUTTON} onClick={() => setConfirming({})}>
              {t("confirmPaid")}
            </button>
          </div>
        </RoleGuard>
      )}

      <h3 className={SECTION_TITLE}>{t("attempts", { count: attempts.length })}</h3>
      {attempts.length === 0 ? (
        <p className="m-0 text-xs text-[var(--text-muted)] font-primary">{t("noAttempts")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {attempts.map((attempt) => (
            <div
              key={attempt.id}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 flex flex-col gap-1 text-xs font-primary text-[var(--text-secondary)]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1 min-w-0">
                  <code className="font-mono font-semibold text-[var(--text-primary)]">{attempt.transferCode}</code>
                  <CopyButton value={attempt.transferCode} label={t("transferCode")} />
                </span>
                <span className="font-semibold text-[var(--text-primary)]">{format.number(attempt.amount, "vnd")}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <AttemptBadge status={attempt.status} />
                <span className="text-[var(--text-muted)]">{t("expiresAt", { date: date(attempt.expiresAt) })}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[var(--text-muted)]">
                <span>{t("createdAt", { date: date(attempt.createdAt) })}</span>
                {attempt.paidAt && <span>{t("paidAtShort", { date: date(attempt.paidAt) })}</span>}
              </div>
              {order.paymentStatus === "unpaid" && order.status !== "cancelled" && attempt.status !== "PAID" && (
                <RoleGuard permission={PERMISSIONS.PAYMENT_ADMIN_CONFIRM}>
                  <div>
                    <button
                      type="button"
                      className={ACTION_BUTTON}
                      onClick={() =>
                        setConfirming({ code: { transferCode: attempt.transferCode, amount: attempt.amount } })
                      }
                    >
                      {t("confirmCode")}
                    </button>
                  </div>
                </RoleGuard>
              )}
            </div>
          ))}
        </div>
      )}

      <h3 className={SECTION_TITLE}>{t("transactions", { count: transactions.length })}</h3>
      {transactions.length === 0 ? (
        <p className="m-0 text-xs text-[var(--text-muted)] font-primary">{t("noTransactions")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 flex flex-col gap-1.5 text-xs font-primary text-[var(--text-secondary)]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {format.number(tx.amount, "vnd")}
                </span>
                <VerificationBadge status={tx.verificationStatus} />
              </div>
              <span className="break-all">{tx.transferContent || "—"}</span>
              <span className="inline-flex items-center gap-1 text-[var(--text-muted)] min-w-0">
                <span className="break-all">{tx.providerTransactionId}</span>
                <CopyButton value={tx.providerTransactionId} label={t("transactionId")} />
                <span className="shrink-0">· {date(tx.receivedAt)}</span>
              </span>
              {tx.confirmNote && (
                <span className="italic text-[var(--text-muted)]">
                  {t("confirmNote", { note: tx.confirmNote })}
                </span>
              )}
              {order.paymentStatus === "unpaid" && CONFIRMABLE_VERIFICATION_STATUSES.includes(tx.verificationStatus) && (
                <RoleGuard permission={PERMISSIONS.PAYMENT_ADMIN_CONFIRM}>
                  <div>
                    <button type="button" className={ACTION_BUTTON} onClick={() => setConfirming({ transaction: tx })}>
                      {t("attachHere")}
                    </button>
                  </div>
                </RoleGuard>
              )}
            </div>
          ))}
        </div>
      )}

      {confirming && (
        <ConfirmPaymentModal
          transaction={confirming.transaction}
          fixedOrderId={order.id}
          lockedTransferCode={confirming.code?.transferCode}
          defaultAmount={confirming.code?.amount}
          onClose={() => setConfirming(null)}
          onConfirmed={handleConfirmed}
        />
      )}
    </div>
  );
}
