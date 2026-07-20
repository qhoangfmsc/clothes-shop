"use client";

import { useState, useMemo, type FormEvent } from "react";
import { Plus, Pencil, Trash2, X, ImageIcon, Search } from "lucide-react";
import { useAdminCollections, useAdminProducts } from "@/src/hooks/use-admin-api";
import { useToast } from "@/src/app/_components/Toast";
import { RoleGuard } from "@/src/app/_components/RoleGuard";
import { PERMISSIONS } from "@/src/lib/permissions";
import type { Collection } from "@/src/types/collection";

type ColForm = {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  image: string;
  productIds: string[];
  season: string;
};
const EMPTY: ColForm = {
  slug: "",
  name: "",
  subtitle: "",
  description: "",
  image: "",
  productIds: [],
  season: "",
};

const SEASONS = [
  "Spring/Summer 2026",
  "Fall/Winter 2026",
  "Spring/Summer 2027",
  "Fall/Winter 2027",
  "Spring/Summer 2025",
  "Fall/Winter 2025",
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CollectionsContent() {
  const {
    collections,
    total,
    isLoading,
    isValidating,
    createCollection,
    updateCollection,
    deleteCollection,
  } = useAdminCollections();
  /* Fetch products for the product multi-select */
  const { products: allProducts } = useAdminProducts({ limit: 500 });
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ColForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const filteredProducts = useMemo(() => {
    if (!productSearch) return allProducts;
    const s = productSearch.toLowerCase();
    return allProducts.filter(
      (p) => p.name.toLowerCase().includes(s) || p.slug.toLowerCase().includes(s)
    );
  }, [allProducts, productSearch]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY);
    setProductSearch("");
    setShowModal(true);
  };
  const openEdit = (c: Collection) => {
    setEditingId(c.id);
    setForm({
      slug: c.slug,
      name: c.name,
      subtitle: c.subtitle,
      description: c.description,
      image: c.image,
      productIds: [...c.productIds],
      season: c.season,
    });
    setProductSearch("");
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateCollection(editingId, form);
        toast.success("Collection updated");
      } else {
        await createCollection(form);
        toast.success("Collection created");
      }
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await deleteCollection(id);
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const loading = isLoading || isValidating;

  return (
    <div style={S.wrapper}>
      <div style={S.header}>
        <div>
          <h1 style={S.heading}>Collections</h1>
          <p style={S.sub}>
            {total} collection{total !== 1 ? "s" : ""}
          </p>
        </div>
        <RoleGuard permission={PERMISSIONS.COLLECTION_CREATE}>
          <button style={S.addBtn} onClick={openCreate}>
            <Plus size={16} /> Add Collection
          </button>
        </RoleGuard>
      </div>

      <div style={{ ...S.tableWrap, position: "relative" }}>
        {loading && (
          <div style={S.loadingOverlay}>
            <span style={S.loadingText}>Loading...</span>
          </div>
        )}
        <table
          style={{
            ...S.table,
            opacity: loading ? 0.4 : 1,
            transition: "opacity var(--duration-fast)",
          }}
        >
          <thead>
            <tr>
              <th style={S.th}>Collection</th>
              <th style={S.th}>Slug</th>
              <th style={S.th}>Season</th>
              <th style={S.th}>Products</th>
              <th style={{ ...S.th, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {collections.length === 0 && (
              <tr>
                <td colSpan={5} style={S.emptyCell}>
                  No collections yet.
                </td>
              </tr>
            )}
            {collections.map((c) => (
              <tr key={c.id} style={S.tr}>
                <td style={S.td}>
                  <div style={S.cell}>
                    {c.image ? (
                      <img src={c.image} alt="" style={S.thumb} />
                    ) : (
                      <div style={S.noImg}>
                        <ImageIcon size={14} />
                      </div>
                    )}
                    <div>
                      <p style={S.name}>{c.name}</p>
                      {c.subtitle && <p style={S.subt}>{c.subtitle}</p>}
                    </div>
                  </div>
                </td>
                <td style={S.td}>
                  <code style={S.code}>{c.slug}</code>
                </td>
                <td style={S.td}>
                  {c.season ? (
                    <span style={S.season}>{c.season}</span>
                  ) : (
                    <span style={S.muted}>—</span>
                  )}
                </td>
                <td style={S.td}>
                  <span style={S.count}>{c.productIds?.length ?? 0} products</span>
                </td>
                <td style={{ ...S.td, textAlign: "right" }}>
                  <div style={S.actions}>
                    <RoleGuard permission={PERMISSIONS.COLLECTION_UPDATE}>
                      <button style={S.actBtn} onClick={() => openEdit(c)} title="Edit">
                        <Pencil size={14} />
                      </button>
                    </RoleGuard>
                    <RoleGuard permission={PERMISSIONS.COLLECTION_DELETE}>
                      <button
                        style={{ ...S.actBtn, color: "var(--accent-rose)" }}
                        onClick={() => handleDelete(c.id, c.name)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </RoleGuard>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══════════════ MODAL ═══════════════ */}
      {showModal && (
        <div style={S.overlay} onClick={closeModal}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modHead}>
              <h2 style={S.modTitle}>{editingId ? "Edit Collection" : "New Collection"}</h2>
              <button style={S.closeBtn} onClick={closeModal}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={S.form}>
              <Section title="Basic Info">
                <F label="Name" required>
                  <input
                    style={S.input}
                    value={form.name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((p) => ({
                        ...p,
                        name: v,
                        slug: p.slug === slugify(p.name) || !p.slug ? slugify(v) : p.slug,
                      }));
                    }}
                    required
                  />
                </F>
                <F label="Slug (URL path)" required>
                  <input
                    style={S.input}
                    value={form.slug}
                    onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                    placeholder="auto-generated from name"
                    required
                  />
                </F>
                <F label="Subtitle">
                  <input
                    style={S.input}
                    value={form.subtitle}
                    onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                    placeholder="short tagline shown below name"
                  />
                </F>
                <F label="Season">
                  <input
                    style={S.input}
                    value={form.season}
                    onChange={(e) => setForm((p) => ({ ...p, season: e.target.value }))}
                    list="season-list"
                    placeholder="pick from list or type your own"
                  />
                  <datalist id="season-list">
                    {SEASONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </F>
              </Section>

              <Section title="Details">
                <F label="Cover Image URL" span={2}>
                  <input
                    style={S.input}
                    value={form.image}
                    onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
                    placeholder="primary collection image URL"
                  />
                </F>
                <F label="Description" span={2}>
                  <textarea
                    style={S.textarea}
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="shown on collection page"
                  />
                </F>
              </Section>

              <Section title="Products">
                <F label={`Add Products (${form.productIds.length} selected)`} span={2}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-md)",
                        padding: "0 var(--space-3)",
                        flex: 1,
                      }}
                    >
                      <Search size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                      <input
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        style={{
                          flex: 1,
                          border: "none",
                          background: "none",
                          padding: "8px 0",
                          fontSize: "var(--text-xs)",
                          fontFamily: "var(--font-primary)",
                          color: "var(--text-primary)",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>
                  {/* Selected products */}
                  {form.productIds.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      {form.productIds.map((pid) => {
                        const prod = allProducts.find((p) => p.id === pid);
                        return (
                          <span key={pid} style={chipActive}>
                            {prod?.images?.[0] && (
                              <img
                                src={prod.images[0]}
                                alt=""
                                style={{
                                  width: 18,
                                  height: 22,
                                  objectFit: "cover",
                                  borderRadius: 2,
                                  flexShrink: 0,
                                  opacity: 1,
                                }}
                              />
                            )}
                            <span
                              style={{
                                fontSize: "var(--text-xs)",
                                maxWidth: 120,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {prod?.name ?? pid.slice(0, 8)}
                            </span>
                            <button
                              type="button"
                              style={chipX}
                              onClick={() =>
                                setForm((p) => ({
                                  ...p,
                                  productIds: p.productIds.filter((id) => id !== pid),
                                }))
                              }
                            >
                              <X size={10} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {/* Available products list */}
                  <div
                    style={{
                      maxHeight: 200,
                      overflow: "auto",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-secondary)",
                    }}
                  >
                    {filteredProducts.length === 0 ? (
                      <p
                        style={{
                          padding: "var(--space-4)",
                          fontSize: "var(--text-xs)",
                          color: "var(--text-muted)",
                          textAlign: "center",
                        }}
                      >
                        No products found.
                      </p>
                    ) : (
                      filteredProducts.slice(0, 50).map((p) => {
                        const selected = form.productIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            style={{ ...prodItem, ...(selected ? prodItemActive : {}) }}
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                productIds: selected
                                  ? prev.productIds.filter((id) => id !== p.id)
                                  : [...prev.productIds, p.id],
                              }))
                            }
                          >
                            {p.images?.[0] ? (
                              <img
                                src={p.images[0]}
                                alt=""
                                style={{
                                  width: 28,
                                  height: 36,
                                  objectFit: "cover",
                                  borderRadius: "var(--radius-sm)",
                                  flexShrink: 0,
                                  opacity: 1,
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 28,
                                  height: 36,
                                  background: "var(--bg-elevated)",
                                  borderRadius: "var(--radius-sm)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <ImageIcon size={10} style={{ color: "var(--text-disabled)" }} />
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                              <div
                                style={{
                                  fontSize: "var(--text-xs)",
                                  fontWeight: 500,
                                  color: "var(--text-primary)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {p.name}
                              </div>
                              <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                                {p.category?.slug ?? "—"} — ${Number(p.price).toFixed(2)}
                              </div>
                            </div>
                            {selected && (
                              <span
                                style={{
                                  fontSize: "var(--text-xs)",
                                  fontWeight: 600,
                                  color: "var(--accent-sage)",
                                  flexShrink: 0,
                                }}
                              >
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </F>
              </Section>

              <div style={S.formAct}>
                <button type="button" style={S.cancelBtn} onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" style={S.submitBtn} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update Collection" : "Create Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset style={FS.set}>
      <legend style={FS.legend}>{title}</legend>
      <div style={FS.grid}>{children}</div>
    </fieldset>
  );
}
function F({
  label,
  hint,
  required,
  span,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  span?: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{ ...FS.f, ...(span === 2 ? { gridColumn: "1 / -1" } : {}) }}>
      <span style={FS.lbl}>
        {label}
        {required && <span style={{ color: "var(--accent-rose)" }}> *</span>}
      </span>
      {children}
      {hint && (
        <span
          style={{
            fontSize: "10px",
            color: "var(--text-disabled)",
            fontFamily: "var(--font-primary)",
            fontStyle: "italic",
          }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrapper: { display: "flex", flexDirection: "column", gap: "var(--space-6)" },
  empty: {
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
    fontFamily: "var(--font-primary)",
    padding: "var(--space-8) 0",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  heading: {
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-2xl)",
    color: "var(--text-heading)",
    fontWeight: 400,
    margin: 0,
  },
  sub: {
    fontSize: "var(--text-xs)",
    color: "var(--text-muted)",
    fontFamily: "var(--font-primary)",
    marginTop: 4,
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 20px",
    background: "var(--accent-primary)",
    color: "var(--text-on-gold)",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    fontFamily: "var(--font-primary)",
    cursor: "pointer",
  },
  tableWrap: {
    background: "var(--bg-secondary)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
  },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: {
    textAlign: "left" as const,
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    color: "var(--text-muted)",
    padding: "var(--space-3) var(--space-4)",
    borderBottom: "1px solid var(--border-subtle)",
    fontFamily: "var(--font-primary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  tr: { borderBottom: "1px solid var(--border-subtle)" },
  td: {
    padding: "var(--space-3) var(--space-4)",
    fontSize: "var(--text-sm)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-primary)",
    verticalAlign: "middle" as const,
  },
  emptyCell: {
    padding: "var(--space-10) var(--space-4)",
    textAlign: "center" as const,
    color: "var(--text-muted)",
    fontSize: "var(--text-sm)",
    fontFamily: "var(--font-primary)",
  },
  cell: { display: "flex", alignItems: "center", gap: "var(--space-3)" },
  thumb: {
    width: 48,
    height: 36,
    objectFit: "cover" as const,
    borderRadius: "var(--radius-sm)",
    flexShrink: 0,
    opacity: 1,
  },
  noImg: {
    width: 48,
    height: 36,
    background: "var(--bg-elevated)",
    borderRadius: "var(--radius-sm)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted)",
    flexShrink: 0,
  },
  name: { fontWeight: 600 },
  subt: { fontSize: "var(--text-xs)", color: "var(--text-muted)" },
  code: {
    fontSize: "var(--text-xs)",
    background: "var(--bg-elevated)",
    padding: "2px 6px",
    borderRadius: "var(--radius-sm)",
    fontFamily: "monospace",
  },
  season: {
    fontSize: "var(--text-xs)",
    background: "rgba(240,228,166,0.2)",
    color: "var(--color-honey)",
    padding: "2px 8px",
    borderRadius: "var(--radius-pill)",
    fontWeight: 500,
  },
  count: {
    fontSize: "var(--text-xs)",
    background: "rgba(143,163,180,0.12)",
    color: "var(--accent-blue)",
    padding: "2px 8px",
    borderRadius: "var(--radius-pill)",
    fontWeight: 500,
  },
  muted: { color: "var(--text-disabled)", fontSize: "var(--text-xs)" },
  actions: { display: "flex", gap: 4, justifyContent: "flex-end" },
  actBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    border: "none",
    borderRadius: "var(--radius-sm)",
    background: "transparent",
    cursor: "pointer",
    color: "var(--text-secondary)",
  },
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(10,10,8,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: "var(--space-6)",
  },
  modal: {
    background: "var(--bg-primary)",
    borderRadius: "var(--radius-lg)",
    width: "100%",
    maxWidth: 640,
    maxHeight: "85vh",
    overflow: "auto",
    boxShadow: "var(--shadow-xl)",
  },
  modHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "var(--space-5) var(--space-6)",
    borderBottom: "1px solid var(--border-subtle)",
    position: "sticky" as const,
    top: 0,
    background: "var(--bg-primary)",
    zIndex: 1,
  },
  modTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-lg)",
    color: "var(--text-heading)",
    fontWeight: 400,
    margin: 0,
  },
  closeBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    border: "none",
    borderRadius: "var(--radius-sm)",
    background: "transparent",
    cursor: "pointer",
    color: "var(--text-muted)",
  },
  form: {
    padding: "var(--space-6)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-6)",
  },
  input: {
    padding: "8px 12px",
    border: "none",
    borderBottom: "1px solid var(--border-light)",
    borderRadius: 0,
    fontSize: "var(--text-sm)",
    fontFamily: "var(--font-primary)",
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
    outline: "none",
    width: "100%",
  },
  textarea: {
    padding: "8px 12px",
    border: "none",
    borderBottom: "1px solid var(--border-light)",
    borderRadius: 0,
    fontSize: "var(--text-sm)",
    fontFamily: "var(--font-primary)",
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
    outline: "none",
    resize: "vertical" as const,
    width: "100%",
  },
  formAct: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "var(--space-3)",
    paddingTop: "var(--space-4)",
    borderTop: "1px solid var(--border-subtle)",
  },
  cancelBtn: {
    padding: "8px 16px",
    background: "var(--bg-elevated)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    fontFamily: "var(--font-primary)",
    color: "var(--text-secondary)",
    cursor: "pointer",
  },
  submitBtn: {
    padding: "8px 20px",
    background: "var(--accent-primary)",
    color: "var(--text-on-gold)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    fontFamily: "var(--font-primary)",
    cursor: "pointer",
  },
  select: {
    padding: "8px 12px",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-sm)",
    fontFamily: "var(--font-primary)",
    background: "var(--bg-primary)",
    color: "var(--text-primary)",
    outline: "none",
    width: "100%",
  },
  loadingOverlay: {
    position: "absolute" as const,
    inset: 0,
    background: "rgba(251,248,241,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    borderRadius: "var(--radius-lg)",
  },
  loadingText: {
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
    fontFamily: "var(--font-primary)",
  },
};

/* ── Chip & Product list styles ── */
const chipActive: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 8px",
  borderRadius: "var(--radius-pill)",
  fontSize: "var(--text-xs)",
  fontFamily: "var(--font-primary)",
  background: "var(--accent-sage)",
  color: "#fff",
  border: "none",
  fontWeight: 600,
};
const chipX: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 16,
  height: 16,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: "var(--text-muted)",
  padding: 0,
  borderRadius: "50%",
  flexShrink: 0,
};
const prodItem: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  padding: "8px var(--space-3)",
  width: "100%",
  border: "none",
  borderBottom: "1px solid var(--border-subtle)",
  background: "transparent",
  cursor: "pointer",
  transition: "background var(--duration-fast)",
};
const prodItemActive: React.CSSProperties = { background: "rgba(163,177,138,0.06)" };
const FS: Record<string, React.CSSProperties> = {
  set: {
    border: "none",
    borderBottom: "1px solid var(--border-subtle)",
    padding: "0 0 var(--space-5) 0",
    margin: 0,
  },
  legend: {
    fontFamily: "var(--font-primary)",
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    color: "var(--text-secondary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    padding: 0,
    marginBottom: "var(--space-4)",
  },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" },
  f: { display: "flex", flexDirection: "column" as const, gap: 3 },
  lbl: {
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    color: "var(--text-secondary)",
    fontFamily: "var(--font-primary)",
  },
};
