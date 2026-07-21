"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, AlertTriangle } from "lucide-react";
import OrderDetailPanel from "@/src/app/_components/OrderDetailPanel";
import { type AdminOrder } from "@/src/hooks/use-admin-api";
import { useToast } from "@/src/app/_components/Toast";
import { RoleGuard } from "@/src/app/_components/RoleGuard";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableRef,
} from "@/src/app/_components/DataTable";
import { PERMISSIONS } from "@/src/lib/permissions";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { fetchOrderList, updateOrderStatus, fetchOrderDetail } from "./_common/moduleSlice";
import { ORDER_STATUSES } from "./_common/constants";
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
  const { toast } = useToast();
  const tableRef = useRef<DataTableRef>(null);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { isUpdating, total } = useAppSelector((s) => s.orders);

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
        .catch(() => setDetailError(`Order #${urlOrderId} not found`))
        .finally(() => setLoadingDetail(false));
    }
    /* Reset if URL has no orderId */
    if (!urlOrderId) {
      hasAutoOpened.current = false;
      setDetailOrder(null);
      setDetailError(null);
    }
  }, [urlOrderId, dispatch]);

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
        status: params.filters.status || undefined,
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
        header: "Order ID",
        render: (o) => (
          <code className="text-xs bg-[var(--bg-elevated)] py-0.5 px-1.5 rounded-sm font-mono font-semibold">
            #{o.id}
          </code>
        ),
      },
      {
        key: "customer",
        header: "Customer",
        render: (o) => (
          <span className="text-xs text-[var(--text-muted)]">
            {(o.shippingAddress?.fullName as String) || o.userId}
          </span>
        ),
      },
      {
        key: "items",
        header: "Items",
        render: (o) => (
          <span className="text-xs text-[var(--text-secondary)]">
            {o.items?.length ?? 0} item{(o.items?.length ?? 0) !== 1 ? "s" : ""}
          </span>
        ),
      },
      {
        key: "total",
        header: "Total",
        render: (o) => <span className="font-semibold">${Number(o.total).toFixed(2)}</span>,
      },
      {
        key: "status",
        header: "Status",
        render: (o) => (
          <RoleGuard
            permission={PERMISSIONS.ORDER_ADMIN_UPDATE_STATUS}
            fallback={
              <span
                className={`inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary capitalize ${statusStyle(o.status)}`}
              >
                {o.status}
              </span>
            }
          >
            <select
              className={`py-1 px-2 rounded-full text-xs font-semibold font-primary border-0 cursor-pointer outline-none capitalize ${statusStyle(o.status)}`}
              value={o.status}
              disabled={isUpdating}
              onChange={(e) => handleStatusChange(o.id, e.target.value)}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </RoleGuard>
        ),
      },
      {
        key: "date",
        header: "Date",
        render: (o) => (
          <span className="text-xs text-[var(--text-muted)]">
            {new Date(o.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (o) => (
          <button
            className="py-1 px-3 text-xs font-medium font-primary bg-[var(--bg-elevated)] border-0 rounded-sm cursor-pointer text-[var(--text-secondary)]"
            onClick={() => openDetail(o)}
          >
            View
          </button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isUpdating]
  );

  /* ── Handlers ── */

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await dispatch(updateOrderStatus({ id: orderId, status: newStatus })).unwrap();
      toast.success(`Order #${orderId} → ${newStatus}`);
      if (detailOrder?.id === orderId) {
        setDetailOrder((p) => (p ? { ...p, status: newStatus } : null));
      }
      tableRef.current?.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div>
        <h1 className="font-display text-2xl text-[var(--text-heading)] font-normal">Orders</h1>
        <p className="text-xs text-[var(--text-muted)] font-primary mt-1">
          {total} order{total !== 1 ? "s" : ""} total
        </p>
      </div>

      <DataTable<AdminOrder>
        tableRef={tableRef}
        columns={columns}
        fetchData={fetchOrders}
        searchPlaceholder="Order ID or Customer name or phone..."
        filters={[
          {
            key: "status",
            label: "Status",
            options: ORDER_STATUSES.map((s) => ({ value: s, label: s })),
          },
        ]}
      />

      {/* ═══════════════ DETAIL / ERROR PANEL ═══════════════ */}
      {(detailOrder || detailError) && (
        <div
          className="fixed inset-0 bg-[rgba(10,10,8,0.5)] flex items-center justify-center z-100 p-6"
          onClick={closeDetail}
        >
          <div
            className="bg-[var(--bg-primary)] rounded-2xl w-full max-w-150 max-h-[85vh] overflow-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Error state ── */}
            {detailError && !detailOrder && (
              <>
                <div className="flex justify-between items-center py-5 px-6 border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--bg-primary)] z-1">
                  <h2 className="font-display text-lg text-[var(--text-heading)] font-normal m-0">
                    Order Not Found
                  </h2>
                  <button
                    className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--text-muted)]"
                    onClick={closeDetail}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-8 text-center">
                  <AlertTriangle size={32} className="text-[var(--accent-rose)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--text-secondary)] font-primary">
                    {detailError}
                  </p>
                  <button
                    className="mt-4 py-2 px-4 bg-[var(--bg-elevated)] border-0 rounded-sm text-sm font-primary text-[var(--text-secondary)] cursor-pointer"
                    onClick={closeDetail}
                  >
                    Close
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
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
