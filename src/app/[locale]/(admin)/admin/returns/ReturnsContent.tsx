"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Link, useRouter } from "@/src/i18n/navigation";
import { FormTabs } from "@/src/app/[locale]/_components/AdminFormKit";
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
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { fetchReturnDetail, fetchReturns } from "./_common/moduleSlice";
import { RETURN_SORT_OPTIONS } from "./_common/constants";
import { RETURN_STATUSES, type ReturnListResult, type ReturnRequest, type ReturnStatus } from "./_common/types";
import ReturnBadge from "./_components/ReturnBadge";
import ReturnDetailPanel from "./_components/ReturnDetailPanel";

/** "all" = no status filter */
type StatusTab = ReturnStatus | "all";

/* ═══════════════════════════════ Main Component ═══════════════════════ */

export default function ReturnsContent() {
  const t = useTranslations("admin.returns");
  const tReason = useTranslations("admin.returns.reason");
  const sortOptions = useSortOptions(RETURN_SORT_OPTIONS);
  const format = useFormatter();
  const locale = useLocale();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableRef = useRef<DataTableRef>(null);
  const total = useAppSelector((s) => s.returns.total);
  const { counts } = usePendingCounts();
  /* `?orderId=` narrows the list to one order; `?returnId=` opens that request (shareable, like the orders panel) */
  const orderId = searchParams.get("orderId") || undefined;
  const urlReturnId = searchParams.get("returnId");

  /* `?status=` picks the tab (`all` = no filter); no value = the queue waiting for a decision */
  const statusParam = searchParams.get("status");
  const status: StatusTab =
    statusParam === "all" || RETURN_STATUSES.some((s) => s === statusParam) ? (statusParam as StatusTab) : "REQUESTED";
  const urlWith = (changes: Record<string, string | null>) => {
    const qs = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) qs.delete(key);
      else qs.set(key, value);
    }
    const text = qs.toString();
    return text ? `/admin/returns?${text}` : "/admin/returns";
  };
  const setStatus = (next: StatusTab) =>
    router.replace(urlWith({ status: next === "REQUESTED" ? null : next }), { scroll: false });
  const [detail, setDetail] = useState<ReturnRequest | null>(null);
  const openedFromUrl = useRef<string | null>(null);

  /* Open the request named in the URL once, from its own detail call */
  useEffect(() => {
    if (!urlReturnId) {
      openedFromUrl.current = null;
      setDetail(null);
      return;
    }
    if (openedFromUrl.current === urlReturnId) return;
    openedFromUrl.current = urlReturnId;
    dispatch(fetchReturnDetail(urlReturnId))
      .unwrap()
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [urlReturnId, dispatch]);

  const fetchData = async (params: DataTableFetchParams): Promise<ReturnListResult> =>
    dispatch(
      fetchReturns({
        search: params.search || undefined,
        status: status === "all" ? undefined : status,
        orderId,
        sort: params.sort,
        page: params.page,
        limit: params.limit,
      })
    ).unwrap();

  const openDetail = (request: ReturnRequest) => {
    openedFromUrl.current = request.id;
    setDetail(request);
    router.push(urlWith({ returnId: request.id }), { scroll: false });
    /* The row is enough to show at once; fetch the full detail (items, refund, order) */
    dispatch(fetchReturnDetail(request.id))
      .unwrap()
      .then(setDetail)
      .catch(() => {
        /* keep the row's data */
      });
  };

  const closeDetail = () => {
    openedFromUrl.current = null;
    setDetail(null);
    router.push(urlWith({ returnId: null }), { scroll: false });
  };

  const handleChanged = (updated: ReturnRequest) => {
    setDetail(updated);
    /* The menu badge and the tab count refresh by themselves after the write */
    tableRef.current?.refresh();
  };

  const columns: DataTableColumn<ReturnRequest>[] = useMemo(
    () => [
      {
        key: "id",
        header: t("table.columns.id"),
        render: (r) => (
          <code className="text-xs bg-[var(--bg-elevated)] py-0.5 px-1.5 rounded-sm font-mono font-semibold">#{r.id}</code>
        ),
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
              {r.order && <OrderPaymentBadge status={r.order.paymentStatus} />}
            </span>
            <span className="text-[0.6875rem] text-[var(--text-muted)]">
              {[r.order?.customer.fullName, r.order?.customer.phone].filter(Boolean).join(" · ") || "—"}
            </span>
          </div>
        ),
      },
      {
        key: "reason",
        header: t("table.columns.reason"),
        hideBelow: "md",
        render: (r) => <span className="text-xs text-[var(--text-secondary)]">{tReason(r.reason)}</span>,
      },
      {
        key: "status",
        header: t("table.columns.status"),
        render: (r) => <ReturnBadge status={r.status} />,
      },
      {
        key: "createdAt",
        header: t("table.columns.createdAt"),
        hideBelow: "sm",
        render: (r) => (
          <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
            {format.dateTime(new Date(r.createdAt), "short")}
          </span>
        ),
      },
      {
        key: "actions",
        header: t("table.columns.actions"),
        align: "right",
        render: (r) => (
          <button
            type="button"
            className="py-1 px-3 pointer-coarse:min-h-11 text-xs font-medium font-primary bg-[var(--bg-elevated)] border-0 rounded-sm cursor-pointer text-[var(--text-secondary)]"
            onClick={() => openDetail(r)}
          >
            {t("table.view")}
          </button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, orderId]
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
            href="/admin/returns"
            className="inline-flex items-center gap-1.5 py-1.5 px-3 pointer-coarse:min-h-11 rounded-full bg-[var(--bg-elevated)] text-xs font-semibold font-primary text-[var(--text-secondary)] no-underline"
          >
            {t("page.orderFilter", { id: orderId })}
            <X size={12} aria-label={t("page.clearOrderFilter")} />
          </Link>
        )}
      </div>

      <PendingActionNotice
        count={counts.returns}
        title={t("pending.title", { count: counts.returns ?? 0 })}
        includes={t("pending.includes")}
        excludes={t("pending.excludes")}
        how={t("pending.how")}
        active={status === "REQUESTED"}
        viewLabel={t("pending.view")}
        onToggle={() => setStatus(status === "REQUESTED" ? "all" : "REQUESTED")}
        extra={
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[rgba(201,169,110,0.3)]">
            <span className="text-xs font-primary text-[var(--text-secondary)]">{t("pending.approvedLine")}</span>
            <button
              type="button"
              onClick={() => setStatus("APPROVED")}
              aria-pressed={status === "APPROVED"}
              className="py-1.5 px-3 pointer-coarse:min-h-11 text-xs font-semibold font-primary rounded-sm border border-[var(--border-light)] bg-transparent text-[var(--text-secondary)] cursor-pointer hover:border-[var(--text-disabled)]"
            >
              {t("pending.approvedView")}
            </button>
          </div>
        }
      />

      <FormTabs
        tabs={[
          { id: "REQUESTED", label: t("tabs.REQUESTED", { count: counts.returns ?? 0 }) },
          ...RETURN_STATUSES.filter((s) => s !== "REQUESTED").map((s) => ({ id: s, label: t(`tabs.${s}`) })),
          { id: "all", label: t("tabs.all") },
        ]}
        active={status}
        onChange={(id) => setStatus(id as StatusTab)}
      />

      <DataTable<ReturnRequest>
        /* Another tab or order filter is another query: start the table fresh */
        key={`${status}:${orderId ?? ""}`}
        tableRef={tableRef}
        columns={columns}
        fetchData={fetchData}
        searchPlaceholder={t("table.searchPlaceholder")}
        sortOptions={sortOptions}
        emptyMessage={(filtered) => (filtered ? t("table.empty.filtered") : t("table.empty.none"))}
      />

      {detail && <ReturnDetailPanel request={detail} onClose={closeDetail} onChanged={handleChanged} />}
    </div>
  );
}
