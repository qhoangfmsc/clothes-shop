"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useLocale, useFormatter, useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { X, AlertTriangle } from "lucide-react";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { useOrderStatusLabel } from "@/src/i18n/use-labels";
import OrderDetailPanel from "@/src/app/[locale]/_components/OrderDetailPanel";
import OrderPaymentBadge from "@/src/app/[locale]/_components/OrderPaymentBadge";
import OrderPaymentTab from "@/src/app/[locale]/(admin)/admin/payments/_components/OrderPaymentTab";
import { useOrderPaymentStatusLabel } from "@/src/i18n/use-labels";
import { type AdminOrder } from "@/src/hooks/use-admin-api";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { useConfirm } from "@/src/app/[locale]/_components/ConfirmDialog";
import { useSortOptions } from "@/src/hooks/use-sort-options";
import { RoleGuard } from "@/src/app/[locale]/_components/RoleGuard";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableRef,
} from "@/src/app/[locale]/_components/DataTable";
import { PERMISSIONS, hasPermission } from "@/src/lib/permissions";
import { useAuth } from "@/src/contexts/auth-context";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { fetchOrderList, updateOrderStatus, fetchOrderDetail } from "./_common/moduleSlice";
import { ORDER_SORT_OPTIONS } from "./_common/constants";
import {
  ORDER_PAYMENT_STATUSES,
  ORDER_STATUSES,
  getSelectableOrderStatuses,
  type OrderPaymentStatus,
  type OrderStatus,
} from "@/src/types/enums";
import type { OrderListResult } from "./_common/types";

/* ═══════════════════════════════ Helpers ═══════════════════════════════ */

function statusStyle(s: string): string {
  const m: Record<string, string> = {
    pending: "bg-[rgba(240,228,166,0.2)] text-[var(--color-honey)]",
    confirmed: "bg-[rgba(143,163,180,0.15)] text-[var(--accent-blue)]",
    shipping: "bg-[rgba(184,165,200,0.15)] text-[var(--accent-lavender)]",
    delivered: "bg-[rgba(163,177,138,0.15)] text-[var(--accent-sage)]",
    completed: "bg-[rgba(201,169,110,0.15)] text-[var(--accent-primary)]",
    cancelled: "bg-[rgba(212,165,165,0.15)] text-[var(--accent-rose)]",
  };
  return m[s] ?? "bg-[rgba(107,101,96,0.05)] text-[var(--text-muted)]";
}

/* ═══════════════════════════════ Main Component ═══════════════════════ */

export default function OrdersContent() {
  const t = useTranslations("admin.orders");
  const toErrorMessage = useErrorMessage();
  const sortOptions = useSortOptions(ORDER_SORT_OPTIONS);
  const locale = useLocale();
  const format = useFormatter();
  const statusLabel = useOrderStatusLabel();
  const paymentStatusLabel = useOrderPaymentStatusLabel();
  const { toast } = useToast();
  const confirm = useConfirm();
  const tableRef = useRef<DataTableRef>(null);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { isUpdating, total } = useAppSelector((s) => s.orders);
  const { user } = useAuth();
  const canViewPayment = hasPermission(user, PERMISSIONS.PAYMENT_ADMIN_VIEW);

  /* ── Detail Panel State ── */
  const [detailOrder, setDetailOrder] = useState<AdminOrder | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  /* ── URL-driven modal: auto-open when ?orderId= is present ── */
  const urlOrderId = searchParams.get("orderId");
  const hasAutoOpened = useRef(false);

  useEffect(() => {
    if (urlOrderId && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      setDetailError(null);
      setLoadingDetail(true);
      setDetailOrder(null);
      dispatch(fetchOrderDetail(urlOrderId))
        .unwrap()
        .then((data) => setDetailOrder(data))
        .catch(() => setDetailError(t("detail.notFoundMessage", { id: urlOrderId })))
        .finally(() => setLoadingDetail(false));
    }
    /* Reset if URL has no orderId */
    if (!urlOrderId) {
      hasAutoOpened.current = false;
      setDetailOrder(null);
      setDetailError(null);
    }
  }, [urlOrderId, dispatch, t]);

  /* ── openDetail: push orderId to URL ── */
  const openDetail = async (order: AdminOrder) => {
    setDetailError(null);
    setDetailOrder(order);
    setLoadingDetail(true);
    hasAutoOpened.current = true; // prevent useEffect from re-fetching & clearing modal
    router.push(`/admin/orders?orderId=${order.id}`, { scroll: false });
    try {
      const fresh = await dispatch(fetchOrderDetail(order.id)).unwrap();
      setDetailOrder(fresh);
    } catch {
      /* keep cached order data */
    } finally {
      setLoadingDetail(false);
    }
  };

  /* ── closeDetail: remove orderId from URL ── */
  const closeDetail = () => {
    hasAutoOpened.current = false;
    router.push("/admin/orders", { scroll: false });
  };

  /* ── fetchData for DataTable ── */
  const fetchOrders = async (params: DataTableFetchParams): Promise<OrderListResult> => {
    return dispatch(
      fetchOrderList({
        search: params.search || undefined,
        status: (params.filters.status || undefined) as OrderStatus | undefined,
        paymentStatus: (params.filters.paymentStatus || undefined) as OrderPaymentStatus | undefined,
        sort: params.sort,
        page: params.page,
        limit: params.limit,
      })
    ).unwrap();
  };

  /* ── Columns ── */
  const columns: DataTableColumn<AdminOrder>[] = useMemo(
    () => [
      {
        key: "orderId",
        header: t("table.columns.orderId"),
        render: (o) => (
          <code className="text-xs bg-[var(--bg-elevated)] py-0.5 px-1.5 rounded-sm font-mono font-semibold">
            #{o.id}
          </code>
        ),
      },
      {
        key: "customer",
        header: t("table.columns.customer"),
        render: (o) => (
          <span className="text-xs text-[var(--text-muted)]">
            {(o.shippingAddress?.fullName as String) || o.userId}
          </span>
        ),
      },
      {
        key: "items",
        header: t("table.columns.items"),
        render: (o) => (
          <span className="text-xs text-[var(--text-secondary)]">
            {t("table.itemCount", { count: o.items?.length ?? 0 })}
          </span>
        ),
      },
      {
        key: "total",
        header: t("table.columns.total"),
        render: (o) => (
          <span className="font-semibold">{format.number(Number(o.total), "priceFixed")}</span>
        ),
      },
      {
        key: "status",
        header: t("table.columns.status"),
        render: (o) => (
          <RoleGuard
            permission={PERMISSIONS.ORDER_ADMIN_UPDATE_STATUS}
            fallback={
              <span
                className={`inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary ${statusStyle(o.status)}`}
              >
                {statusLabel(o.status)}
              </span>
            }
          >
            <select
              className={`py-1 px-2 rounded-full text-xs font-semibold font-primary border-0 cursor-pointer outline-none ${statusStyle(o.status)}`}
              value={o.status}
              disabled={isUpdating}
              onChange={(e) => handleStatusChange(o.id, e.target.value as OrderStatus, o.paymentStatus)}
            >
              {getSelectableOrderStatuses(o.status).map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </RoleGuard>
        ),
      },
      {
        key: "payment",
        header: t("table.columns.payment"),
        hideBelow: "sm",
        render: (o) => <OrderPaymentBadge status={o.paymentStatus} />,
      },
      {
        key: "date",
        header: t("table.columns.date"),
        render: (o) => (
          <span className="text-xs text-[var(--text-muted)]">
            {format.dateTime(new Date(o.createdAt), "short")}
          </span>
        ),
      },
      {
        key: "actions",
        header: t("table.columns.actions"),
        align: "right",
        render: (o) => (
          <button
            className="py-1 px-3 text-xs font-medium font-primary bg-[var(--bg-elevated)] border-0 rounded-sm cursor-pointer text-[var(--text-secondary)]"
            onClick={() => openDetail(o)}
          >
            {t("table.view")}
          </button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isUpdating, locale]
  );

  /* ── Handlers ── */

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus, paymentStatus: OrderPaymentStatus) => {
    /* Cancelling a paid order keeps the money with the shop: there is no refund flow, so make the admin aware */
    if (newStatus === "cancelled" && paymentStatus === "paid") {
      const proceed = await confirm({
        title: t("confirmCancelPaid.title"),
        message: t("confirmCancelPaid.message", { id: orderId }),
        confirmLabel: t("confirmCancelPaid.confirm"),
        danger: true,
      });
      if (!proceed) return;
    }
    try {
      await dispatch(updateOrderStatus({ id: orderId, status: newStatus })).unwrap();
      toast.success(t("toast.statusChanged", { id: orderId, status: statusLabel(newStatus) }));
      if (detailOrder?.id === orderId) {
        setDetailOrder((p) => (p ? { ...p, status: newStatus } : null));
      }
      tableRef.current?.refresh();
    } catch (err) {
      toast.error(toErrorMessage(err, t("toast.statusFailed")));
    }
  };

  /* An admin confirmed the payment from the order's payment tab: reload the open order and the table */
  const refreshAfterPayment = () => {
    if (detailOrder) {
      dispatch(fetchOrderDetail(detailOrder.id))
        .unwrap()
        .then((fresh) => setDetailOrder(fresh))
        .catch(() => {
          /* keep what is shown */
        });
    }
    tableRef.current?.refresh();
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      {/* ── Header ── */}
      <div className="shrink-0">
        <h1 className="font-display text-2xl text-[var(--text-heading)] font-normal">{t("page.title")}</h1>
        <p className="text-xs text-[var(--text-muted)] font-primary mt-1">
          {t("page.total", { count: total })}
        </p>
      </div>

      <DataTable<AdminOrder>
        tableRef={tableRef}
        columns={columns}
        fetchData={fetchOrders}
        searchPlaceholder={t("table.searchPlaceholder")}
        filters={[
          {
            key: "status",
            label: t("table.filters.status"),
            options: ORDER_STATUSES.map((s) => ({ value: s, label: statusLabel(s) })),
          },
          {
            key: "paymentStatus",
            label: t("table.filters.paymentStatus"),
            options: ORDER_PAYMENT_STATUSES.map((s) => ({ value: s, label: paymentStatusLabel(s) })),
          },
        ]}
        sortOptions={sortOptions}
      />

      {/* ═══════════════ DETAIL / ERROR PANEL ═══════════════ */}
      {(detailOrder || detailError) && (
        <div
          className="fixed inset-0 bg-[rgba(10,10,8,0.5)] flex items-center justify-center z-100 p-3 sm:p-6"
          onClick={closeDetail}
        >
          <div
            className="bg-[var(--bg-primary)] rounded-2xl w-full max-w-150 max-h-[calc(100dvh-1.5rem)] sm:max-h-[85dvh] overflow-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Error state ── */}
            {detailError && !detailOrder && (
              <>
                <div className="flex justify-between items-center py-5 px-6 border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--bg-primary)] z-1">
                  <h2 className="font-display text-lg text-[var(--text-heading)] font-normal m-0">
                    {t("detail.notFoundTitle")}
                  </h2>
                  <button
                    className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--text-muted)]"
                    onClick={closeDetail}
                    aria-label={t("detail.close")}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-8 text-center">
                  <AlertTriangle size={32} className="text-[var(--accent-rose)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--text-secondary)] font-primary">{detailError}</p>
                  <button
                    className="mt-4 py-2 px-4 bg-[var(--bg-elevated)] border-0 rounded-sm text-sm font-primary text-[var(--text-secondary)] cursor-pointer"
                    onClick={closeDetail}
                  >
                    {t("detail.close")}
                  </button>
                </div>
              </>
            )}

            {/* ── Detail state ── */}
            {detailOrder && (
              <OrderDetailPanel
                order={detailOrder}
                loading={loadingDetail}
                onClose={closeDetail}
                paymentTab={
                  canViewPayment ? (
                    <OrderPaymentTab orderId={detailOrder.id} onChanged={refreshAfterPayment} />
                  ) : undefined
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
