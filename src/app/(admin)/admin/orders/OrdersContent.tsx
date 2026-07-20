"use client";

import { useState } from "react";
import { Search, X, Package, MapPin, CreditCard, ChevronLeft, ChevronRight } from "lucide-react";
import { useAdminOrders, type AdminOrder } from "@/src/hooks/use-admin-api";
import { useToast } from "@/src/app/_components/Toast";
import { RoleGuard } from "@/src/app/_components/RoleGuard";
import { PERMISSIONS } from "@/src/lib/permissions";

const STATUS_OPTIONS = ["", "pending", "confirmed", "shipping", "delivered", "completed", "cancelled"];
const ORDER_STATUSES = STATUS_OPTIONS.filter(Boolean);

export default function OrdersContent() {
  const { toast } = useToast();

  /* ── Filter state ── */
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  /* ── Call BE ── */
  const { orders, total, isLoading, isValidating, updateOrderStatus, getOrderDetail } = useAdminOrders({
    status: filterStatus || undefined,
    page,
    limit,
  });
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const [detailOrder, setDetailOrder] = useState<AdminOrder | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  /* Client-side text search (BE doesn't support text search on orders) */
  const filtered = orders.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return o.id.toLowerCase().includes(s) || (o.shippingAddress && JSON.stringify(o.shippingAddress).toLowerCase().includes(s));
  });

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Order #${orderId.slice(0, 8)} → ${newStatus}`);
      if (detailOrder?.id === orderId) setDetailOrder((p) => (p ? { ...p, status: newStatus } : null));
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setUpdatingId(null); }
  };

  const openDetail = async (order: AdminOrder) => {
    setDetailOrder(order); setLoadingDetail(true);
    try { const fresh = await getOrderDetail(order.id); setDetailOrder(fresh); } catch {}
    finally { setLoadingDetail(false); }
  };

  const loading = isLoading || isValidating;

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}><div><h1 style={styles.heading}>Orders</h1><p style={styles.subtitle}>{total} order{total !== 1 ? "s" : ""} total</p></div></div>

      {/* Search + Filter */}
      <div style={styles.toolbar}>
        <label style={{ ...styles.filterField, flex: 1 }}><span style={styles.filterLabel}>Search</span>
          <div style={styles.searchWrap}><Search size={14} style={styles.searchIcon} /><input type="text" placeholder="Order ID or address..." value={search} onChange={(e) => setSearch(e.target.value)} style={styles.searchInput} /></div>
        </label>
        <label style={styles.filterField}><span style={styles.filterLabel}>Status</span>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} style={styles.filterSelect}>
            <option value="">All</option>
            {ORDER_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </label>
      </div>

      <div style={{ ...styles.tableWrap, position: "relative" }}>
        {loading && <div style={styles.loadingOverlay}><span style={styles.loadingText}>Loading...</span></div>}
        <table style={{ ...styles.table, opacity: loading ? 0.4 : 1, transition: "opacity var(--duration-fast)" }}>
          <thead><tr><th style={styles.th}>Order ID</th><th style={styles.th}>Customer</th><th style={styles.th}>Items</th><th style={styles.th}>Total</th><th style={styles.th}>Status</th><th style={styles.th}>Date</th><th style={{ ...styles.th, textAlign: "right" }}>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={styles.emptyCell}>{search || filterStatus ? "No orders match." : "No orders yet."}</td></tr>
            )}
            {filtered.map((o) => (
              <tr key={o.id} style={styles.tr}>
                  <td style={styles.td}><code style={styles.orderId}>#{o.id.slice(0, 8)}</code></td>
                  <td style={styles.td}><span style={styles.customerText}>{o.userId.slice(0, 8)}</span></td>
                  <td style={styles.td}><span style={styles.itemsCount}>{o.items?.length ?? 0} item{(o.items?.length ?? 0) !== 1 ? "s" : ""}</span></td>
                  <td style={styles.td}><span style={styles.totalText}>${Number(o.total).toFixed(2)}</span></td>
                  <td style={styles.td}>
                    <RoleGuard permission={PERMISSIONS.ORDER_ADMIN_UPDATE_STATUS} fallback={<span style={{ ...styles.statusBadge, ...statusStyle(o.status) }}>{o.status}</span>}>
                      <select style={{ ...styles.statusSelect, ...statusSelectStyle(o.status) }} value={o.status} disabled={updatingId === o.id} onChange={(e) => handleStatusChange(o.id, e.target.value)}>
                        {ORDER_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                      </select>
                    </RoleGuard>
                  </td>
                  <td style={styles.td}><span style={styles.dateText}>{new Date(o.createdAt).toLocaleDateString()}</span></td>
                  <td style={{ ...styles.td, textAlign: "right" }}><button style={styles.viewBtn} onClick={() => openDetail(o)}>View</button></td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button style={styles.pageBtn} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={14} /></button>
          <span style={styles.pageInfo}>Page {page} of {totalPages}</span>
          <button style={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight size={14} /></button>
        </div>
      )}

      {/* Detail Panel */}
      {detailOrder && (
        <div style={styles.overlay} onClick={() => setDetailOrder(null)}>
          <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
            <div style={styles.panelHeader}><h2 style={styles.panelTitle}>Order #{detailOrder.id.slice(0, 8)}</h2><button style={styles.closeBtn} onClick={() => setDetailOrder(null)}><X size={18} /></button></div>
            <div style={styles.panelBody}>
              {loadingDetail && <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", padding: "var(--space-4) 0" }}>Loading full detail...</p>}
              <div style={styles.detailRow}><span style={styles.detailLabel}>Status</span><span style={{ ...styles.statusBadge, ...statusStyle(detailOrder.status) }}>{detailOrder.status}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLabel}>Date</span><span style={styles.detailValue}>{new Date(detailOrder.createdAt).toLocaleString()}</span></div>
              <h3 style={styles.sectionTitle}><Package size={14} />Items ({detailOrder.items?.length ?? 0})</h3>
              <div style={styles.itemList}>{detailOrder.items?.map((item, i) => (<div key={i} style={styles.itemRow}>{item.productImage && (<img src={item.productImage} alt="" style={styles.itemThumb} />)}<div style={styles.itemInfo}><p style={styles.itemName}>{item.productName}</p><p style={styles.itemMeta}>{item.size && `Size: ${item.size}`}{item.size && item.color && " / "}{item.color && `Color: ${item.color}`}{" — "}Qty: {item.quantity}</p></div><span style={styles.itemPrice}>${(Number(item.price) * item.quantity).toFixed(2)}</span></div>))}</div>
              <h3 style={styles.sectionTitle}><MapPin size={14} />Shipping</h3>
              <div style={styles.detailRow}><span style={styles.detailLabel}>Method</span><span style={styles.detailValue}>{detailOrder.shippingMethod || "—"}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLabel}>Fee</span><span style={styles.detailValue}>${Number(detailOrder.shippingFee).toFixed(2)}</span></div>
              {detailOrder.shippingAddress && (<div style={styles.addressBox}>{Object.entries(detailOrder.shippingAddress).map(([k, v]) => (<span key={k} style={styles.addressLine}><strong>{k}:</strong> {String(v ?? "—")}</span>))}</div>)}
              <h3 style={styles.sectionTitle}><CreditCard size={14} />Payment</h3>
              <div style={styles.detailRow}><span style={styles.detailLabel}>Subtotal</span><span style={styles.detailValue}>${Number(detailOrder.subtotal).toFixed(2)}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLabel}>Shipping</span><span style={styles.detailValue}>${Number(detailOrder.shippingFee).toFixed(2)}</span></div>
              <div style={{ ...styles.detailRow, borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-3)" }}><span style={{ ...styles.detailLabel, fontWeight: 600, color: "var(--text-primary)" }}>Total</span><span style={{ ...styles.detailValue, fontWeight: 600, fontSize: "var(--text-md)", color: "var(--text-primary)" }}>${Number(detailOrder.total).toFixed(2)}</span></div>
              {detailOrder.note && (<div style={{ marginTop: "var(--space-4)" }}><span style={styles.detailLabel}>Note</span><p style={styles.noteText}>{detailOrder.note}</p></div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function statusStyle(s: string): React.CSSProperties {
  const m: Record<string, { background: string; color: string }> = { pending: { background: "rgba(240,228,166,0.2)", color: "#B8A040" }, confirmed: { background: "rgba(143,163,180,0.15)", color: "var(--accent-blue)" }, shipping: { background: "rgba(184,165,200,0.15)", color: "var(--accent-lavender)" }, delivered: { background: "rgba(163,177,138,0.15)", color: "var(--accent-sage)" }, completed: { background: "rgba(201,169,110,0.15)", color: "var(--accent-primary)" }, cancelled: { background: "rgba(212,165,165,0.15)", color: "var(--accent-rose)" } };
  return m[s] ?? { background: "rgba(107,101,96,0.05)", color: "var(--text-muted)" };
}
function statusSelectStyle(s: string): React.CSSProperties { return { background: statusStyle(s).background, color: statusStyle(s).color, borderColor: "transparent" }; }

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: "flex", flexDirection: "column", gap: "var(--space-6)" },
  empty: { fontSize: "var(--text-sm)", color: "var(--text-muted)", fontFamily: "var(--font-primary)", padding: "var(--space-8) 0" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  heading: { fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", color: "var(--text-heading)", fontWeight: 400, margin: 0 },
  subtitle: { fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-primary)", marginTop: 4 },
  toolbar: { display: "flex", gap: "var(--space-3)", alignItems: "flex-end" },
  searchWrap: { display: "flex", alignItems: "center", gap: 8, background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: "0 var(--space-4)", height: 36 },
  searchIcon: { color: "var(--text-muted)", flexShrink: 0 },
  searchInput: { flex: 1, border: "none", background: "none", padding: "0", fontSize: "var(--text-sm)", fontFamily: "var(--font-primary)", color: "var(--text-primary)", outline: "none" },
  filterField: { display: "flex", flexDirection: "column", gap: 3 },
  filterLabel: { fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", fontFamily: "var(--font-primary)" },
  filterSelect: { padding: "8px 10px", border: "none", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", fontFamily: "var(--font-primary)", background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", minWidth: 130, height: 36 },
  tableWrap: { background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--border-subtle)", fontFamily: "var(--font-primary)", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  tr: { borderBottom: "1px solid var(--border-subtle)" },
  td: { padding: "var(--space-3) var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-primary)", fontFamily: "var(--font-primary)", verticalAlign: "middle" as const },
  emptyCell: { padding: "var(--space-10) var(--space-4)", textAlign: "center" as const, color: "var(--text-muted)", fontSize: "var(--text-sm)", fontFamily: "var(--font-primary)" },
  orderId: { fontSize: "var(--text-xs)", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: "var(--radius-sm)", fontFamily: "monospace", fontWeight: 600 },
  customerText: { fontSize: "var(--text-xs)", color: "var(--text-muted)" },
  itemsCount: { fontSize: "var(--text-xs)", color: "var(--text-secondary)" },
  totalText: { fontWeight: 600 },
  dateText: { fontSize: "var(--text-xs)", color: "var(--text-muted)" },
  statusBadge: { display: "inline-block", padding: "2px 8px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)", fontWeight: 600, fontFamily: "var(--font-primary)", textTransform: "capitalize" as const },
  statusSelect: { padding: "4px 8px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)", fontWeight: 600, fontFamily: "var(--font-primary)", border: "none", cursor: "pointer", outline: "none", textTransform: "capitalize" as const },
  viewBtn: { padding: "4px 12px", fontSize: "var(--text-xs)", fontWeight: 500, fontFamily: "var(--font-primary)", background: "var(--bg-elevated)", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--text-secondary)" },
  pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: "var(--space-4)" },
  pageBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, border: "none", borderRadius: "var(--radius-sm)", background: "var(--bg-secondary)", cursor: "pointer", color: "var(--text-secondary)" },
  pageInfo: { fontSize: "var(--text-sm)", color: "var(--text-muted)", fontFamily: "var(--font-primary)" },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(10,10,8,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "var(--space-6)" },
  panel: { background: "var(--bg-primary)", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: 600, maxHeight: "85vh", overflow: "auto", boxShadow: "var(--shadow-xl)" },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-5) var(--space-6)", borderBottom: "1px solid var(--border-subtle)", position: "sticky" as const, top: 0, background: "var(--bg-primary)", zIndex: 1 },
  panelTitle: { fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", color: "var(--text-heading)", fontWeight: 400, margin: 0 },
  closeBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, border: "none", borderRadius: "var(--radius-sm)", background: "transparent", cursor: "pointer", color: "var(--text-muted)" },
  panelBody: { padding: "var(--space-6)" },
  detailRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) 0" },
  detailLabel: { fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-primary)", fontWeight: 500 },
  detailValue: { fontSize: "var(--text-sm)", color: "var(--text-primary)", fontFamily: "var(--font-primary)" },
  sectionTitle: { display: "flex", alignItems: "center", gap: 6, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-primary)", marginTop: "var(--space-6)", marginBottom: "var(--space-3)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border-subtle)" },
  itemList: { display: "flex", flexDirection: "column", gap: "var(--space-3)" },
  itemRow: { display: "flex", alignItems: "center", gap: "var(--space-3)" },
  itemThumb: { width: 40, height: 48, objectFit: "cover" as const, borderRadius: "var(--radius-sm)", flexShrink: 0, opacity: 1 },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" },
  itemMeta: { fontSize: "var(--text-xs)", color: "var(--text-muted)" },
  itemPrice: { fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)", flexShrink: 0 },
  addressBox: { background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: 2, marginTop: "var(--space-2)" },
  addressLine: { fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontFamily: "var(--font-primary)" },
  noteText: { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontFamily: "var(--font-primary)", fontStyle: "italic", marginTop: 4 },
  loadingOverlay: { position: "absolute" as const, inset: 0, background: "rgba(251,248,241,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, borderRadius: "var(--radius-lg)" },
  loadingText: { fontSize: "var(--text-sm)", color: "var(--text-muted)", fontFamily: "var(--font-primary)" },
};
