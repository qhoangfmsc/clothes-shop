"use client";

import { useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, X, FolderTree } from "lucide-react";
import { useAdminCategories } from "@/src/hooks/use-admin-api";
import { useToast } from "@/src/app/_components/Toast";
import { RoleGuard } from "@/src/app/_components/RoleGuard";
import { PERMISSIONS } from "@/src/lib/permissions";
import type { Category, SubCategory } from "@/src/types/category";

type CatForm = { slug: string; title: string; description: string; subcategories: SubCategory[] };
const EMPTY: CatForm = { slug: "", title: "", description: "", subcategories: [] };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CategoriesContent() {
  const { categories, total, isLoading, isValidating, createCategory, updateCategory, deleteCategory } = useAdminCategories();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CatForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const addSub = () => setForm((p) => ({ ...p, subcategories: [...p.subcategories, { id: 0, slug: "", label: "", description: "", count: 0 }] }));
  const updSub = (i: number, f: string, v: string) => setForm((p) => { const s = [...p.subcategories]; (s[i] as unknown as Record<string, unknown>)[f] = v; return { ...p, subcategories: s }; });
  const rmSub = (i: number) => setForm((p) => ({ ...p, subcategories: p.subcategories.filter((_, j) => j !== i) }));

  const openCreate = () => { setEditingId(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (c: Category) => { setEditingId(c.id); setForm({ slug: c.slug, title: c.title, description: c.description, subcategories: c.subcategories?.map((s) => ({ ...s })) ?? [] }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(EMPTY); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const clean = {
        slug: form.slug, title: form.title, description: form.description,
        subcategories: form.subcategories.map((s) => { if (s.id === 0) { const { id: _id, count: _c, ...r } = s; return r; } const { count: _c, ...r } = s; return r; }),
      };
      if (editingId) { await updateCategory(editingId, clean as Partial<Category>); toast.success("Category updated"); }
      else { await createCategory(clean as Partial<Category>); toast.success("Category created"); }
      closeModal();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };
  const handleDelete = async (id: string, t: string) => { if (!confirm(`Delete "${t}"?`)) return; try { await deleteCategory(id); toast.success("Deleted"); } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); } };

  const loading = isLoading || isValidating;

  return (
    <div style={S.wrapper}>
      <div style={S.header}><div><h1 style={S.heading}>Categories</h1><p style={S.sub}>{total} categor{total !== 1 ? "ies" : "y"}</p></div>
        <RoleGuard permission={PERMISSIONS.CATEGORY_CREATE}><button style={S.addBtn} onClick={openCreate}><Plus size={16} /> Add Category</button></RoleGuard>
      </div>

      <div style={{ ...S.tableWrap, position: "relative" }}>
        {loading && <div style={S.loadingOverlay}><span style={S.loadingText}>Loading...</span></div>}
        <table style={{ ...S.table, opacity: loading ? 0.4 : 1, transition: "opacity var(--duration-fast)" }}><thead><tr><th style={S.th}>Title</th><th style={S.th}>Slug</th><th style={S.th}>Subcategories</th><th style={S.th}>Description</th><th style={{ ...S.th, textAlign: "right" }}>Actions</th></tr></thead>
        <tbody>
          {categories.length === 0 && (
            <tr><td colSpan={5} style={S.emptyCell}>No categories yet.</td></tr>
          )}
          {categories.map((c) => (
            <tr key={c.id} style={S.tr}>
              <td style={S.td}><span style={S.title}>{c.title}</span></td>
              <td style={S.td}><code style={S.code}>{c.slug}</code></td>
              <td style={S.td}>
                <div style={S.subList}>
                  {c.subcategories && c.subcategories.length > 0
                    ? c.subcategories.map((s) => (<span key={s.id} style={S.subTag}>{s.label}</span>))
                    : <span style={S.muted}>—</span>}
                </div>
              </td>
              <td style={S.td}><span style={S.desc}>{c.description ? (c.description.length > 50 ? c.description.slice(0, 50) + "..." : c.description) : "—"}</span></td>
              <td style={{ ...S.td, textAlign: "right" }}><div style={S.actions}>
                <RoleGuard permission={PERMISSIONS.CATEGORY_UPDATE}><button style={S.actBtn} onClick={() => openEdit(c)} title="Edit"><Pencil size={14} /></button></RoleGuard>
                <RoleGuard permission={PERMISSIONS.CATEGORY_DELETE}><button style={{ ...S.actBtn, color: "var(--accent-rose)" }} onClick={() => handleDelete(c.id, c.title)} title="Delete"><Trash2 size={14} /></button></RoleGuard>
              </div></td>
            </tr>
          ))}
        </tbody>
      </table></div>

      {/* ═══════════════ MODAL ═══════════════ */}
      {showModal && (<div style={S.overlay} onClick={closeModal}><div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modHead}><h2 style={S.modTitle}>{editingId ? "Edit Category" : "New Category"}</h2><button style={S.closeBtn} onClick={closeModal}><X size={18} /></button></div>
        <form onSubmit={handleSubmit} style={S.form}>
          <Section title="Basic Info">
            <F label="Title" required><input style={S.input} value={form.title} onChange={(e) => { const v = e.target.value; setForm((p) => ({ ...p, title: v, slug: p.slug === slugify(p.title) || !p.slug ? slugify(v) : p.slug })); }} placeholder="e.g. Tops" required /></F>
            <F label="Slug (URL path)" required><input style={S.input} value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="auto-generated from title" required /></F>
            <F label="Description" span={2}><textarea style={S.textarea} rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Category description..." /></F>
          </Section>

          <Section title="Subcategories">
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)", fontFamily: "var(--font-primary)", display: "flex", alignItems: "center", gap: 6 }}><FolderTree size={14} /> Subcategories</span>
                <button type="button" style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "transparent", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", fontFamily: "var(--font-primary)", color: "var(--text-secondary)", cursor: "pointer" }} onClick={addSub}><Plus size={12} /> Add</button>
              </div>
              {form.subcategories.length === 0 && <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", padding: "var(--space-3) 0" }}>No subcategories yet. Click &quot;Add&quot; to create one.</p>}
              {form.subcategories.map((sub, i) => (<div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                <input style={{ ...S.input, fontSize: "var(--text-xs)", padding: "6px 10px" }} placeholder="Label" value={sub.label} onChange={(e) => updSub(i, "label", e.target.value)} />
                <input style={{ ...S.input, fontSize: "var(--text-xs)", padding: "6px 10px" }} placeholder="Slug" value={sub.slug} onChange={(e) => updSub(i, "slug", e.target.value)} />
                <input style={{ ...S.input, fontSize: "var(--text-xs)", padding: "6px 10px" }} placeholder="Description" value={sub.description} onChange={(e) => updSub(i, "description", e.target.value)} />
                <button type="button" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", color: "var(--accent-rose)", flexShrink: 0 }} onClick={() => rmSub(i)}><X size={12} /></button>
              </div>))}
            </div>
          </Section>

          <div style={S.formAct}><button type="button" style={S.cancelBtn} onClick={closeModal}>Cancel</button><button type="submit" style={S.submitBtn} disabled={saving}>{saving ? "Saving..." : editingId ? "Update Category" : "Create Category"}</button></div>
        </form>
      </div></div>)}
    </div>
  );
}

/* ── Fieldset helpers ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset style={FS.set}><legend style={FS.legend}>{title}</legend><div style={FS.grid}>{children}</div></fieldset>;
}
function F({ label, hint, required, span, children }: { label: string; hint?: string; required?: boolean; span?: number; children: React.ReactNode }) {
  return <div style={{ ...FS.f, ...(span === 2 ? { gridColumn: "1 / -1" } : {}) }}><span style={FS.lbl}>{label}{required && <span style={{ color: "var(--accent-rose)" }}> *</span>}</span>{children}{hint && <span style={{ fontSize: "10px", color: "var(--text-disabled)", fontFamily: "var(--font-primary)", fontStyle: "italic" }}>{hint}</span>}</div>;
}

const S: Record<string, React.CSSProperties> = {
  wrapper: { display: "flex", flexDirection: "column", gap: "var(--space-6)" },
  empty: { fontSize: "var(--text-sm)", color: "var(--text-muted)", fontFamily: "var(--font-primary)", padding: "var(--space-8) 0" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  heading: { fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", color: "var(--text-heading)", fontWeight: 400, margin: 0 },
  sub: { fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-primary)", marginTop: 4 },
  addBtn: { display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "var(--accent-primary)", color: "var(--text-on-gold)", border: "none", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-primary)", cursor: "pointer" },
  tableWrap: { background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--border-subtle)", fontFamily: "var(--font-primary)", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  tr: { borderBottom: "1px solid var(--border-subtle)" },
  td: { padding: "var(--space-3) var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-primary)", fontFamily: "var(--font-primary)", verticalAlign: "middle" as const },
  emptyCell: { padding: "var(--space-10) var(--space-4)", textAlign: "center" as const, color: "var(--text-muted)", fontSize: "var(--text-sm)", fontFamily: "var(--font-primary)" },
  title: { fontWeight: 600 },
  code: { fontSize: "var(--text-xs)", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: "var(--radius-sm)", fontFamily: "monospace" },
  subList: { display: "flex", gap: 4, flexWrap: "wrap" as const },
  subTag: { fontSize: "var(--text-xs)", background: "rgba(184,165,200,0.12)", color: "var(--accent-lavender)", padding: "2px 6px", borderRadius: "var(--radius-sm)", fontWeight: 500 },
  desc: { fontSize: "var(--text-xs)", color: "var(--text-muted)" },
  muted: { color: "var(--text-disabled)", fontSize: "var(--text-xs)" },
  actions: { display: "flex", gap: 4, justifyContent: "flex-end" },
  actBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, border: "none", borderRadius: "var(--radius-sm)", background: "transparent", cursor: "pointer", color: "var(--text-secondary)" },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(10,10,8,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "var(--space-6)" },
  modal: { background: "var(--bg-primary)", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: 640, maxHeight: "85vh", overflow: "auto", boxShadow: "var(--shadow-xl)" },
  modHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-5) var(--space-6)", borderBottom: "1px solid var(--border-subtle)", position: "sticky" as const, top: 0, background: "var(--bg-primary)", zIndex: 1 },
  modTitle: { fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", color: "var(--text-heading)", fontWeight: 400, margin: 0 },
  closeBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, border: "none", borderRadius: "var(--radius-sm)", background: "transparent", cursor: "pointer", color: "var(--text-muted)" },
  form: { padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" },
  input: { padding: "8px 12px", border: "none", borderBottom: "1px solid var(--border-light)", borderRadius: 0, fontSize: "var(--text-sm)", fontFamily: "var(--font-primary)", background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", width: "100%" },
  textarea: { padding: "8px 12px", border: "none", borderBottom: "1px solid var(--border-light)", borderRadius: 0, fontSize: "var(--text-sm)", fontFamily: "var(--font-primary)", background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", resize: "vertical" as const, width: "100%" },
  formAct: { display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border-subtle)" },
  cancelBtn: { padding: "8px 16px", background: "var(--bg-elevated)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--text-sm)", fontFamily: "var(--font-primary)", color: "var(--text-secondary)", cursor: "pointer" },
  submitBtn: { padding: "8px 20px", background: "var(--accent-primary)", color: "var(--text-on-gold)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-primary)", cursor: "pointer" },
  loadingOverlay: { position: "absolute" as const, inset: 0, background: "rgba(251,248,241,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, borderRadius: "var(--radius-lg)" },
  loadingText: { fontSize: "var(--text-sm)", color: "var(--text-muted)", fontFamily: "var(--font-primary)" },
};
const FS: Record<string, React.CSSProperties> = {
  set: { border: "none", borderBottom: "1px solid var(--border-subtle)", padding: "0 0 var(--space-5) 0", margin: 0 },
  legend: { fontFamily: "var(--font-primary)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" as const, letterSpacing: "0.06em", padding: 0, marginBottom: "var(--space-4)" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" },
  f: { display: "flex", flexDirection: "column" as const, gap: 3 },
  lbl: { fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", fontFamily: "var(--font-primary)" },
};
