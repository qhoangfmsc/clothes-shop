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
const STATUS_STYLE: Record<string, React.CSSProperties> = {
  pending: { background: "rgba(240,228,166,0.2)", color: "#B8A040" },
  confirmed: { background: "rgba(143,163,180,0.15)", color: "var(--accent-blue)" },
  shipping: { background: "rgba(184,165,200,0.15)", color: "var(--accent-lavender)" },
  delivered: { background: "rgba(163,177,138,0.15)", color: "var(--accent-sage)" },
  completed: { background: "rgba(201,169,110,0.15)", color: "var(--accent-primary)" },
  cancelled: { background: "rgba(212,165,165,0.15)", color: "var(--accent-rose)" },
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
  const { products, total: totalProducts, isLoading: loadingProducts } = useAdminProducts({ limit: 200 });
  const { orders, total: totalOrders, isLoading: loadingOrders } = useAdminOrders({ limit: 500 });
  const { users: _users, total: totalUsers, isLoading: loadingUsers } = useAdminUsers({ limit: 200 });

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

    return { activeProducts, inactiveProducts, totalRevenue, ordersByStatus, productsByCategory, validOrders };
  }, [products, orders, totalProducts]);

  const recentOrders = orders.slice(0, 8);

  const loading = loadingProducts || loadingOrders || loadingUsers;

  return (
    <div style={S.wrap}>
      <h1 style={S.heading}>Dashboard</h1>

      {/* ══════ KPI Cards ══════ */}
      <div style={S.kpiGrid}>
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
          sub={loading ? "" : `${stats.ordersByStatus["pending"] || 0} pending · ${stats.ordersByStatus["completed"] || 0} completed`}
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
      <div style={S.bottomGrid}>
        {/* Recent Orders */}
        <div style={S.panel}>
          <div style={S.panelHead}>
            <TrendingUp size={16} style={{ color: "var(--accent-primary)" }} />
            <h2 style={S.panelTitle}>Recent Orders</h2>
          </div>
          {loading ? (
            <p style={S.empty}>Loading...</p>
          ) : recentOrders.length === 0 ? (
            <p style={S.empty}>No orders yet.</p>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Order</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Items</th>
                  <th style={S.th}>Total</th>
                  <th style={S.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} style={S.tr}>
                    <td style={S.td}><code style={S.oid}>#{o.id.slice(0, 8)}</code></td>
                    <td style={S.td}>
                      <span style={{ ...S.badge, ...STATUS_STYLE[o.status] }}>
                        {STATUS_ICON[o.status]} {o.status}
                      </span>
                    </td>
                    <td style={S.td}><span style={S.muted}>{o.items?.length ?? 0}</span></td>
                    <td style={S.td}><span style={S.bold}>${Number(o.total).toFixed(2)}</span></td>
                    <td style={S.td}><span style={S.muted}>{new Date(o.createdAt).toLocaleDateString()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Order Status Breakdown */}
        <div style={S.panel}>
          <div style={S.panelHead}>
            <ShoppingBag size={16} style={{ color: "var(--accent-primary)" }} />
            <h2 style={S.panelTitle}>Order Status</h2>
          </div>
          {loading ? (
            <p style={S.empty}>Loading...</p>
          ) : (
            <div style={S.breakdown}>
              {["pending", "confirmed", "shipping", "delivered", "completed", "cancelled"].map((status) => {
                const count = stats.ordersByStatus[status] || 0;
                const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
                return (
                  <div key={status} style={S.breakRow}>
                    <div style={S.breakLeft}>
                      {STATUS_ICON[status]}
                      <span style={{ textTransform: "capitalize", fontFamily: "var(--font-primary)", fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>{status}</span>
                    </div>
                    <div style={S.breakRight}>
                      <div style={S.barWrap}>
                        <div style={{ ...S.bar, width: `${pct}%`, background: STATUS_STYLE[status]?.color ?? "var(--text-muted)" }} />
                      </div>
                      <span style={S.breakCount}>{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── KPI Card ── */
function KpiCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string | number; sub: string; accent: string }) {
  return (
    <div style={K.wrap}>
      <div style={{ ...K.icon, color: accent, background: `${accent}15` }}>{icon}</div>
      <div style={K.info}>
        <p style={K.value}>{value}</p>
        <p style={K.label}>{label}</p>
        {sub && <p style={K.sub}>{sub}</p>}
      </div>
    </div>
  );
}

/* ══════════════════════ STYLES ══════════════════════ */
const S: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: "var(--space-8)" },
  heading: { fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", color: "var(--text-heading)", fontWeight: 400, margin: 0 },

  /* KPI Grid */
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "var(--space-5)" },

  /* Bottom */
  bottomGrid: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-6)" },

  /* Panel */
  panel: { background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "var(--space-5)" },
  panelHead: { display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-4)" },
  panelTitle: { fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-primary)", margin: 0 },
  empty: { fontSize: "var(--text-sm)", color: "var(--text-muted)", fontFamily: "var(--font-primary)", padding: "var(--space-6) 0", textAlign: "center" },

  /* Table */
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--border-subtle)", fontFamily: "var(--font-primary)", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  tr: { borderBottom: "1px solid var(--border-subtle)" },
  td: { padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-sm)", fontFamily: "var(--font-primary)", color: "var(--text-primary)", verticalAlign: "middle" as const },
  oid: { fontSize: "var(--text-xs)", fontFamily: "monospace", fontWeight: 600, background: "var(--bg-elevated)", padding: "1px 6px", borderRadius: "var(--radius-sm)" },
  badge: { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)", fontWeight: 600, fontFamily: "var(--font-primary)", textTransform: "capitalize" as const },
  bold: { fontWeight: 600 },
  muted: { fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-primary)" },

  /* Breakdown */
  breakdown: { display: "flex", flexDirection: "column", gap: "var(--space-3)" },
  breakRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" },
  breakLeft: { display: "flex", alignItems: "center", gap: 6, minWidth: 100 },
  breakRight: { display: "flex", alignItems: "center", gap: "var(--space-2)", flex: 1 },
  barWrap: { flex: 1, height: 6, background: "var(--bg-elevated)", borderRadius: "var(--radius-pill)", overflow: "hidden" },
  bar: { height: "100%", borderRadius: "var(--radius-pill)", transition: "width 0.5s var(--ease-default)", minWidth: 2 },
  breakCount: { fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-primary)", color: "var(--text-primary)", minWidth: 24, textAlign: "right" as const },
};

const K: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-5) var(--space-6)", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)" },
  icon: { width: 44, height: 44, borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  info: { display: "flex", flexDirection: "column", gap: 1, minWidth: 0 },
  value: { fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", color: "var(--text-heading)", lineHeight: 1.1, fontWeight: 400 },
  label: { fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-primary)", fontWeight: 500 },
  sub: { fontSize: "var(--text-xs)", color: "var(--text-disabled)", fontFamily: "var(--font-primary)", marginTop: 1 },
};
