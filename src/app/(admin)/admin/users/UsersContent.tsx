"use client";

import { useState } from "react";
import { Search, Pencil, X, Shield, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import { useAdminUsers, type AdminUser } from "@/src/hooks/use-admin-api";
import { useToast } from "@/src/app/_components/Toast";
import { RoleGuard } from "@/src/app/_components/RoleGuard";
import { PERMISSIONS, PERMISSION_GROUPS, PERMISSION_LABELS, permissionsToCodes, codesToPermissions, type Permission } from "@/src/lib/permissions";

const ROLE_OPTIONS = ["", "admin", "user"];
const STATUS_OPTIONS = ["", "active", "disabled"];

export default function UsersContent() {
  const { toast } = useToast();

  /* ── Filter state ── */
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  /* ── Call BE ── */
  const { users, total, isLoading, isValidating, updateUser } = useAdminUsers({
    role: filterRole || undefined,
    status: filterStatus || undefined,
    page,
    limit,
  });
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<{ role: string; status: string; permissions: Permission[] }>({ role: "user", status: "active", permissions: [] });
  const [saving, setSaving] = useState(false);

  /* Client-side text search */
  const filtered = users.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (u.name?.toLowerCase().includes(s)) || u.email.toLowerCase().includes(s);
  });

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    setForm({
      role: user.role,
      status: user.status,
      permissions: user.permissions ? codesToPermissions(user.permissions) : [],
    });
  };
  const closeEdit = () => setEditingUser(null);

  const togglePermission = (perm: Permission) => {
    setForm((prev) => ({ ...prev, permissions: prev.permissions.includes(perm) ? prev.permissions.filter((p) => p !== perm) : [...prev.permissions, perm] }));
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await updateUser(editingUser.id, { role: form.role, status: form.status, permissions: permissionsToCodes(form.permissions) });
      toast.success(`User ${editingUser.email} updated`);
      closeEdit();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to update user"); }
    finally { setSaving(false); }
  };

  const loading = isLoading || isValidating;

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}><div><h1 style={styles.heading}>Users</h1><p style={styles.subtitle}>{total} user{total !== 1 ? "s" : ""} total</p></div></div>

      {/* Search + Filters */}
      <div style={styles.toolbar}>
        <label style={{ ...styles.filterField, flex: 1 }}><span style={styles.filterLabel}>Search</span>
          <div style={styles.searchWrap}><Search size={14} style={styles.searchIcon} /><input type="text" placeholder="Name or email..." value={search} onChange={(e) => setSearch(e.target.value)} style={styles.searchInput} /></div>
        </label>
        <label style={styles.filterField}><span style={styles.filterLabel}>Role</span>
          <select value={filterRole} onChange={(e) => { setFilterRole(e.target.value); setPage(1); }} style={styles.filterSelect}>
            <option value="">All</option>
            {ROLE_OPTIONS.filter(Boolean).map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
        </label>
        <label style={styles.filterField}><span style={styles.filterLabel}>Status</span>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} style={styles.filterSelect}>
            <option value="">All</option>
            {STATUS_OPTIONS.filter(Boolean).map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </label>
      </div>

      <div style={{ ...styles.tableWrap, position: "relative" }}>
        {loading && <div style={styles.loadingOverlay}><span style={styles.loadingText}>Loading...</span></div>}
        <table style={{ ...styles.table, opacity: loading ? 0.4 : 1, transition: "opacity var(--duration-fast)" }}>
          <thead><tr><th style={styles.th}>User</th><th style={styles.th}>Email</th><th style={styles.th}>Role</th><th style={styles.th}>Provider</th><th style={styles.th}>Status</th><th style={styles.th}>Permissions</th><th style={styles.th}>Joined</th><th style={{ ...styles.th, textAlign: "right" }}>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={styles.emptyCell}>{search || filterRole || filterStatus ? "No users match." : "No users found."}</td></tr>
            )}
            {filtered.map((user) => (
              <tr key={user.id} style={styles.tr}>
                  <td style={styles.td}><div style={styles.userCell}>{user.image ? (<img src={user.image} alt="" style={styles.avatar} />) : (<div style={styles.avatarPlaceholder}>{(user.name ?? user.email).charAt(0).toUpperCase()}</div>)}<span style={styles.userName}>{user.name ?? "—"}</span></div></td>
                  <td style={styles.td}><span style={styles.email}>{user.email}</span></td>
                  <td style={styles.td}><span style={{ ...styles.badge, ...(user.role === "admin" ? { background: "rgba(201,169,110,0.15)", color: "var(--accent-primary)" } : { background: "rgba(143,163,180,0.12)", color: "var(--accent-blue)" }) }}>{user.role}</span></td>
                  <td style={styles.td}><span style={styles.providerText}>{user.provider ?? "—"}</span></td>
                  <td style={styles.td}><span style={{ ...styles.badge, ...(user.status === "active" ? { background: "rgba(163,177,138,0.15)", color: "var(--accent-sage)" } : { background: "rgba(212,165,165,0.15)", color: "var(--accent-rose)" }) }}>{user.status}</span></td>
                  <td style={styles.td}><span style={styles.permCountText}>{(user.permissions?.length ?? 0)} granted</span></td>
                  <td style={styles.td}><span style={styles.dateText}>{new Date(user.createdAt).toLocaleDateString()}</span></td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    <RoleGuard permission={PERMISSIONS.USER_ADMIN_UPDATE}>
                      <button style={styles.editBtn} onClick={() => openEdit(user)}><Pencil size={14} /><span>Edit</span></button>
                    </RoleGuard>
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button style={styles.pageBtn} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={14} /></button>
          <span style={styles.pageInfo}>Page {page} of {totalPages}</span>
          <button style={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight size={14} /></button>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div style={styles.overlay} onClick={closeEdit}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}><div><h2 style={styles.modalTitle}>Edit User</h2><p style={styles.modalSub}>{editingUser.email}</p></div><button style={styles.closeBtn} onClick={closeEdit}><X size={18} /></button></div>
            <div style={styles.modalBody}>
              <div style={styles.formRow}>
                <label style={styles.field}><span style={styles.label}><Shield size={12} /> Role</span><select style={styles.select} value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}><option value="user">User (Customer)</option><option value="admin">Admin (Administrator)</option></select></label>
                <label style={styles.field}><span style={styles.label}>{form.status === "active" ? <Eye size={12} /> : <EyeOff size={12} />} Status</span><select style={styles.select} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
              </div>
              <div style={styles.permSection}><span style={styles.permSectionTitle}>Custom Permissions</span><p style={styles.permHint}>Leave all unchecked to use role defaults.</p>
                {PERMISSION_GROUPS.map((group) => (<div key={group.label} style={styles.permGroup}><span style={styles.permGroupLabel}>{group.label}</span><div style={styles.permCheckList}>{group.permissions.map((perm) => { const checked = form.permissions.includes(perm); return (<label key={perm} style={{ ...styles.permCheck, ...(checked ? styles.permCheckActive : {}) }}><input type="checkbox" checked={checked} onChange={() => togglePermission(perm)} style={styles.checkbox} /><span>{PERMISSION_LABELS[perm] ?? perm}</span><code style={styles.permCheckCode}>{perm}</code></label>); })}</div></div>))}
              </div>
              <div style={styles.formActions}><button type="button" style={styles.cancelBtn} onClick={closeEdit}>Cancel</button><button type="button" style={styles.submitBtn} disabled={saving} onClick={handleSave}>{saving ? "Saving..." : "Save Changes"}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  filterSelect: { padding: "8px 12px", border: "none", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", fontFamily: "var(--font-primary)", background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", minWidth: 130, height: 36 },
  tableWrap: { background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--border-subtle)", fontFamily: "var(--font-primary)", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  tr: { borderBottom: "1px solid var(--border-subtle)" },
  td: { padding: "var(--space-3) var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-primary)", fontFamily: "var(--font-primary)", verticalAlign: "middle" as const },
  emptyCell: { padding: "var(--space-10) var(--space-4)", textAlign: "center" as const, color: "var(--text-muted)", fontSize: "var(--text-sm)", fontFamily: "var(--font-primary)" },
  userCell: { display: "flex", alignItems: "center", gap: "var(--space-3)" },
  avatar: { width: 32, height: 32, borderRadius: "var(--radius-pill)", objectFit: "cover", flexShrink: 0, opacity: 1 },
  avatarPlaceholder: { width: 32, height: 32, borderRadius: "var(--radius-pill)", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", flexShrink: 0 },
  userName: { fontWeight: 600 },
  email: { fontSize: "var(--text-xs)", color: "var(--text-muted)" },
  badge: { display: "inline-block", padding: "2px 8px", borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)", fontWeight: 600, fontFamily: "var(--font-primary)", textTransform: "capitalize" as const },
  providerText: { fontSize: "var(--text-xs)", color: "var(--text-muted)" },
  permCountText: { fontSize: "var(--text-xs)", color: "var(--text-secondary)" },
  dateText: { fontSize: "var(--text-xs)", color: "var(--text-muted)" },
  editBtn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", fontSize: "var(--text-xs)", fontWeight: 500, fontFamily: "var(--font-primary)", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", background: "var(--bg-elevated)", color: "var(--text-secondary)" },
  pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: "var(--space-4)" },
  pageBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, border: "none", borderRadius: "var(--radius-sm)", background: "var(--bg-secondary)", cursor: "pointer", color: "var(--text-secondary)" },
  pageInfo: { fontSize: "var(--text-sm)", color: "var(--text-muted)", fontFamily: "var(--font-primary)" },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(10,10,8,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "var(--space-6)" },
  modal: { background: "var(--bg-primary)", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: 640, maxHeight: "85vh", overflow: "auto", boxShadow: "var(--shadow-xl)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-5) var(--space-6)", borderBottom: "1px solid var(--border-subtle)", position: "sticky" as const, top: 0, background: "var(--bg-primary)", zIndex: 1 },
  modalTitle: { fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", color: "var(--text-heading)", fontWeight: 400, margin: 0 },
  modalSub: { fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-primary)", margin: "2px 0 0" },
  closeBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, border: "none", borderRadius: "var(--radius-sm)", background: "transparent", cursor: "pointer", color: "var(--text-muted)" },
  modalBody: { padding: "var(--space-6)" },
  formRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { display: "flex", alignItems: "center", gap: 4, fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", fontFamily: "var(--font-primary)" },
  select: { padding: "8px 12px", border: "none", borderBottom: "1px solid var(--border-light)", borderRadius: 0, fontSize: "var(--text-sm)", fontFamily: "var(--font-primary)", background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none" },
  permSection: { marginTop: "var(--space-6)" },
  permSectionTitle: { display: "block", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-primary)", marginBottom: 2 },
  permHint: { fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-primary)", marginBottom: "var(--space-4)" },
  permGroup: { marginBottom: "var(--space-3)" },
  permGroupLabel: { display: "block", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", fontFamily: "var(--font-primary)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4 },
  permCheckList: { display: "flex", flexDirection: "column", gap: 2 },
  permCheck: { display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "6px 10px", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-primary)", color: "var(--text-secondary)", transition: "background var(--duration-fast)" },
  permCheckActive: { background: "rgba(163,177,138,0.08)", color: "var(--text-primary)" },
  checkbox: { width: 14, height: 14, accentColor: "var(--accent-sage)", cursor: "pointer", flexShrink: 0 },
  permCheckCode: { marginLeft: "auto", fontSize: "10px", fontFamily: "monospace", color: "var(--text-disabled)" },
  formActions: { display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-6)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border-subtle)" },
  cancelBtn: { padding: "8px 16px", background: "var(--bg-elevated)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--text-sm)", fontFamily: "var(--font-primary)", color: "var(--text-secondary)", cursor: "pointer" },
  submitBtn: { padding: "8px 20px", background: "var(--accent-primary)", color: "var(--text-on-gold)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-primary)", cursor: "pointer" },
  loadingOverlay: { position: "absolute" as const, inset: 0, background: "rgba(251,248,241,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, borderRadius: "var(--radius-lg)" },
  loadingText: { fontSize: "var(--text-sm)", color: "var(--text-muted)", fontFamily: "var(--font-primary)" },
};
