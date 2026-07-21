"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import { Pencil, X, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { useAdminUsers, type AdminUser, type AdminOrder } from "@/src/hooks/use-admin-api";
import { RoleGuard } from "@/src/app/_components/RoleGuard";
import OrderDetailPanel from "@/src/app/_components/OrderDetailPanel";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableRef,
} from "@/src/app/_components/DataTable";
import { PERMISSIONS } from "@/src/lib/permissions";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { fetchUserList } from "./_common/moduleSlice";
import { ROLE_OPTIONS, STATUS_OPTIONS } from "./_common/constants";
import type { UserListResult } from "./_common/types";
import { authApi } from "@/src/lib/auth-api";

/* ═══════════════════════════════ Main Component ═══════════════════════ */

export default function UsersContent() {
  const tableRef = useRef<DataTableRef>(null);
  const dispatch = useAppDispatch();

  const { total } = useAppSelector((s) => s.users);

  /* ── fetchData for DataTable (passes search, role, status, page, limit) ── */
  const fetchUsers = async (params: DataTableFetchParams): Promise<UserListResult> => {
    return dispatch(
      fetchUserList({
        search: params.search || undefined,
        role: params.filters.role || undefined,
        status: params.filters.status || undefined,
        page: params.page,
        limit: params.limit,
      })
    ).unwrap();
  };

  /* ── Columns ── */
  const columns: DataTableColumn<AdminUser>[] = useMemo(
    () => [
      {
        key: "user",
        header: "User",
        render: (u) => (
          <div className="flex items-center gap-3">
            {u.image ? (
              <div className="relative w-8 h-8 shrink-0">
                <Image
                  src={u.image}
                  alt=""
                  fill
                  className="rounded-full object-cover"
                  sizes="32px"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-semibold text-[var(--text-muted)] shrink-0">
                {(u.name ?? u.email).charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-semibold">{u.name ?? "—"}</span>
          </div>
        ),
      },
      {
        key: "email",
        header: "Email",
        render: (u) => <span className="text-xs text-[var(--text-muted)]">{u.email}</span>,
      },
      {
        key: "role",
        header: "Role",
        render: (u) => (
          <span
            className={`inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary capitalize ${
              u.role === "admin"
                ? "bg-[rgba(201,169,110,0.15)] text-[var(--accent-primary)]"
                : "bg-[rgba(143,163,180,0.12)] text-[var(--accent-blue)]"
            }`}
          >
            {u.role}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (u) => (
          <span
            className={`inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary capitalize ${
              u.status === "active"
                ? "bg-[rgba(163,177,138,0.15)] text-[var(--accent-sage)]"
                : "bg-[rgba(212,165,165,0.15)] text-[var(--accent-rose)]"
            }`}
          >
            {u.status}
          </span>
        ),
      },
      {
        key: "joined",
        header: "Joined",
        render: (u) => (
          <span className="text-xs text-[var(--text-muted)]">
            {new Date(u.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (u) => (
          <RoleGuard permission={PERMISSIONS.USER_ADMIN_UPDATE}>
            <button
              className="inline-flex items-center gap-1 py-1 px-3 text-xs font-medium font-primary rounded-sm border-0 cursor-pointer bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
              onClick={() => openEdit(u)}
            >
              <Pencil size={14} />
              <span>Edit</span>
            </button>
          </RoleGuard>
        ),
      },
    ],
    []
  );

  /* ── Edit modal state ── */
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const closeEdit = () => setEditingUser(null);

  /* ── Orders state (mini dashboard for the edited user) ── */
  const [userOrders, setUserOrders] = useState<AdminOrder[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const ORDERS_PAGE_SIZE = 5;

  const fetchUserOrders = async (userId: string, page: number) => {
    setOrdersLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("userId", userId);
      qs.set("limit", String(ORDERS_PAGE_SIZE));
      if (page > 1) qs.set("page", String(page));
      const res = await authApi.get<{ data: AdminOrder[]; total: number }>(
        `/api/admin/orders?${qs.toString()}`
      );
      setUserOrders(res.data);
      setOrdersTotal(res.total);
    } catch {
      setUserOrders([]);
      setOrdersTotal(0);
    } finally {
      setOrdersLoading(false);
    }
  };

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    setUserOrders([]);
    setOrdersTotal(0);
    setOrdersPage(1);
    setSelectedOrder(null);
    fetchUserOrders(user.id, 1);
  };

  /* ── Inline order detail (shown inside modal when clicking an order) ── */
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);

  const openOrderDetail = async (order: AdminOrder) => {
    setSelectedOrder(order);
    setLoadingOrderDetail(true);
    try {
      const qs = new URLSearchParams();
      qs.set("userId", editingUser?.id ?? "");
      const res = await authApi.get<{ data: AdminOrder }>(
        `/api/admin/orders/${order.id}?${qs.toString()}`
      );
      setSelectedOrder(res.data);
    } catch {
      /* keep cached order data */
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  /* ── Order status style (mirrors OrdersContent) ── */
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

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div>
        <h1 className="font-display text-2xl text-[var(--text-heading)] font-normal">Users</h1>
        <p className="text-xs text-[var(--text-muted)] font-primary mt-1">
          {total} user{total !== 1 ? "s" : ""} total
        </p>
      </div>

      <DataTable<AdminUser>
        tableRef={tableRef}
        columns={columns}
        fetchData={fetchUsers}
        searchPlaceholder="Name or email..."
        filters={[
          {
            key: "role",
            label: "Role",
            options: ROLE_OPTIONS.map((r) => ({ value: r, label: r })),
          },
          {
            key: "status",
            label: "Status",
            options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          },
        ]}
      />

      {/* ═══════════════ EDIT MODAL ═══════════════ */}
      {editingUser && (
        <div
          className="fixed inset-0 bg-[rgba(10,10,8,0.5)] flex items-center justify-center z-100 p-6"
          onClick={closeEdit}
        >
          <div
            className="bg-[var(--bg-primary)] rounded-2xl w-full max-w-160 max-h-[85vh] overflow-hidden shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="flex justify-between items-center py-5 px-6 border-b border-[var(--border-subtle)] shrink-0">
              <div>
                <h2 className="font-display text-lg text-[var(--text-heading)] font-normal m-0">
                  Edit User
                </h2>
                <p className="text-xs text-[var(--text-muted)] font-primary mt-0.5">
                  {editingUser.email}
                </p>
              </div>
              <button
                className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--text-muted)]"
                onClick={closeEdit}
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Tabs ── */}
            <div className="flex border-b border-[var(--border-subtle)] shrink-0 px-6">
              <span className="py-3 px-4 text-sm font-medium font-primary text-[var(--text-primary)] relative">
                <Package size={14} className="inline mr-1.5" />
                Orders
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-primary)]" />
              </span>
            </div>

            {/* ── Orders ── */}
            <div className="overflow-auto flex-1 p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[var(--text-primary)] font-primary">
                  {ordersTotal} order{ordersTotal !== 1 ? "s" : ""} from this user
                </span>
                {ordersTotal > ORDERS_PAGE_SIZE && (
                  <span className="text-[11px] text-[var(--text-muted)] font-primary">
                    Page {ordersPage} of {Math.ceil(ordersTotal / ORDERS_PAGE_SIZE)}
                  </span>
                )}
              </div>

              {ordersLoading ? (
                <p className="text-xs text-[var(--text-muted)] py-8 text-center">Loading orders...</p>
              ) : userOrders.length === 0 ? (
                <div className="py-10 text-center">
                  <Package size={28} className="text-[var(--text-disabled)] mx-auto mb-2" />
                  <p className="text-xs text-[var(--text-muted)] font-primary">No orders yet</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {userOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center gap-3 py-2.5 px-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--border-light)] transition-colors"
                        onClick={() => openOrderDetail(order)}
                        title={`View order #${order.id}`}
                      >
                        <code className="text-[11px] bg-[var(--bg-elevated)] py-0.5 px-1.5 rounded-sm font-mono font-semibold shrink-0">
                          #{order.id}
                        </code>
                        <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                          {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? "s" : ""}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] shrink-0 hidden sm:block">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                        <div className="flex-1" />
                        <span
                          className={`inline-block py-0.5 px-2 rounded-full text-[11px] font-semibold font-primary capitalize shrink-0 ${statusStyle(order.status)}`}
                        >
                          {order.status}
                        </span>
                        <span className="text-xs font-semibold text-[var(--text-primary)] shrink-0">
                          ${Number(order.total).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {ordersTotal > ORDERS_PAGE_SIZE && (
                    <div className="flex justify-center items-center gap-3 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                      <button
                        className="flex items-center justify-center w-7 h-7 border-0 rounded-sm bg-[var(--bg-secondary)] cursor-pointer text-[var(--text-secondary)] disabled:opacity-40"
                        disabled={ordersPage <= 1 || ordersLoading}
                        onClick={() => {
                          const prev = ordersPage - 1;
                          setOrdersPage(prev);
                          fetchUserOrders(editingUser.id, prev);
                        }}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-[11px] text-[var(--text-muted)] font-primary">
                        {ordersPage} / {Math.ceil(ordersTotal / ORDERS_PAGE_SIZE)}
                      </span>
                      <button
                        className="flex items-center justify-center w-7 h-7 border-0 rounded-sm bg-[var(--bg-secondary)] cursor-pointer text-[var(--text-secondary)] disabled:opacity-40"
                        disabled={ordersPage >= Math.ceil(ordersTotal / ORDERS_PAGE_SIZE) || ordersLoading}
                        onClick={() => {
                          const next = ordersPage + 1;
                          setOrdersPage(next);
                          fetchUserOrders(editingUser.id, next);
                        }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ══════════ ORDER DETAIL MODAL (chồng lên Edit User modal) ══════════ */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-[rgba(10,10,8,0.5)] flex items-center justify-center z-110 p-6"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-[var(--bg-primary)] rounded-2xl w-full max-w-150 max-h-[85vh] overflow-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <OrderDetailPanel
              order={selectedOrder}
              loading={loadingOrderDetail}
              onClose={() => setSelectedOrder(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
