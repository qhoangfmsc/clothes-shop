"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Eye, X, Package, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useAdminUsers, type AdminUser, type AdminOrder } from "@/src/hooks/use-admin-api";
import { RoleGuard } from "@/src/app/[locale]/_components/RoleGuard";
import OrderDetailPanel from "@/src/app/[locale]/_components/OrderDetailPanel";
import { buildListQuery } from "@/src/lib/list-query";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { useSortOptions } from "@/src/hooks/use-sort-options";
import { useSystemPasswordPrompt } from "@/src/app/[locale]/_components/SystemPasswordPrompt";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableRef,
} from "@/src/app/[locale]/_components/DataTable";
import {
  FormTabs,
  FormSection,
  FormField,
  inputClass,
  type FormTab,
} from "@/src/app/[locale]/_components/AdminFormKit";
import { PERMISSIONS, hasPermission } from "@/src/lib/permissions";
import { useAuth } from "@/src/contexts/auth-context";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { useOrderStatusLabel, useRoleLabel } from "@/src/i18n/use-labels";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { fetchUserList, updateUser } from "./_common/moduleSlice";
import { ROLE_OPTIONS, STATUS_OPTIONS, USER_SORT_OPTIONS } from "./_common/constants";
import type { UserListResult } from "./_common/types";
import { authApi } from "@/src/lib/auth-api";

/* ═══════════════════════════════ Main Component ═══════════════════════ */

export default function UsersContent() {
  const t = useTranslations("admin.users");
  const toErrorMessage = useErrorMessage();
  const sortOptions = useSortOptions(USER_SORT_OPTIONS);
  const tStatus = useTranslations("common.status");
  const locale = useLocale();
  const format = useFormatter();
  const roleLabel = useRoleLabel();
  const orderStatusLabel = useOrderStatusLabel();
  const { user: currentUser } = useAuth();
  /* The memoised columns call handleView from an older render, so read the user through a ref */
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const userTabs: FormTab[] = [
    { id: "orders", label: t("modal.tabs.orders") },
    { id: "role", label: t("modal.tabs.role") },
  ];
  const tableRef = useRef<DataTableRef>(null);
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const requestPassword = useSystemPasswordPrompt();

  const { total, isUpdating } = useAppSelector((s) => s.users);

  /* ── fetchData for DataTable (passes search, role, status, page, limit) ── */
  const fetchUsers = async (params: DataTableFetchParams): Promise<UserListResult> => {
    return dispatch(
      fetchUserList({
        search: params.search || undefined,
        role: params.filters.role || undefined,
        status: params.filters.status || undefined,
        sort: params.sort,
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
        header: t("table.columns.user"),
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
        header: t("table.columns.email"),
        render: (u) => <span className="text-xs text-[var(--text-muted)]">{u.email}</span>,
      },
      {
        key: "role",
        header: t("table.columns.role"),
        render: (u) => (
          <span
            className={`inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary ${
              u.role === "admin"
                ? "bg-[rgba(201,169,110,0.15)] text-[var(--accent-primary)]"
                : "bg-[rgba(143,163,180,0.12)] text-[var(--accent-blue)]"
            }`}
          >
            {roleLabel(u.role)}
          </span>
        ),
      },
      {
        key: "status",
        header: t("table.columns.status"),
        render: (u) => (
          <span
            className={`inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary ${
              u.status === "active"
                ? "bg-[rgba(163,177,138,0.15)] text-[var(--accent-sage)]"
                : "bg-[rgba(212,165,165,0.15)] text-[var(--accent-rose)]"
            }`}
          >
            {tStatus.has(u.status as never) ? tStatus(u.status as never) : u.status}
          </span>
        ),
      },
      {
        key: "joined",
        header: t("table.columns.joined"),
        render: (u) => (
          <span className="text-xs text-[var(--text-muted)]">
            {format.dateTime(new Date(u.createdAt), "short")}
          </span>
        ),
      },
      {
        key: "actions",
        header: t("table.columns.actions"),
        align: "right",
        render: (u) => (
          <RoleGuard permission={PERMISSIONS.USER_ADMIN_UPDATE}>
            <button
              className="inline-flex items-center gap-1 py-1 px-3 text-xs font-medium font-primary rounded-sm border-0 cursor-pointer bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
              onClick={() => handleView(u)}
            >
              <Eye size={14} />
              <span>{t("table.view")}</span>
            </button>
          </RoleGuard>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  );

  /* ── Edit modal state ── */
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>("orders");
  const [selectedRole, setSelectedRole] = useState<string>("user");
  const closeEdit = () => setEditingUser(null);

  /* ── "View" re-confirms the system password (15-minute TTL, shared with the admin gate) ── */
  const handleView = async (user: AdminUser) => {
    /* Permission first, password second: never ask for the password when the action isn't allowed anyway */
    if (!hasPermission(currentUserRef.current, PERMISSIONS.USER_ADMIN_UPDATE)) return;
    const ok = await requestPassword();
    if (!ok) return;
    openEdit(user);
  };

  const handleSaveRole = async () => {
    if (!editingUser || selectedRole === editingUser.role) return;
    try {
      await dispatch(updateUser({ id: editingUser.id, body: { role: selectedRole } })).unwrap();
      toast.success(t("toast.roleUpdated"));
      setEditingUser((u) => (u ? { ...u, role: selectedRole } : u));
      tableRef.current?.refresh();
    } catch (err) {
      toast.error(toErrorMessage(err, t("toast.roleFailed")));
    }
  };

  /* ── Orders state (mini dashboard for the edited user) ── */
  const [userOrders, setUserOrders] = useState<AdminOrder[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const ORDERS_PAGE_SIZE = 5;

  const fetchUserOrders = async (userId: string, page: number) => {
    setOrdersLoading(true);
    try {
      const qs = buildListQuery({ page, limit: ORDERS_PAGE_SIZE }, { userId });
      const res = await authApi.get<{ data: AdminOrder[]; total: number }>(
        `/api/admin/orders?${qs}`
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
    setActiveTab("orders");
    setSelectedRole(user.role);
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
    <div className="flex flex-col gap-6 h-full min-h-0">
      {/* ── Header ── */}
      <div className="shrink-0">
        <h1 className="font-display text-2xl text-[var(--text-heading)] font-normal">{t("page.title")}</h1>
        <p className="text-xs text-[var(--text-muted)] font-primary mt-1">
          {t("page.total", { count: total })}
        </p>
      </div>

      <DataTable<AdminUser>
        tableRef={tableRef}
        columns={columns}
        fetchData={fetchUsers}
        searchPlaceholder={t("table.searchPlaceholder")}
        filters={[
          {
            key: "role",
            label: t("table.filters.role"),
            options: ROLE_OPTIONS.map((r) => ({ value: r, label: roleLabel(r) })),
          },
          {
            key: "status",
            label: t("table.filters.status"),
            options: STATUS_OPTIONS.map((s) => ({ value: s, label: tStatus(s) })),
          },
        ]}
        sortOptions={sortOptions}
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
                  {t("modal.title")}
                </h2>
                <p className="text-xs text-[var(--text-muted)] font-primary mt-0.5">
                  {editingUser.email}
                </p>
              </div>
              <button
                className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--text-muted)]"
                onClick={closeEdit}
                aria-label={t("modal.close")}
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Tabs ── */}
            <FormTabs tabs={userTabs} active={activeTab} onChange={setActiveTab} />

            {/* ── Orders ── */}
            {activeTab === "orders" && (
              <div className="overflow-auto flex-1 p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[var(--text-primary)] font-primary">
                    {t("orders.summary", { count: ordersTotal })}
                  </span>
                  {ordersTotal > ORDERS_PAGE_SIZE && (
                    <span className="text-[11px] text-[var(--text-muted)] font-primary">
                      {t("orders.pageOf", { page: ordersPage, total: Math.ceil(ordersTotal / ORDERS_PAGE_SIZE) })}
                    </span>
                  )}
                </div>

                {ordersLoading ? (
                  <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                    {t("orders.loading")}
                  </p>
                ) : userOrders.length === 0 ? (
                  <div className="py-10 text-center">
                    <Package size={28} className="text-[var(--text-disabled)] mx-auto mb-2" />
                    <p className="text-xs text-[var(--text-muted)] font-primary">{t("orders.empty")}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      {userOrders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center gap-3 py-2.5 px-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--border-light)] transition-colors"
                          onClick={() => openOrderDetail(order)}
                          title={t("orders.viewOrder", { id: order.id })}
                        >
                          <code className="text-[11px] bg-[var(--bg-elevated)] py-0.5 px-1.5 rounded-sm font-mono font-semibold shrink-0">
                            #{order.id}
                          </code>
                          <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                            {t("orders.itemCount", { count: order.items?.length ?? 0 })}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)] shrink-0 hidden sm:block">
                            {format.dateTime(new Date(order.createdAt), "short")}
                          </span>
                          <div className="flex-1" />
                          <span
                            className={`inline-block py-0.5 px-2 rounded-full text-[11px] font-semibold font-primary shrink-0 ${statusStyle(order.status)}`}
                          >
                            {orderStatusLabel(order.status)}
                          </span>
                          <span className="text-xs font-semibold text-[var(--text-primary)] shrink-0">
                            {format.number(Number(order.total), "priceFixed")}
                          </span>
                        </div>
                      ))}
                    </div>

                    {ordersTotal > ORDERS_PAGE_SIZE && (
                      <div className="flex justify-center items-center gap-3 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                        <button
                          className="flex items-center justify-center w-7 h-7 border-0 rounded-sm bg-[var(--bg-secondary)] cursor-pointer text-[var(--text-secondary)] disabled:opacity-40"
                          disabled={ordersPage <= 1 || ordersLoading}
                          aria-label={t("orders.previous")}
                          onClick={() => {
                            const prev = ordersPage - 1;
                            setOrdersPage(prev);
                            fetchUserOrders(editingUser.id, prev);
                          }}
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-[11px] text-[var(--text-muted)] font-primary">
                          {t("orders.pager", { page: ordersPage, total: Math.ceil(ordersTotal / ORDERS_PAGE_SIZE) })}
                        </span>
                        <button
                          className="flex items-center justify-center w-7 h-7 border-0 rounded-sm bg-[var(--bg-secondary)] cursor-pointer text-[var(--text-secondary)] disabled:opacity-40"
                          disabled={
                            ordersPage >= Math.ceil(ordersTotal / ORDERS_PAGE_SIZE) || ordersLoading
                          }
                          aria-label={t("orders.next")}
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
            )}

            {/* ── Role ── */}
            {activeTab === "role" && (
              <div className="overflow-auto flex-1 p-6">
                <FormSection title={t("role.section")}>
                  <FormField
                    label={t("role.label")}
                    info={t("role.info")}
                  >
                    <select
                      className={inputClass}
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {roleLabel(r)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <button
                    type="button"
                    className="self-start flex items-center gap-1.5 py-2 px-5 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-sm text-sm font-semibold font-primary cursor-pointer disabled:opacity-50"
                    onClick={handleSaveRole}
                    disabled={isUpdating || selectedRole === editingUser.role}
                  >
                    <ShieldCheck size={14} />
                    {isUpdating ? t("role.saving") : t("role.save")}
                  </button>
                </FormSection>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ ORDER DETAIL MODAL (stacks on top of the Edit User modal) ══════════ */}
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
