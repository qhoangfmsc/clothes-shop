"use client";

import { useMemo, useRef, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import CopyButton from "@/src/app/[locale]/_components/CopyButton";
import OrderPaymentBadge from "@/src/app/[locale]/_components/OrderPaymentBadge";
import { RoleGuard } from "@/src/app/[locale]/_components/RoleGuard";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableRef,
} from "@/src/app/[locale]/_components/DataTable";
import { useSortOptions } from "@/src/hooks/use-sort-options";
import { PERMISSIONS } from "@/src/lib/permissions";
import { useAppDispatch } from "@/src/store/hooks";
import { fetchPaymentAttempts } from "../_common/moduleSlice";
import { ATTEMPT_SORT_OPTIONS } from "../_common/constants";
import {
  PAYMENT_ATTEMPT_STATUSES,
  type AttemptListResult,
  type PaymentAttemptRow,
  type PaymentAttemptStatus,
} from "../_common/types";
import AttemptBadge from "./AttemptBadge";
import ConfirmPaymentModal from "./ConfirmPaymentModal";
import VerificationBadge from "./VerificationBadge";

/** Look a transfer content up (any code ever issued, expired ones included) and confirm the payment of its order */
export default function AttemptsTable() {
  const t = useTranslations("admin.payments.lookup");
  const tAttempt = useTranslations("admin.payments.attempt");
  const sortOptions = useSortOptions(ATTEMPT_SORT_OPTIONS);
  const format = useFormatter();
  const locale = useLocale();
  const dispatch = useAppDispatch();
  const tableRef = useRef<DataTableRef>(null);
  const [confirming, setConfirming] = useState<PaymentAttemptRow | null>(null);

  const fetchAttempts = async (params: DataTableFetchParams): Promise<AttemptListResult> =>
    dispatch(
      fetchPaymentAttempts({
        search: params.search || undefined,
        status: (params.filters.status || undefined) as PaymentAttemptStatus | undefined,
        sort: params.sort,
        page: params.page,
        limit: params.limit,
      })
    ).unwrap();

  const columns: DataTableColumn<PaymentAttemptRow>[] = useMemo(
    () => [
      {
        key: "code",
        header: t("columns.code"),
        render: (a) => (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1">
              <code className="text-xs font-mono font-semibold text-[var(--text-primary)]">{a.transferCode}</code>
              <CopyButton value={a.transferCode} label={t("columns.code")} />
            </span>
            <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">
              {t("createdAt", { date: format.dateTime(new Date(a.createdAt), "dateTime") })}
            </span>
          </div>
        ),
      },
      {
        key: "amount",
        header: t("columns.amount"),
        render: (a) => <span className="font-semibold whitespace-nowrap">{format.number(a.amount, "vnd")}</span>,
      },
      {
        key: "status",
        header: t("columns.status"),
        render: (a) => (
          <div className="flex flex-col gap-0.5 items-start">
            <AttemptBadge status={a.status} />
            <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">
              {a.paidAt
                ? t("paidAt", { date: format.dateTime(new Date(a.paidAt), "dateTime") })
                : t("expiresAt", { date: format.dateTime(new Date(a.expiresAt), "dateTime") })}
            </span>
          </div>
        ),
      },
      {
        key: "order",
        header: t("columns.order"),
        hideBelow: "sm",
        render: (a) => (
          <div className="flex flex-col gap-1 items-start">
            <span className="inline-flex items-center gap-2">
              <Link
                href={`/admin/orders?orderId=${a.order.id}`}
                className="text-xs font-mono font-semibold text-[var(--accent-primary)] no-underline hover:underline"
              >
                #{a.order.id}
              </Link>
              <OrderPaymentBadge status={a.order.paymentStatus} />
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              {[a.order.customer?.fullName, a.order.customer?.phone].filter(Boolean).join(" · ") || "—"}
            </span>
          </div>
        ),
      },
      {
        key: "transactions",
        header: t("columns.transactions"),
        hideBelow: "lg",
        render: (a) =>
          a.transactions.length === 0 ? (
            <span className="text-xs text-[var(--text-disabled)]">{t("noTransactions")}</span>
          ) : (
            <div className="flex flex-col gap-1.5">
              {a.transactions.map((tx) => (
                <div key={tx.id} className="flex flex-col gap-0.5 items-start">
                  <span className="inline-flex items-center gap-2">
                    <span className="text-xs font-semibold whitespace-nowrap">{format.number(tx.amount, "vnd")}</span>
                    <VerificationBadge status={tx.verificationStatus} />
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] break-all">
                    {tx.providerTransactionId} · {format.dateTime(new Date(tx.receivedAt), "dateTime")}
                  </span>
                </div>
              ))}
            </div>
          ),
      },
      {
        key: "actions",
        header: t("columns.actions"),
        align: "right",
        render: (a) => {
          /* Nothing to confirm once the order is paid or cancelled (the BE would answer 1702) */
          if (a.order.paymentStatus !== "unpaid" || a.order.status === "cancelled") return null;
          return (
            <RoleGuard permission={PERMISSIONS.PAYMENT_ADMIN_CONFIRM}>
              <button
                type="button"
                className="py-1 px-3 pointer-coarse:min-h-11 text-xs font-semibold font-primary bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-sm cursor-pointer whitespace-nowrap hover:opacity-90"
                onClick={() => setConfirming(a)}
              >
                {t("confirmPaid")}
              </button>
            </RoleGuard>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  );

  return (
    <>
      <DataTable<PaymentAttemptRow>
        tableRef={tableRef}
        columns={columns}
        fetchData={fetchAttempts}
        searchPlaceholder={t("searchPlaceholder")}
        filters={[
          {
            key: "status",
            label: t("status"),
            options: PAYMENT_ATTEMPT_STATUSES.map((s) => ({ value: s, label: tAttempt(s) })),
          },
        ]}
        sortOptions={sortOptions}
      />

      {confirming && (
        <ConfirmPaymentModal
          fixedOrderId={confirming.order.id}
          lockedTransferCode={confirming.transferCode}
          defaultAmount={confirming.amount}
          onClose={() => setConfirming(null)}
          onConfirmed={() => {
            setConfirming(null);
            tableRef.current?.refresh();
          }}
        />
      )}
    </>
  );
}
