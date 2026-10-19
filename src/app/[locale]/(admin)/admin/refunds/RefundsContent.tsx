"use client";

import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import MoneyText from "@/src/app/[locale]/_components/MoneyText";
import { moneyOf } from "@/src/lib/money";
import { X } from "lucide-react";
import { Link, useRouter } from "@/src/i18n/navigation";
import { FormTabs } from "@/src/app/[locale]/_components/AdminFormKit";
import { RoleGuard } from "@/src/app/[locale]/_components/RoleGuard";
import CopyButton from "@/src/app/[locale]/_components/CopyButton";
import PendingActionNotice from "@/src/app/[locale]/_components/PendingActionNotice";
import { usePendingCounts } from "@/src/app/[locale]/_components/PendingCountsProvider";
import OrderPaymentBadge from "@/src/app/[locale]/_components/OrderPaymentBadge";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableRef,
} from "@/src/app/[locale]/_components/DataTable";
import { useSortOptions } from "@/src/hooks/use-sort-options";
import { PERMISSIONS } from "@/src/lib/permissions";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { fetchRefunds } from "./_common/moduleSlice";
import { REFUND_SORT_OPTIONS } from "./_common/constants";
import { REFUND_STATUSES, type Refund, type RefundListResult, type RefundStatus } from "./_common/types";
import CompleteRefundModal from "./_components/CompleteRefundModal";
import RefundBadge from "./_components/RefundBadge";
import RefundPaymentSource from "./_components/RefundPaymentSource";
import RejectRefundModal from "./_components/RejectRefundModal";

const ACTION_BUTTON =
  "py-1 px-3 pointer-coarse:min-h-11 text-xs font-semibold font-primary border-0 rounded-sm cursor-pointer whitespace-nowrap hover:opacity-90";

/** "all" = no status filter */
type StatusTab = RefundStatus | "all";

/* ═══════════════════════════════ Main Component ═══════════════════════ */

export default function RefundsContent() {
  const t = useTranslations("admin.refunds");
  const tReason = useTranslations("admin.refunds.reason");
  const sortOptions = useSortOptions(REFUND_SORT_OPTIONS);
  const format = useFormatter();
  const locale = useLocale();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { counts } = usePendingCounts();
  const tableRef = useRef<DataTableRef>(null);
  const total = useAppSelector((s) => s.refunds.total);
  /* `?orderId=` comes from the order panel's "refund" banner */
  const orderId = searchParams.get("orderId") || undefined;
  /* `?status=` picks the tab (`all` = no filter); no value = the queue waiting for a transfer */
  const statusParam = searchParams.get("status");
  const status: StatusTab =
    statusParam === "all" || REFUND_STATUSES.some((s) => s === statusParam) ? (statusParam as StatusTab) : "REQUESTED";
  const setStatus = (next: StatusTab) => {
    const qs = new URLSearchParams(searchParams.toString());
    if (next === "REQUESTED") qs.delete("status");
    else qs.set("status", next);
    const text = qs.toString();
    router.replace(text ? `/admin/refunds?${text}` : "/admin/refunds", { scroll: false });
  };
  const [completing, setCompleting] = useState<Refund | null>(null);
  const [rejecting, setRejecting] = useState<Refund | null>(null);

  const fetchData = async (params: DataTableFetchParams): Promise<RefundListResult> =>
    dispatch(
      fetchRefunds({
        search: params.search || undefined,
        status: status === "all" ? undefined : status,
        orderId,
        sort: params.sort,
        page: params.page,
        limit: params.limit,
      })
    ).unwrap();

  const handleDone = () => {
    setCompleting(null);
    setRejecting(null);
    /* The menu badge and this tab's count refresh by themselves after the write */
    tableRef.current?.refresh();
  };

  const columns: DataTableColumn<Refund>[] = useMemo(
    () => [
      {
        key: "createdAt",
        header: t("table.columns.createdAt"),
        render: (r) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
              {format.dateTime(new Date(r.createdAt), "dateTime")}
            </span>
            <span className="text-[0.6875rem] text-[var(--text-secondary)]">
              {r.returnRequestId ? (
                <Link
                  href={`/admin/returns?returnId=${encodeURIComponent(r.returnRequestId)}`}
                  className="text-inherit underline underline-offset-2"
                >
                  {tReason.has(r.reason as never) ? tReason(r.reason as never) : r.reason}
                </Link>
              ) : tReason.has(r.reason as never) ? (
                tReason(r.reason as never)
              ) : (
                r.reason
              )}
            </span>
          </div>
        ),
      },
      {
        key: "amount",
        header: t("table.columns.amount"),
        render: (r) => <MoneyText money={moneyOf(r, "amount")} />,
      },
      {
        key: "order",
        header: t("table.columns.order"),
        render: (r) => (
          <div className="flex flex-col gap-1 items-start">
            <span className="inline-flex items-center gap-2">
              <Link
                href={`/admin/orders?orderId=${r.orderId}`}
                className="text-xs font-mono font-semibold text-[var(--accent-primary)] no-underline hover:underline"
              >
                #{r.orderId}
              </Link>
              <OrderPaymentBadge status={r.order.paymentStatus} />
            </span>
            <span className="text-[0.6875rem] text-[var(--text-muted)]">
              {[r.order.customer?.fullName, r.order.customer?.phone].filter(Boolean).join(" · ") || "—"}
            </span>
          </div>
        ),
      },
      {
        key: "source",
        header: t("table.columns.source"),
        hideBelow: "lg",
        render: (r) => <RefundPaymentSource payment={r.payment} />,
      },
      {
        key: "status",
        header: t("table.columns.status"),
        render: (r) => (
          <div className="flex flex-col gap-1 items-start max-w-[15rem]">
            <RefundBadge status={r.status} />
            {r.processedAt && (
              <span className="text-[0.6875rem] text-[var(--text-muted)] whitespace-nowrap">
                {t("table.processedAt", { date: format.dateTime(new Date(r.processedAt), "dateTime") })}
              </span>
            )}
            {r.bankReference && (
              <span className="inline-flex items-center gap-1 text-[0.6875rem] text-[var(--text-secondary)] min-w-0">
                <span className="break-all">{r.bankReference}</span>
                <CopyButton value={r.bankReference} label={t("table.bankReference")} />
              </span>
            )}
            {r.note && <span className="text-[0.6875rem] text-[var(--text-muted)] italic break-words">{r.note}</span>}
          </div>
        ),
      },
      {
        key: "actions",
        header: t("table.columns.actions"),
        align: "right",
        render: (r) => {
          if (r.status !== "REQUESTED") return null;
          return (
            <RoleGuard permission={PERMISSIONS.PAYMENT_ADMIN_REFUND}>
              <div className="flex flex-col items-end gap-1.5">
                <button
                  type="button"
                  className={`${ACTION_BUTTON} bg-[var(--accent-primary)] text-[var(--text-on-gold)]`}
                  onClick={() => setCompleting(r)}
                >
                  {t("table.complete")}
                </button>
                <button
                  type="button"
                  className={`${ACTION_BUTTON} bg-[var(--bg-elevated)] text-[var(--text-secondary)]`}
                  onClick={() => setRejecting(r)}
                >
                  {t("table.reject")}
                </button>
              </div>
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
          <p className="text-xs text-[var(--text-muted)] font-primary mt-1">{t("page.total", { count: total })}</p>
        </div>
        {orderId && (
          <Link
            href="/admin/refunds"
            className="inline-flex items-center gap-1.5 py-1.5 px-3 pointer-coarse:min-h-11 rounded-full bg-[var(--bg-elevated)] text-xs font-semibold font-primary text-[var(--text-secondary)] no-underline"
          >
            {t("page.orderFilter", { id: orderId })}
            <X size={12} aria-label={t("page.clearOrderFilter")} />
          </Link>
        )}
      </div>

      <PendingActionNotice
        count={counts.refunds}
        title={t("pending.title", { count: counts.refunds ?? 0 })}
        includes={t("pending.includes")}
        how={t("pending.how")}
        active={status === "REQUESTED"}
        viewLabel={t("pending.view")}
        onToggle={() => setStatus(status === "REQUESTED" ? "all" : "REQUESTED")}
      />

      <FormTabs
        tabs={[
          ...REFUND_STATUSES.map((s) => ({
            id: s,
            label: s === "REQUESTED" ? t("tabs.REQUESTED", { count: counts.refunds ?? 0 }) : t(`tabs.${s}`),
          })),
          { id: "all", label: t("tabs.all") },
        ]}
        active={status}
        onChange={(id) => setStatus(id as StatusTab)}
      />

      <DataTable<Refund>
        /* Another tab or order filter is another query: start the table fresh */
        key={`${status}:${orderId ?? ""}`}
        tableRef={tableRef}
        columns={columns}
        fetchData={fetchData}
        searchPlaceholder={t("table.searchPlaceholder")}
        sortOptions={sortOptions}
        emptyMessage={(filtered) =>
          filtered ? t("table.empty.filtered") : status === "all" ? t("table.empty.all") : t(`table.empty.${status}`)
        }
      />

      {completing && <CompleteRefundModal refund={completing} onClose={() => setCompleting(null)} onDone={handleDone} />}
      {rejecting && <RejectRefundModal refund={rejecting} onClose={() => setRejecting(null)} onDone={handleDone} />}
    </div>
  );
}
