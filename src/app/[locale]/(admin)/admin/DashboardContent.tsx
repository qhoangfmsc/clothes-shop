"use client";

import { LIST_MAX_LIMIT } from "@/src/lib/list-query";
import { useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useMoney } from "@/src/hooks/use-money";
import {
  DollarSign,
  ShoppingBag,
  Shirt,
  Users,
  TrendingUp,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
} from "lucide-react";
import { DataTable, type DataTableColumn } from "@/src/app/[locale]/_components/DataTable";
import MoneyText from "@/src/app/[locale]/_components/MoneyText";
import { moneyOf } from "@/src/lib/money";
import { useAdminProducts, type AdminOrder } from "@/src/hooks/use-admin-api";
import { useAdminOrders } from "@/src/hooks/use-admin-api";
import { useAdminUsers } from "@/src/hooks/use-admin-api";
import { useOrderStatusLabel } from "@/src/i18n/use-labels";
import AnalyticsSummary from "./_components/AnalyticsSummary";

/* ── Status style map ── */
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-[rgba(240,228,166,0.2)] text-[var(--color-honey)]",
  confirmed: "bg-[rgba(143,163,180,0.15)] text-[var(--accent-blue)]",
  shipping: "bg-[rgba(184,165,200,0.15)] text-[var(--accent-lavender)]",
  delivered: "bg-[rgba(163,177,138,0.15)] text-[var(--accent-sage)]",
  completed: "bg-[rgba(201,169,110,0.15)] text-[var(--accent-primary)]",
  cancelled: "bg-[rgba(212,165,165,0.15)] text-[var(--accent-rose)]",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--color-honey)",
  confirmed: "var(--accent-blue)",
  shipping: "var(--accent-lavender)",
  delivered: "var(--accent-sage)",
  completed: "var(--accent-primary)",
  cancelled: "var(--accent-rose)",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock size={14} />,
  confirmed: <CheckCircle2 size={14} />,
  shipping: <Truck size={14} />,
  delivered: <Package size={14} />,
  completed: <CheckCircle2 size={14} />,
  cancelled: <XCircle size={14} />,
};

function buildRecentOrderColumns(ctx: {
  headers: Record<"order" | "status" | "items" | "total" | "date", string>;
  format: ReturnType<typeof useFormatter>;
  statusLabel: (status: string) => string;
}): DataTableColumn<AdminOrder>[] {
  const { headers, format, statusLabel } = ctx;
  return [
    {
      key: "order",
      header: headers.order,
      render: (o) => (
        <code className="text-xs font-mono font-semibold bg-[var(--bg-elevated)] py-0.5 px-1.5 rounded-[var(--radius-sm)]">
          #{o.id}
        </code>
      ),
    },
    {
      key: "status",
      header: headers.status,
      render: (o) => (
        <span
          className={`inline-flex items-center gap-1 py-0.5 px-2 rounded-[var(--radius-pill)] text-xs font-semibold font-primary capitalize ${STATUS_STYLE[o.status]}`}
        >
          {STATUS_ICON[o.status]} {statusLabel(o.status)}
        </span>
      ),
    },
    {
      key: "items",
      header: headers.items,
      hideBelow: "sm",
      render: (o) => (
        <span className="text-xs text-[var(--text-muted)]">{o.items?.length ?? 0}</span>
      ),
    },
    {
      key: "total",
      header: headers.total,
      render: (o) => (
        <MoneyText money={moneyOf(o, "total")} amountClassName="font-semibold text-[var(--accent-primary)]" />
      ),
    },
    {
      key: "date",
      header: headers.date,
      hideBelow: "sm",
      render: (o) => (
        <span className="text-xs text-[var(--text-muted)]">
          {format.dateTime(new Date(o.createdAt), "short")}
        </span>
      ),
    },
  ];
}

/* ── KPI accent palette — tint/border are literal rgba so they stay valid
   CSS (var() can't be string-concatenated with an alpha suffix). Reuses
   the same hues as the status badges above for visual consistency. */
const KPI_ACCENTS = {
  gold: {
    text: "var(--accent-primary)",
    tint: "rgba(201,169,110,0.1)",
    border: "rgba(201,169,110,0.3)",
  },
  blue: {
    text: "var(--accent-blue)",
    tint: "rgba(143,163,180,0.1)",
    border: "rgba(143,163,180,0.3)",
  },
  honey: {
    text: "var(--color-honey)",
    tint: "rgba(240,228,166,0.18)",
    border: "rgba(201,169,110,0.35)",
  },
  sage: {
    text: "var(--accent-sage)",
    tint: "rgba(163,177,138,0.1)",
    border: "rgba(163,177,138,0.3)",
  },
  lavender: {
    text: "var(--accent-lavender)",
    tint: "rgba(184,165,200,0.1)",
    border: "rgba(184,165,200,0.3)",
  },
} as const;

export default function DashboardContent() {
  const t = useTranslations("admin.dashboard");
  const format = useFormatter();
  const { vnd } = useMoney();
  const statusLabel = useOrderStatusLabel();
  const recentOrderColumns = buildRecentOrderColumns({
    headers: {
      order: t("recentOrders.columns.order"),
      status: t("recentOrders.columns.status"),
      items: t("recentOrders.columns.items"),
      total: t("recentOrders.columns.total"),
      date: t("recentOrders.columns.date"),
    },
    format,
    statusLabel,
  });
  /* Fetch data with large limits for stats */
  const {
    products,
    total: totalProducts,
    isLoading: loadingProducts,
  } = useAdminProducts({ limit: LIST_MAX_LIMIT });
  const { orders, total: totalOrders, isLoading: loadingOrders } = useAdminOrders({ limit: LIST_MAX_LIMIT });
  const {
    users: _users,
    total: totalUsers,
    isLoading: loadingUsers,
  } = useAdminUsers({ limit: LIST_MAX_LIMIT });

  /* ── Computed stats ── */
  const stats = useMemo(() => {
    const activeProducts = products.filter((p) => p.status === "active").length;
    const inactiveProducts = totalProducts - activeProducts;

    /* Revenue = sum of non-cancelled orders, in VND: whole dong add up exactly, and no USD is derived from the sum
       (the BE has no revenue total yet) */
    const validOrders = orders.filter((o) => o.status !== "cancelled");
    const totalRevenueVnd = validOrders.reduce((sum, o) => sum + o.totalVnd, 0);

    /* Orders by status */
    const ordersByStatus: Record<string, number> = {};
    orders.forEach((o) => {
      ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;
    });

    /* Products by category */
    const productsByCategory: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.category?.slug ?? "unknown";
      productsByCategory[cat] = (productsByCategory[cat] || 0) + 1;
    });

    return {
      activeProducts,
      inactiveProducts,
      totalRevenueVnd,
      ordersByStatus,
      productsByCategory,
      validOrders,
      pendingOrders: ordersByStatus["pending"] || 0,
    };
  }, [products, orders, totalProducts]);

  const recentOrders = orders.slice(0, 8);

  const loading = loadingProducts || loadingOrders || loadingUsers;

  return (
    <div className="flex flex-col gap-[var(--space-8)]">
      <h1 className="font-display text-2xl text-[var(--text-heading)] font-normal m-0">
        {t("title")}
      </h1>

      {/* ══════ KPI Cards ══════ */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(13.75rem,1fr))] gap-[var(--space-5)]">
        <KpiCard
          icon={<DollarSign size={20} />}
          label={t("kpi.revenue.label")}
          value={loading ? "—" : vnd(stats.totalRevenueVnd)}
          sub={t("kpi.revenue.sub", { count: stats.validOrders.length })}
          {...KPI_ACCENTS.gold}
        />
        <KpiCard
          icon={<Clock size={20} />}
          label={t("kpi.processing.label")}
          value={loading ? "—" : stats.pendingOrders}
          sub={t("kpi.processing.sub")}
          highlight={!loading && stats.pendingOrders > 0}
          {...KPI_ACCENTS.honey}
        />
        <KpiCard
          icon={<ShoppingBag size={20} />}
          label={t("kpi.orders.label")}
          value={loading ? "—" : totalOrders}
          sub={
            loading ? "" : t("kpi.orders.sub", { count: stats.ordersByStatus["completed"] || 0 })
          }
          {...KPI_ACCENTS.blue}
        />
        <KpiCard
          icon={<Shirt size={20} />}
          label={t("kpi.products.label")}
          value={loading ? "—" : totalProducts}
          sub={
            loading
              ? ""
              : t("kpi.products.sub", {
                  active: stats.activeProducts,
                  inactive: stats.inactiveProducts,
                })
          }
          {...KPI_ACCENTS.sage}
        />
        <KpiCard
          icon={<Users size={20} />}
          label={t("kpi.users.label")}
          value={loading ? "—" : totalUsers}
          sub={t("kpi.users.sub")}
          {...KPI_ACCENTS.lavender}
        />
      </div>

      {/* ══════ Storefront traffic (Vercel Web Analytics) ══════ */}
      <AnalyticsSummary orders={orders} ordersLoading={loadingOrders} />

      {/* ══════ Bottom Grid ══════ */}
      <div className="grid grid-cols-[2fr_1fr] gap-[var(--space-6)]">
        {/* Recent Orders */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-[var(--space-5)]">
          <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-4)]">
            <TrendingUp size={16} className="text-[var(--accent-primary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)] font-primary m-0">
              {t("recentOrders.title")}
            </h2>
          </div>
          <DataTable<AdminOrder>
            columns={recentOrderColumns}
            rows={recentOrders}
            loading={loading}
            searchable={false}
            emptyMessage={t("recentOrders.empty")}
          />
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-[var(--space-5)]">
          <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-4)]">
            <ShoppingBag size={16} className="text-[var(--accent-primary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)] font-primary m-0">
              {t("orderStatus.title")}
            </h2>
          </div>
          {loading ? (
            <p className="text-sm text-[var(--text-muted)] font-primary py-[var(--space-6)] text-center">
              {t("orderStatus.loading")}
            </p>
          ) : (
            <div className="flex flex-col gap-[var(--space-3)]">
              {["pending", "confirmed", "shipping", "delivered", "completed", "cancelled"].map(
                (status) => {
                  const count = stats.ordersByStatus[status] || 0;
                  const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
                  return (
                    <div
                      key={status}
                      className="flex items-center justify-between gap-[var(--space-3)]"
                    >
                      <div className="flex items-center gap-1.5 min-w-[6.25rem]">
                        <span style={{ color: STATUS_COLOR[status] }}>{STATUS_ICON[status]}</span>
                        <span className="font-primary text-sm text-[var(--text-primary)]">
                          {statusLabel(status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-[var(--space-2)] flex-1">
                        <div className="flex-1 h-1.5 bg-[var(--bg-elevated)] rounded-[var(--radius-pill)] overflow-hidden">
                          <div
                            className="h-full rounded-[var(--radius-pill)] transition-[width] duration-500 min-w-0.5"
                            style={{
                              width: `${pct}%`,
                              background: STATUS_COLOR[status] ?? "var(--text-muted)",
                            }}
                          />
                        </div>
                        <span
                          className="text-sm font-semibold font-primary min-w-[1.5rem] text-right"
                          style={{ color: STATUS_COLOR[status] ?? "var(--text-primary)" }}
                        >
                          {count}
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── KPI Card ── */
function KpiCard({
  icon,
  label,
  value,
  sub,
  text,
  tint,
  border,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  text: string;
  tint: string;
  border: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="relative flex items-center gap-[var(--space-4)] py-[var(--space-5)] px-[var(--space-6)] border rounded-[var(--radius-lg)]"
      style={{ background: tint, borderColor: border, borderWidth: highlight ? 1.5 : 1 }}
    >
      {highlight && (
        <span
          className="absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse"
          style={{ background: text }}
        />
      )}
      <div
        className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
        style={{ color: text, background: border }}
      >
        {icon}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="font-display text-xl leading-tight font-semibold" style={{ color: text }}>
          {value}
        </p>
        <p className="text-xs text-[var(--text-secondary)] font-primary font-semibold">{label}</p>
        {sub && <p className="text-xs text-[var(--text-muted)] font-primary mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
