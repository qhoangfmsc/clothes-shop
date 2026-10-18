"use client";

import { useMemo, useRef, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import MoneyText from "@/src/app/[locale]/_components/MoneyText";
import { moneyOf } from "@/src/lib/money";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/src/i18n/navigation";
import { Plus } from "lucide-react";
import { FormTabs } from "@/src/app/[locale]/_components/AdminFormKit";
import { RoleGuard } from "@/src/app/[locale]/_components/RoleGuard";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableRef,
} from "@/src/app/[locale]/_components/DataTable";
import PendingActionNotice from "@/src/app/[locale]/_components/PendingActionNotice";
import { usePendingCounts } from "@/src/app/[locale]/_components/PendingCountsProvider";
import OrderPaymentBadge from "@/src/app/[locale]/_components/OrderPaymentBadge";
import { useSortOptions } from "@/src/hooks/use-sort-options";
import { PERMISSIONS } from "@/src/lib/permissions";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { fetchPaymentTransactions } from "./_common/moduleSlice";
import { PAYMENT_SORT_OPTIONS } from "./_common/constants";
import {
  CONFIRMABLE_VERIFICATION_STATUSES,
  PAYMENT_VERIFICATION_STATUSES,
  type PaymentListResult,
  type PaymentTransaction,
  type PaymentVerificationStatus,
} from "./_common/types";
import AttemptsTable from "./_components/AttemptsTable";
import ConfirmPaymentModal from "./_components/ConfirmPaymentModal";
import VerificationBadge from "./_components/VerificationBadge";

/* ═══════════════════════════════ Main Component ═══════════════════════ */

export default function PaymentsContent() {
  const t = useTranslations("admin.payments");
  const tVerification = useTranslations("admin.payments.verification");
  const sortOptions = useSortOptions(PAYMENT_SORT_OPTIONS);
  const format = useFormatter();
  const locale = useLocale();
  const dispatch = useAppDispatch();
  const tableRef = useRef<DataTableRef>(null);
  const total = useAppSelector((s) => s.payments.total);
  const attemptsTotal = useAppSelector((s) => s.payments.attemptsTotal);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { counts } = usePendingCounts();
  /* `?needsReview=true` = only the transactions the menu badge counts; they live in the transactions tab */
  const needsReview = searchParams.get("needsReview") === "true";
  const [chosenView, setChosenView] = useState<"codes" | "transactions">("codes");
  const view = needsReview ? "transactions" : chosenView;
  const setNeedsReview = (on: boolean) => {
    if (on) setChosenView("transactions");
    router.replace(on ? "/admin/payments?needsReview=true" : "/admin/payments", { scroll: false });
  };

  /* `{}` = record a transaction by hand; with `transaction` = attach that one to an order */
  const [confirming, setConfirming] = useState<{ transaction?: PaymentTransaction } | null>(null);

  const fetchTransactions = async (params: DataTableFetchParams): Promise<PaymentListResult> =>
    dispatch(
      fetchPaymentTransactions({
        search: params.search || undefined,
        verificationStatus: (params.filters.verificationStatus || undefined) as PaymentVerificationStatus | undefined,
        needsReview,
        sort: params.sort,
        page: params.page,
        limit: params.limit,
      })
    ).unwrap();

  const columns: DataTableColumn<PaymentTransaction>[] = useMemo(
    () => [
      {
        key: "receivedAt",
        header: t("table.columns.receivedAt"),
        render: (tx) => (
          <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
            {format.dateTime(new Date(tx.receivedAt), "dateTime")}
          </span>
        ),
      },
      {
        key: "amount",
        header: t("table.columns.amount"),
        render: (tx) => <MoneyText money={moneyOf(tx, "amount")} />,
      },
      {
        key: "content",
        header: t("table.columns.content"),
        hideBelow: "md",
        render: (tx) => (
          <div className="flex flex-col max-w-[280px]">
            <span className="text-xs text-[var(--text-secondary)] break-words">{tx.transferContent || "—"}</span>
            <span className="text-[11px] text-[var(--text-muted)] break-all">{tx.providerTransactionId}</span>
          </div>
        ),
      },
      {
        key: "status",
        header: t("table.columns.status"),
        render: (tx) => <VerificationBadge status={tx.verificationStatus} />,
      },
      {
        key: "order",
        header: t("table.columns.order"),
        hideBelow: "sm",
        render: (tx) => {
          const order = tx.paymentAttempt?.order;
          if (!tx.paymentAttempt) return <span className="text-xs text-[var(--text-disabled)]">—</span>;
          return (
            <div className="flex flex-col gap-1 items-start">
              <Link
                href={`/admin/orders?orderId=${tx.paymentAttempt.orderId}`}
                className="text-xs font-mono font-semibold text-[var(--accent-primary)] no-underline hover:underline"
              >
                #{tx.paymentAttempt.orderId}
              </Link>
              {order && <OrderPaymentBadge status={order.paymentStatus} />}
            </div>
          );
        },
      },
      {
        key: "actions",
        header: t("table.columns.actions"),
        align: "right",
        render: (tx) => {
          const canAttach =
            CONFIRMABLE_VERIFICATION_STATUSES.includes(tx.verificationStatus) &&
            tx.paymentAttempt?.order?.paymentStatus !== "paid";
          if (!canAttach) return null;
          return (
            <RoleGuard permission={PERMISSIONS.PAYMENT_ADMIN_CONFIRM}>
              <button
                type="button"
                className="py-1 px-3 pointer-coarse:min-h-11 text-xs font-semibold font-primary bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-sm cursor-pointer whitespace-nowrap hover:opacity-90"
                onClick={() => setConfirming({ transaction: tx })}
              >
                {t("table.attach")}
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
    <div className="flex flex-col gap-6 h-full min-h-0">
      <div className="shrink-0 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-[var(--text-heading)] font-normal">{t("page.title")}</h1>
          <p className="text-xs text-[var(--text-muted)] font-primary mt-1">
            {view === "codes" ? t("lookup.total", { count: attemptsTotal }) : t("page.total", { count: total })}
          </p>
        </div>
        <RoleGuard permission={PERMISSIONS.PAYMENT_ADMIN_CONFIRM}>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 py-2 px-4 pointer-coarse:min-h-11 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-sm text-sm font-semibold font-primary cursor-pointer hover:opacity-90"
            onClick={() => setConfirming({})}
          >
            <Plus size={14} /> {t("page.manual")}
          </button>
        </RoleGuard>
      </div>

      <PendingActionNotice
        count={counts.payments}
        title={t("pending.title", { count: counts.payments ?? 0 })}
        includes={t("pending.includes")}
        excludes={t("pending.excludes")}
        how={t("pending.how")}
        note={t("pending.note")}
        active={needsReview}
        viewLabel={t("pending.view")}
        keepWhenDone
        onToggle={() => setNeedsReview(!needsReview)}
      />

      <FormTabs
        tabs={[
          { id: "codes", label: t("lookup.tab") },
          { id: "transactions", label: t("lookup.transactionsTab") },
        ]}
        active={view}
        onChange={(id) => {
          setChosenView(id as "codes" | "transactions");
          /* Leaving the transactions tab drops the filter: it only applies there */
          if (needsReview) router.replace("/admin/payments", { scroll: false });
        }}
      />

      {view === "codes" ? (
        <AttemptsTable />
      ) : (
      <DataTable<PaymentTransaction>
        /* Turning the filter on or off is another query: start the table fresh */
        key={needsReview ? "needs-review" : "all"}
        tableRef={tableRef}
        columns={columns}
        fetchData={fetchTransactions}
        searchPlaceholder={t("table.searchPlaceholder")}
        filters={[
          {
            key: "verificationStatus",
            label: t("table.filters.status"),
            options: PAYMENT_VERIFICATION_STATUSES.map((s) => ({ value: s, label: tVerification(s) })),
          },
        ]}
        sortOptions={sortOptions}
        /* The BE only sorts transactions by receivedAt / amount: DataTable's default `-createdAt` would be a 400 */
        defaultSort={PAYMENT_SORT_OPTIONS[0].value}
      />
      )}

      {confirming && (
        <ConfirmPaymentModal
          transaction={confirming.transaction}
          onClose={() => setConfirming(null)}
          onConfirmed={() => {
            setConfirming(null);
            tableRef.current?.refresh();
          }}
        />
      )}
    </div>
  );
}
