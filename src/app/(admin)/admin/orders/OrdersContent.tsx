"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import { X, Package, MapPin, CreditCard } from "lucide-react";
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
    pending: "bg-[rgba(240,228,166,0.2)] text-[#B8A040]",
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

  const { isUpdating, total } = useAppSelector((s) => s.orders);

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
            #{o.id.slice(0, 8)}
          </code>
        ),
      },
      {
        key: "customer",
        header: "Customer",
        render: (o) => (
          <span className="text-xs text-[var(--text-muted)]">{o.userId.slice(0, 8)}</span>
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

  /* ── Detail Panel State ── */
  const [detailOrder, setDetailOrder] = useState<AdminOrder | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  /* ── Handlers ── */

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await dispatch(updateOrderStatus({ id: orderId, status: newStatus })).unwrap();
      toast.success(`Order #${orderId.slice(0, 8)} → ${newStatus}`);
      if (detailOrder?.id === orderId) {
        setDetailOrder((p) => (p ? { ...p, status: newStatus } : null));
      }
      tableRef.current?.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const openDetail = async (order: AdminOrder) => {
    setDetailOrder(order);
    setLoadingDetail(true);
    try {
      const fresh = await dispatch(fetchOrderDetail(order.id)).unwrap();
      setDetailOrder(fresh);
    } catch {
      /* keep cached order data */
    } finally {
      setLoadingDetail(false);
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

      {/* ═══════════════ DETAIL PANEL ═══════════════ */}
      {detailOrder && (
        <div
          className="fixed inset-0 bg-[rgba(10,10,8,0.5)] flex items-center justify-center z-100 p-6"
          onClick={() => setDetailOrder(null)}
        >
          <div
            className="bg-[var(--bg-primary)] rounded-2xl w-full max-w-150 max-h-[85vh] overflow-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center py-5 px-6 border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--bg-primary)] z-1">
              <h2 className="font-display text-lg text-[var(--text-heading)] font-normal m-0">
                Order #{detailOrder.id.slice(0, 8)}
              </h2>
              <button
                className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--text-muted)]"
                onClick={() => setDetailOrder(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              {loadingDetail && (
                <p className="text-xs text-[var(--text-muted)] py-4">Loading full detail...</p>
              )}

              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-[var(--text-muted)] font-primary font-medium">
                  Status
                </span>
                <span
                  className={`inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary capitalize ${statusStyle(detailOrder.status)}`}
                >
                  {detailOrder.status}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-[var(--text-muted)] font-primary font-medium">
                  Date
                </span>
                <span className="text-sm text-[var(--text-primary)] font-primary">
                  {new Date(detailOrder.createdAt).toLocaleString()}
                </span>
              </div>

              {/* Items */}
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)] font-primary mt-6 mb-3 pt-4 border-t border-[var(--border-subtle)]">
                <Package size={14} /> Items ({detailOrder.items?.length ?? 0})
              </h3>
              <div className="flex flex-col gap-3">
                {detailOrder.items?.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {item.productImage && (
                      <div className="relative w-10 h-12 shrink-0">
                        <Image
                          src={item.productImage}
                          alt=""
                          fill
                          className="object-cover rounded-sm"
                          sizes="40px"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {item.productName}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {item.size && `Size: ${item.size}`}
                        {item.size && item.color && " / "}
                        {item.color && `Color: ${item.color}`}
                        {" — "}Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-primary)] shrink-0">
                      ${(Number(item.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Shipping */}
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)] font-primary mt-6 mb-3 pt-4 border-t border-[var(--border-subtle)]">
                <MapPin size={14} /> Shipping
              </h3>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-[var(--text-muted)] font-primary font-medium">
                  Method
                </span>
                <span className="text-sm text-[var(--text-primary)] font-primary">
                  {detailOrder.shippingMethod || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-[var(--text-muted)] font-primary font-medium">
                  Fee
                </span>
                <span className="text-sm text-[var(--text-primary)] font-primary">
                  ${Number(detailOrder.shippingFee).toFixed(2)}
                </span>
              </div>
              {detailOrder.shippingAddress && (
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg p-3 flex flex-col gap-0.5 mt-2">
                  {Object.entries(detailOrder.shippingAddress).map(([k, v]) => (
                    <span key={k} className="text-xs text-[var(--text-secondary)] font-primary">
                      <strong>{k}:</strong> {String(v ?? "—")}
                    </span>
                  ))}
                </div>
              )}

              {/* Payment */}
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)] font-primary mt-6 mb-3 pt-4 border-t border-[var(--border-subtle)]">
                <CreditCard size={14} /> Payment
              </h3>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-[var(--text-muted)] font-primary font-medium">
                  Subtotal
                </span>
                <span className="text-sm text-[var(--text-primary)] font-primary">
                  ${Number(detailOrder.subtotal).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-[var(--text-muted)] font-primary font-medium">
                  Shipping
                </span>
                <span className="text-sm text-[var(--text-primary)] font-primary">
                  ${Number(detailOrder.shippingFee).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 pt-3 border-t border-[var(--border-subtle)]">
                <span className="text-xs font-semibold text-[var(--text-primary)] font-primary">
                  Total
                </span>
                <span className="text-md font-semibold text-[var(--text-primary)] font-primary">
                  ${Number(detailOrder.total).toFixed(2)}
                </span>
              </div>
              {detailOrder.note && (
                <div className="mt-4">
                  <span className="text-xs text-[var(--text-muted)] font-primary font-medium">
                    Note
                  </span>
                  <p className="text-sm text-[var(--text-secondary)] font-primary italic mt-1">
                    {detailOrder.note}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
