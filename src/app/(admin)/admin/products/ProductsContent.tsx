"use client";

import { useState, useMemo, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Search, X, ImageIcon } from "lucide-react";
import { useAdminProducts, useAdminCategories } from "@/src/hooks/use-admin-api";
import { useToast } from "@/src/app/_components/Toast";
import { RoleGuard } from "@/src/app/_components/RoleGuard";
import { PERMISSIONS } from "@/src/lib/permissions";
import type { Product, ProductColor } from "@/src/types/product";
import type { Category, SubCategory } from "@/src/types/category";

/* ═══════════════════════════════ Constants ═══════════════════════════════ */

const EMPTY_FORM = {
  name: "",
  slug: "",
  price: 0,
  originalPrice: null as number | null,
  images: [] as string[],
  categoryId: "",
  subcategoryId: null as number | null,
  badge: null as string | null,
  status: "active",
  description: "",
  material: "",
  care: "",
  sizes: [] as string[],
  colors: [] as ProductColor[],
  tags: [] as string[],
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
];

const SIZE_GROUPS: { label: string; sizes: string[] }[] = [
  { label: "Letter", sizes: ["XS", "S", "M", "L", "XL", "XXL"] },
  { label: "Number", sizes: ["28", "29", "30", "31", "32", "33", "34", "36", "38", "40", "42"] },
  { label: "Special", sizes: ["One Size"] },
];

const TAG_SUGGESTIONS = [
  "summer",
  "winter",
  "spring",
  "autumn",
  "luxury",
  "casual",
  "formal",
  "streetwear",
  "minimal",
  "vintage",
  "limited",
  "organic",
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ═══════════════════════════════ Component ═══════════════════════════════ */

export default function ProductsContent() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterBadge, setFilterBadge] = useState("");
  const [filterSort, setFilterSort] = useState("newest");

  const { products, total, isLoading, isValidating, createProduct, updateProduct, deleteProduct } =
    useAdminProducts({
      category: filterCategory || undefined,
      badge: filterBadge || undefined,
      sort: filterSort,
      limit: 200,
    });

  const { categories: catList } = useAdminCategories();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  /* Color builder */
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#333333");
  /* Tag input */
  const [tagInput, setTagInput] = useState("");

  /* ── Derived data ── */
  const filtered = useMemo(() => {
    if (!search) return products;
    const s = search.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(s) || p.slug.toLowerCase().includes(s)
    );
  }, [products, search]);

  /* Toolbar filter: all available category slugs */
  const filterCategoryOptions = useMemo(() => catList.map((c) => c.slug).sort(), [catList]);

  /* Form: selected category & its subcategories */
  const selectedCategory = useMemo<Category | undefined>(
    () => catList.find((c) => c.id === form.categoryId),
    [catList, form.categoryId]
  );
  const subcategoryOptions = useMemo<SubCategory[]>(
    () => selectedCategory?.subcategories ?? [],
    [selectedCategory]
  );

  /* ── Pre-computed <option> arrays (avoids Turbopack key warnings) ── */
  const categoryOptions = useMemo(
    () =>
      catList.map((c) => (
        <option key={c.id} value={c.id}>
          {c.title}
        </option>
      )),
    [catList]
  );
  const subcategorySelectOptions = useMemo(
    () =>
      subcategoryOptions.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      )),
    [subcategoryOptions]
  );
  const toolbarCategoryOptions = useMemo(
    () =>
      filterCategoryOptions.map((slug) => (
        <option key={slug} value={slug}>
          {slug}
        </option>
      )),
    [filterCategoryOptions]
  );

  /* ── Handlers ── */
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setColorName("");
    setColorHex("#333333");
    setTagInput("");
  };

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      slug: p.slug,
      price: p.price,
      originalPrice: p.originalPrice,
      images: [...p.images],
      categoryId: p.category?.id ?? "",
      subcategoryId: p.subcategory?.id ?? null,
      badge: p.badge,
      status: p.status,
      description: p.description,
      material: p.material,
      care: p.care,
      sizes: [...p.sizes],
      colors: [...p.colors],
      tags: [...p.tags],
    });
    setColorName("");
    setColorHex("#333333");
    setTagInput("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    resetForm();
  };

  const addColor = () => {
    const name = colorName.trim();
    if (!name) return;
    if (form.colors.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Color name already exists");
      return;
    }
    setForm((p) => ({ ...p, colors: [...p.colors, { name, hex: colorHex }] }));
    setColorName("");
    setColorHex("#333333");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    /* Validate subcategory is selected when category has subcategories */
    if (
      subcategoryOptions.length > 0 &&
      (form.subcategoryId === null || form.subcategoryId === 0)
    ) {
      toast.error("Please select a subcategory (this category requires one)");
      return;
    }

    setSaving(true);
    try {
      /* Build payload: subcategoryId must be a valid number for BE */
      const payload = { ...form, subcategoryId: form.subcategoryId ?? 0 };
      if (editingId) {
        await updateProduct(editingId, payload);
        toast.success("Product updated");
      } else {
        await createProduct(payload);
        toast.success("Product created");
      }
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await deleteProduct(id);
      toast.success("Product deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const loading = isLoading || isValidating;

  return (
    <div style={S.wrapper}>
      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <h1 style={S.heading}>Products</h1>
          <p style={S.sub}>
            {total} product{total !== 1 ? "s" : ""}
          </p>
        </div>
        <RoleGuard permission={PERMISSIONS.PRODUCT_CREATE}>
          <button style={S.addBtn} onClick={openCreate}>
            <Plus size={16} /> Add Product
          </button>
        </RoleGuard>
      </div>

      {/* ── Toolbar ── */}
      <div style={S.toolbar}>
        <label style={{ ...S.toolField, flex: 1 }}>
          <span style={S.toolLabel}>Search</span>
          <div style={S.searchWrap}>
            <Search size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input
              placeholder="Name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={S.searchInput}
            />
          </div>
        </label>
        <label style={S.toolField}>
          <span style={S.toolLabel}>Category</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={S.filterSelect}
          >
            <option value="">All</option>
            {toolbarCategoryOptions}
          </select>
        </label>
        <label style={S.toolField}>
          <span style={S.toolLabel}>Badge</span>
          <select
            value={filterBadge}
            onChange={(e) => setFilterBadge(e.target.value)}
            style={S.filterSelect}
          >
            <option value="">All</option>
            <option value="new">New</option>
            <option value="sale">Sale</option>
            <option value="bestseller">Bestseller</option>
          </select>
        </label>
        <label style={S.toolField}>
          <span style={S.toolLabel}>Sort</span>
          <select
            value={filterSort}
            onChange={(e) => setFilterSort(e.target.value)}
            style={S.filterSelect}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ── Table ── */}
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
              <th style={S.th}>Product</th>
              <th style={S.th}>Category</th>
              <th style={S.th}>Price</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Badge</th>
              <th style={{ ...S.th, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={S.emptyCell}>
                  {search || filterCategory || filterBadge
                    ? "No products match."
                    : "No products yet."}
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} style={S.tr}>
                <td style={S.td}>
                  <div style={S.prodCell}>
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" style={S.thumb} />
                    ) : (
                      <div style={S.noImg}>
                        <ImageIcon size={14} />
                      </div>
                    )}
                    <div>
                      <p style={S.prodName}>{p.name}</p>
                      <p style={S.prodSlug}>{p.slug}</p>
                    </div>
                  </div>
                </td>
                <td style={S.td}>
                  <span style={S.catTag}>{p.category?.slug ?? "—"}</span>
                  {p.subcategory?.slug && <span style={S.subTag}> / {p.subcategory.slug}</span>}
                </td>
                <td style={S.td}>
                  <span style={S.price}>${Number(p.price).toFixed(2)}</span>
                  {p.originalPrice && (
                    <span style={S.origPrice}>${Number(p.originalPrice).toFixed(2)}</span>
                  )}
                </td>
                <td style={S.td}>
                  <span style={{ ...S.badge, ...statusStyle(p.status) }}>{p.status}</span>
                </td>
                <td style={S.td}>
                  {p.badge ? (
                    <span style={{ ...S.badge, ...badgeColor(p.badge) }}>{p.badge}</span>
                  ) : (
                    <span style={S.muted}>—</span>
                  )}
                </td>
                <td style={{ ...S.td, textAlign: "right" }}>
                  <div style={S.actions}>
                    <RoleGuard permission={PERMISSIONS.PRODUCT_UPDATE}>
                      <button style={S.actBtn} onClick={() => openEdit(p)} title="Edit">
                        <Pencil size={14} />
                      </button>
                    </RoleGuard>
                    <RoleGuard permission={PERMISSIONS.PRODUCT_DELETE}>
                      <button
                        style={{ ...S.actBtn, color: "var(--accent-rose)" }}
                        onClick={() => handleDelete(p.id, p.name)}
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

      {/* ═══════════════════════════ MODAL FORM ═══════════════════════════ */}
      {showModal && (
        <div style={S.overlay} onClick={closeModal}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modHead}>
              <h2 style={S.modTitle}>{editingId ? "Edit Product" : "New Product"}</h2>
              <button style={S.closeBtn} onClick={closeModal}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={S.form}>
              {/* ── Basic Info ── */}
              <Section title="Basic Info">
                <Field label="Product Name" required>
                  <input
                    style={S.input}
                    value={form.name}
                    placeholder="e.g. Classic White T-Shirt"
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
                </Field>
                <Field label="Slug (URL path)" required>
                  <input
                    style={S.input}
                    value={form.slug}
                    onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                    placeholder="auto-generated from name"
                    required
                  />
                </Field>
                <Field label="Description" span={2}>
                  <textarea
                    style={S.textarea}
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Product description..."
                  />
                </Field>
              </Section>

              {/* ── Pricing ── */}
              <Section title="Pricing">
                <Field label="Price ($)" required>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={S.input}
                    value={form.price}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))
                    }
                    required
                  />
                </Field>
                <Field label="Original Price ($)">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={S.input}
                    value={form.originalPrice ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        originalPrice: e.target.value ? parseFloat(e.target.value) : null,
                      }))
                    }
                    placeholder="leave empty if no discount"
                  />
                </Field>
              </Section>

              {/* ── Classification ── */}
              <Section title="Classification">
                <Field label="Category" required>
                  <select
                    style={S.select}
                    value={form.categoryId}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, categoryId: e.target.value, subcategoryId: null }))
                    }
                    required
                  >
                    <option value="">— Select a category —</option>
                    {categoryOptions}
                  </select>
                </Field>
                <Field label="SubCategory">
                  <select
                    style={S.select}
                    value={form.subcategoryId ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        subcategoryId: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                    disabled={!form.categoryId || subcategoryOptions.length === 0}
                  >
                    <option value="">— None —</option>
                    {subcategorySelectOptions}
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    style={S.select}
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="active">Active — visible in store</option>
                    <option value="disabled">Disabled — hidden</option>
                  </select>
                </Field>
                <Field label="Badge">
                  <select
                    style={S.select}
                    value={form.badge ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, badge: e.target.value || null }))}
                  >
                    <option value="">None</option>
                    <option value="new">New</option>
                    <option value="sale">Sale</option>
                    <option value="bestseller">Bestseller</option>
                  </select>
                </Field>
              </Section>

              {/* ── Attributes ── */}
              <Section title="Attributes">
                <div style={{ ...FS.field, gridColumn: "1 / -1" }}>
                  <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                    <span style={FS.label}>Sizes</span>
                    {form.sizes.length > 0 && (
                      <button
                        type="button"
                        style={S.clearBtn}
                        onClick={() => setForm((p) => ({ ...p, sizes: [] }))}
                      >
                        Clear all ({form.sizes.length})<X size={10} />
                      </button>
                    )}
                  </div>
                  {SIZE_GROUPS.map((group) => (
                    <div key={group.label} style={{ marginBottom: 8 }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: 4,
                          display: "block",
                        }}
                      >
                        {group.label}
                      </span>
                      <div style={chipGrid}>
                        {group.sizes.map((size) => {
                          const active = form.sizes.includes(size);
                          return (
                            <button
                              key={size}
                              type="button"
                              style={{ ...chipItem, ...(active ? chipActive : chipInactive) }}
                              onClick={() =>
                                setForm((p) => ({
                                  ...p,
                                  sizes: active
                                    ? p.sizes.filter((s) => s !== size)
                                    : [...p.sizes, size],
                                }))
                              }
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 6, marginTop: 0 }}>
                    <input
                      style={{
                        ...S.input,
                        fontSize: "var(--text-xs)",
                        padding: "6px 10px",
                        flex: 1,
                      }}
                      placeholder="Type custom size and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const v = (e.target as HTMLInputElement).value.trim().toUpperCase();
                          if (v && !form.sizes.includes(v)) {
                            setForm((p) => ({ ...p, sizes: [...p.sizes, v] }));
                            (e.target as HTMLInputElement).value = "";
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <Field label="Colors" span={2}>
                  {/* Color builder row */}
                  <div
                    style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-end" }}
                  >
                    <input
                      style={{
                        ...S.input,
                        fontSize: "var(--text-xs)",
                        padding: "6px 10px",
                        flex: 1,
                      }}
                      placeholder='Color name, e.g. "Midnight Blue"'
                      value={colorName}
                      onChange={(e) => setColorName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addColor();
                        }
                      }}
                    />
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      style={{
                        width: 40,
                        height: 36,
                        border: "1px solid var(--border-light)",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        padding: 2,
                        background: "none",
                        flexShrink: 0,
                      }}
                    />
                    <button type="button" style={addChipBtn} onClick={addColor}>
                      <Plus size={14} />
                    </button>
                  </div>
                  {/* Added colors */}
                  {form.colors.length > 0 ? (
                    <div style={chipGrid}>
                      {form.colors.map((c, i) => (
                        <span key={`${c.name}-${c.hex}`} style={chipActive}>
                          <span
                            style={{
                              display: "inline-block",
                              width: 16,
                              height: 16,
                              borderRadius: "var(--radius-sm)",
                              background: c.hex,
                              border: "1px solid rgba(0,0,0,0.15)",
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>
                            {c.name}
                          </span>
                          <code style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                            {c.hex}
                          </code>
                          <button
                            type="button"
                            style={chipX}
                            onClick={() =>
                              setForm((p) => ({ ...p, colors: p.colors.filter((_, j) => j !== i) }))
                            }
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--text-muted)",
                        fontStyle: "italic",
                      }}
                    >
                      No colors added yet.
                    </p>
                  )}
                </Field>

                <Field label="Material">
                  <input
                    style={S.input}
                    value={form.material}
                    onChange={(e) => setForm((p) => ({ ...p, material: e.target.value }))}
                    placeholder="e.g. 100% Cotton"
                  />
                </Field>
                <Field label="Care Instructions">
                  <input
                    style={S.input}
                    value={form.care}
                    onChange={(e) => setForm((p) => ({ ...p, care: e.target.value }))}
                    placeholder="e.g. Machine wash cold"
                  />
                </Field>

                <Field label="Tags" span={2}>
                  {/* Tag suggestions */}
                  <div style={chipGrid}>
                    {TAG_SUGGESTIONS.filter((t) => !form.tags.includes(t)).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        style={chipHint}
                        onClick={() => setForm((p) => ({ ...p, tags: [...p.tags, tag] }))}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                  {/* Custom tag input */}
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <input
                      style={{
                        ...S.input,
                        fontSize: "var(--text-xs)",
                        padding: "6px 10px",
                        flex: 1,
                      }}
                      placeholder="Type tag and press Enter..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const v = tagInput.trim().toLowerCase();
                          if (v && !form.tags.includes(v)) {
                            setForm((p) => ({ ...p, tags: [...p.tags, v] }));
                            setTagInput("");
                          }
                        }
                      }}
                    />
                  </div>
                  {/* Selected tags */}
                  {form.tags.length > 0 && (
                    <div style={{ ...chipGrid, marginTop: 8 }}>
                      {form.tags.map((tag) => (
                        <span key={tag} style={chipActive}>
                          {tag}
                          <button
                            type="button"
                            style={chipX}
                            onClick={() =>
                              setForm((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }))
                            }
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </Field>
              </Section>

              {/* ── Images ── */}
              <Section title="Images">
                <Field label="Image URLs" span={2}>
                  <textarea
                    style={S.textarea}
                    rows={4}
                    value={form.images.join("\n")}
                    placeholder="one URL per line"
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        images: e.target.value
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }))
                    }
                  />
                </Field>
              </Section>

              {/* ── Actions ── */}
              <div style={S.formAct}>
                <button type="button" style={S.cancelBtn} onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" style={S.submitBtn} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════ Helpers ═══════════════════════════════ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset style={FS.fieldset}>
      <legend style={FS.legend}>{title}</legend>
      <div style={FS.grid}>{children}</div>
    </fieldset>
  );
}

function Field({
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
    <div style={{ ...FS.field, ...(span === 2 ? { gridColumn: "1 / -1" } : {}) }}>
      <span style={FS.label}>
        {label}
        {required && <span style={FS.req}> *</span>}
      </span>
      {children}
      {hint && <span style={FS.hint}>{hint}</span>}
    </div>
  );
}

function statusStyle(s: string): React.CSSProperties {
  return s === "active"
    ? { background: "rgba(163,177,138,0.15)", color: "var(--accent-sage)" }
    : { background: "rgba(107,101,96,0.1)", color: "var(--color-ash)" };
}

function badgeColor(b: string): React.CSSProperties {
  const m: Record<string, React.CSSProperties> = {
    new: { background: "rgba(143,163,180,0.15)", color: "var(--accent-blue)" },
    sale: { background: "rgba(212,165,165,0.15)", color: "var(--accent-rose)" },
    bestseller: { background: "rgba(201,169,110,0.15)", color: "var(--accent-primary)" },
  };
  return m[b] ?? { background: "rgba(107,101,96,0.05)", color: "var(--text-muted)" };
}

/* ═══════════════════════════════ Styles ═══════════════════════════════ */

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

  toolbar: {
    display: "flex",
    gap: "var(--space-3)",
    alignItems: "flex-end",
    flexWrap: "wrap" as const,
  },
  toolField: { display: "flex", flexDirection: "column", gap: 3 },
  toolLabel: {
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    color: "var(--text-muted)",
    fontFamily: "var(--font-primary)",
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "var(--bg-secondary)",
    borderRadius: "var(--radius-md)",
    padding: "0 var(--space-4)",
    height: 36,
  },
  searchInput: {
    flex: 1,
    border: "none",
    background: "none",
    padding: "0",
    fontSize: "var(--text-sm)",
    fontFamily: "var(--font-primary)",
    color: "var(--text-primary)",
    outline: "none",
  },
  filterSelect: {
    padding: "8px 12px",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--text-sm)",
    fontFamily: "var(--font-primary)",
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
    outline: "none",
    minWidth: 130,
    height: 36,
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
  prodCell: { display: "flex", alignItems: "center", gap: "var(--space-3)" },
  thumb: {
    width: 40,
    height: 48,
    objectFit: "cover" as const,
    borderRadius: "var(--radius-sm)",
    flexShrink: 0,
    opacity: 1,
  },
  noImg: {
    width: 40,
    height: 48,
    background: "var(--bg-elevated)",
    borderRadius: "var(--radius-sm)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted)",
    flexShrink: 0,
  },
  prodName: { fontWeight: 600, fontSize: "var(--text-sm)" },
  prodSlug: { fontSize: "var(--text-xs)", color: "var(--text-muted)" },
  catTag: { fontSize: "var(--text-xs)", color: "var(--accent-primary)", fontWeight: 600 },
  subTag: { fontSize: "var(--text-xs)", color: "var(--text-muted)" },
  price: { fontWeight: 600 },
  origPrice: {
    fontSize: "var(--text-xs)",
    color: "var(--text-muted)",
    textDecoration: "line-through",
    marginLeft: 6,
  },
  muted: { color: "var(--text-disabled)" },
  badge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "var(--radius-pill)",
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    fontFamily: "var(--font-primary)",
    textTransform: "capitalize" as const,
  },
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
    maxWidth: 720,
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
  select: {
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
  clearBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "2px 8px",
    background: "transparent",
    border: "none",
    borderRadius: "var(--radius-sm)",
    fontSize: "10px",
    fontFamily: "var(--font-primary)",
    color: "var(--text-muted)",
    cursor: "pointer",
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

/* ── Chip styles ── */
const chipGrid: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6 };
const chipItem: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: "var(--radius-pill)",
  fontSize: "var(--text-xs)",
  fontFamily: "var(--font-primary)",
  cursor: "pointer",
  border: "none",
  transition: "all var(--duration-fast)",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};
const chipInactive: React.CSSProperties = {
  ...chipItem,
  background: "var(--bg-elevated)",
  color: "var(--text-muted)",
};
const chipActive: React.CSSProperties = {
  ...chipItem,
  background: "var(--accent-sage)",
  color: "#fff",
  padding: "5px 8px",
  cursor: "default",
  fontWeight: 600,
};
const chipHint: React.CSSProperties = {
  ...chipItem,
  background: "var(--bg-elevated)",
  color: "var(--text-muted)",
  fontSize: "11px",
  padding: "5px 10px",
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
  marginLeft: 2,
  borderRadius: "50%",
  flexShrink: 0,
};
const addChipBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  border: "none",
  borderRadius: "var(--radius-sm)",
  background: "var(--bg-elevated)",
  cursor: "pointer",
  color: "var(--accent-primary)",
  flexShrink: 0,
  alignSelf: "flex-end",
};

/* ── Section / Fieldset styles ── */
const FS: Record<string, React.CSSProperties> = {
  fieldset: {
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
  field: { display: "flex", flexDirection: "column" as const, gap: 3 },
  label: {
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    color: "var(--text-secondary)",
    fontFamily: "var(--font-primary)",
  },
  req: { color: "var(--accent-rose)" },
  hint: {
    fontSize: "10px",
    color: "var(--text-disabled)",
    fontFamily: "var(--font-primary)",
    fontStyle: "italic",
  },
};
