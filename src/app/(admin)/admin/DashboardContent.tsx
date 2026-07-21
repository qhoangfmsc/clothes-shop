"use client";

import { useMemo } from "react";
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
import { useAdminProducts } from "@/src/hooks/use-admin-api";
import { useAdminOrders } from "@/src/hooks/use-admin-api";
import { useAdminUsers } from "@/src/hooks/use-admin-api";

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

export default function DashboardContent() {
  /* Fetch data with large limits for stats */
  const {
    products,
    total: totalProducts,
    isLoading: loadingProducts,
  } = useAdminProducts({ limit: 200 });
  const { orders, total: totalOrders, isLoading: loadingOrders } = useAdminOrders({ limit: 500 });
  const {
    users: _users,
    total: totalUsers,
    isLoading: loadingUsers,
  } = useAdminUsers({ limit: 200 });

  /* ── Computed stats ── */
  const stats = useMemo(() => {
    const activeProducts = products.filter((p) => p.status === "active").length;
    const inactiveProducts = totalProducts - activeProducts;

    /* Revenue = sum of non-cancelled orders */
    const validOrders = orders.filter((o) => o.status !== "cancelled");
    const totalRevenue = validOrders.reduce((sum, o) => sum + Number(o.total), 0);

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
      totalRevenue,
      ordersByStatus,
      productsByCategory,
      validOrders,
    };
  }, [products, orders, totalProducts]);

  const recentOrders = orders.slice(0, 8);

  const loading = loadingProducts || loadingOrders || loadingUsers;

  return (
    <div className="flex flex-col gap-[var(--space-8)]">
      <h1 className="font-display text-2xl text-[var(--text-heading)] font-normal m-0">
        Dashboard
      </h1>

      {/* ══════ KPI Cards ══════ */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-[var(--space-5)]">
        <KpiCard
          icon={<DollarSign size={20} />}
          label="Total Revenue"
          value={loading ? "—" : `$${stats.totalRevenue.toLocaleString()}`}
          sub={`from ${stats.validOrders.length} completed orders`}
          accent="var(--accent-primary)"
        />
        <KpiCard
          icon={<ShoppingBag size={20} />}
          label="Orders"
          value={loading ? "—" : totalOrders}
          sub={
            loading
              ? ""
              : `${stats.ordersByStatus["pending"] || 0} pending · ${stats.ordersByStatus["completed"] || 0} completed`
          }
          accent="var(--accent-blue)"
        />
        <KpiCard
          icon={<Shirt size={20} />}
          label="Products"
          value={loading ? "—" : totalProducts}
          sub={loading ? "" : `${stats.activeProducts} active · ${stats.inactiveProducts} inactive`}
          accent="var(--accent-sage)"
        />
        <KpiCard
          icon={<Users size={20} />}
          label="Users"
          value={loading ? "—" : totalUsers}
          sub="registered accounts"
          accent="var(--accent-lavender)"
        />
      </div>

      {/* ══════ Bottom Grid ══════ */}
      <div className="grid grid-cols-[2fr_1fr] gap-[var(--space-6)]">
        {/* Recent Orders */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-[var(--space-5)]">
          <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-4)]">
            <TrendingUp size={16} className="text-[var(--accent-primary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)] font-primary m-0">
              Recent Orders
            </h2>
          </div>
          {loading ? (
            <p className="text-sm text-[var(--text-muted)] font-primary py-[var(--space-6)] text-center">
              Loading...
            </p>
          ) : recentOrders.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] font-primary py-[var(--space-6)] text-center">
              No orders yet.
            </p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold text-[var(--text-muted)] py-[var(--space-2)] px-[var(--space-3)] border-b border-[var(--border-subtle)] font-primary uppercase tracking-[0.05em]">
                    Order
                  </th>
                  <th className="text-left text-xs font-semibold text-[var(--text-muted)] py-[var(--space-2)] px-[var(--space-3)] border-b border-[var(--border-subtle)] font-primary uppercase tracking-[0.05em]">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-[var(--text-muted)] py-[var(--space-2)] px-[var(--space-3)] border-b border-[var(--border-subtle)] font-primary uppercase tracking-[0.05em]">
                    Items
                  </th>
                  <th className="text-left text-xs font-semibold text-[var(--text-muted)] py-[var(--space-2)] px-[var(--space-3)] border-b border-[var(--border-subtle)] font-primary uppercase tracking-[0.05em]">
                    Total
                  </th>
                  <th className="text-left text-xs font-semibold text-[var(--text-muted)] py-[var(--space-2)] px-[var(--space-3)] border-b border-[var(--border-subtle)] font-primary uppercase tracking-[0.05em]">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-[var(--border-subtle)]">
                    <td className="py-[var(--space-2)] px-[var(--space-3)] text-sm font-primary text-[var(--text-primary)] align-middle">
                      <code className="text-xs font-mono font-semibold bg-[var(--bg-elevated)] py-0.5 px-1.5 rounded-[var(--radius-sm)]">
                        #{o.id}
                      </code>
                    </td>
                    <td className="py-[var(--space-2)] px-[var(--space-3)] text-sm font-primary text-[var(--text-primary)] align-middle">
                      <span
                        className={`inline-flex items-center gap-1 py-0.5 px-2 rounded-[var(--radius-pill)] text-xs font-semibold font-primary capitalize ${STATUS_STYLE[o.status]}`}
                      >
                        {STATUS_ICON[o.status]} {o.status}
                      </span>
                    </td>
                    <td className="py-[var(--space-2)] px-[var(--space-3)] text-sm font-primary text-[var(--text-primary)] align-middle">
                      <span className="text-xs text-[var(--text-muted)] font-primary">
                        {o.items?.length ?? 0}
                      </span>
                    </td>
                    <td className="py-[var(--space-2)] px-[var(--space-3)] text-sm font-primary text-[var(--text-primary)] align-middle">
                      <span className="font-semibold">${Number(o.total).toFixed(2)}</span>
                    </td>
                    <td className="py-[var(--space-2)] px-[var(--space-3)] text-sm font-primary text-[var(--text-primary)] align-middle">
                      <span className="text-xs text-[var(--text-muted)] font-primary">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-[var(--space-5)]">
          <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-4)]">
            <ShoppingBag size={16} className="text-[var(--accent-primary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)] font-primary m-0">
              Order Status
            </h2>
          </div>
          {loading ? (
            <p className="text-sm text-[var(--text-muted)] font-primary py-[var(--space-6)] text-center">
              Loading...
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
                      <div className="flex items-center gap-1.5 min-w-[100px]">
                        {STATUS_ICON[status]}
                        <span className="capitalize font-primary text-sm text-[var(--text-primary)]">
                          {status}
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
                        <span className="text-sm font-semibold font-primary text-[var(--text-primary)] min-w-[24px] text-right">
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
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-[var(--space-4)] py-[var(--space-5)] px-[var(--space-6)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)]">
      <div
        className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
        style={{ color: accent, background: `${accent}15` }}
      >
        {icon}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="font-display text-xl text-[var(--text-heading)] leading-tight font-normal">
          {value}
        </p>
        <p className="text-xs text-[var(--text-muted)] font-primary font-medium">{label}</p>
        {sub && <p className="text-xs text-[var(--text-disabled)] font-primary mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
