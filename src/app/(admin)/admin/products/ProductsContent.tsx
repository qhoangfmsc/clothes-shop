"use client";

import { useState, useMemo, useRef, type FormEvent } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, X, ImageIcon } from "lucide-react";
import { useAdminCategories } from "@/src/hooks/use-admin-api";
import { useToast } from "@/src/app/_components/Toast";
import { RoleGuard } from "@/src/app/_components/RoleGuard";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableRef,
} from "@/src/app/_components/DataTable";
import { PERMISSIONS } from "@/src/lib/permissions";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  fetchProductList,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./_common/moduleSlice";
import { SORT_OPTIONS, SIZE_GROUPS, TAG_SUGGESTIONS, EMPTY_FORM } from "./_common/constants";
import type { ProductListResult } from "./_common/types";
import type { Product, ProductColor } from "@/src/types/product";
import type { Category, SubCategory } from "@/src/types/category";

/* ═══════════════════════════════ Helpers ═══════════════════════════════ */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ═══════════════════════════════ Status/Badge styles ═══════════════════ */

function statusStyle(s: string): string {
  return s === "active"
    ? "bg-[rgba(163,177,138,0.15)] text-[var(--accent-sage)]"
    : "bg-[rgba(107,101,96,0.1)] text-[var(--color-ash)]";
}

function badgeColor(b: string): string {
  const m: Record<string, string> = {
    new: "bg-[rgba(143,163,180,0.15)] text-[var(--accent-blue)]",
    sale: "bg-[rgba(212,165,165,0.15)] text-[var(--accent-rose)]",
    bestseller: "bg-[rgba(201,169,110,0.15)] text-[var(--accent-primary)]",
  };
  return m[b] ?? "bg-[rgba(107,101,96,0.05)] text-[var(--text-muted)]";
}

/* ═══════════════════════════════ Sub-components ═══════════════════════ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-0 border-b border-[var(--border-subtle)] pb-5 px-0 mx-0">
      <legend className="font-primary text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em] p-0 mb-4">
        {title}
      </legend>
      <div className="grid grid-cols-2 gap-4">{children}</div>
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
    <div className={`flex flex-col gap-1 ${span === 2 ? "col-span-2" : ""}`}>
      <span className="text-xs font-semibold text-[var(--text-secondary)] font-primary">
        {label}
        {required && <span className="text-[var(--accent-rose)]"> *</span>}
      </span>
      {children}
      {hint && (
        <span className="text-[10px] text-[var(--text-disabled)] font-primary italic">{hint}</span>
      )}
    </div>
  );
}

/* ═══════════════════════════════ Main Component ═══════════════════════ */

export default function ProductsContent() {
  const { toast } = useToast();
  const tableRef = useRef<DataTableRef>(null);
  const dispatch = useAppDispatch();

  const { isCreating, isUpdating, total } = useAppSelector((s) => s.products);
  const isSaving = isCreating || isUpdating;

  const { categories: catList } = useAdminCategories({ limit: 200 });

  /* ── fetchData for DataTable (Redux thunk) ── */
  const fetchProducts = async (params: DataTableFetchParams): Promise<ProductListResult> => {
    return dispatch(
      fetchProductList({
        search: params.search || undefined,
        category: params.filters.category || undefined,
        badge: params.filters.badge || undefined,
        status: params.filters.status || undefined,
        sort: params.sort,
        page: params.page,
        limit: params.limit,
      })
    ).unwrap();
  };

  /* ── Column definitions ── */
  const columns: DataTableColumn<Product>[] = useMemo(
    () => [
      {
        key: "product",
        header: "Product",
        render: (p) => (
          <div className="flex items-center gap-3">
            {p.images?.[0] ? (
              <div className="relative w-10 h-12 shrink-0">
                <Image
                  src={p.images[0]}
                  alt=""
                  fill
                  className="object-cover rounded-sm"
                  sizes="40px"
                />
              </div>
            ) : (
              <div className="w-10 h-12 bg-[var(--bg-elevated)] rounded-sm flex items-center justify-center text-[var(--text-muted)] shrink-0">
                <ImageIcon size={14} />
              </div>
            )}
            <div>
              <p className="font-semibold text-sm">{p.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{p.slug}</p>
            </div>
          </div>
        ),
      },
      {
        key: "category",
        header: "Category",
        render: (p) => (
          <>
            <span className="text-xs text-[var(--accent-primary)] font-semibold">
              {p.category?.slug ?? "—"}
            </span>
            {p.subcategory?.slug && (
              <span className="text-xs text-[var(--text-muted)]"> / {p.subcategory.slug}</span>
            )}
          </>
        ),
      },
      {
        key: "price",
        header: "Price",
        render: (p) => (
          <>
            <span className="font-semibold">${Number(p.price).toFixed(2)}</span>
            {p.originalPrice && (
              <span className="text-xs text-[var(--text-muted)] line-through ml-1.5">
                ${Number(p.originalPrice).toFixed(2)}
              </span>
            )}
          </>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (p) => (
          <span
            className={`inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary capitalize ${statusStyle(p.status)}`}
          >
            {p.status}
          </span>
        ),
      },
      {
        key: "badge",
        header: "Badge",
        render: (p) =>
          p.badge ? (
            <span
              className={`inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary capitalize ${badgeColor(p.badge)}`}
            >
              {p.badge}
            </span>
          ) : (
            <span className="text-[var(--text-disabled)]">—</span>
          ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (p) => (
          <div className="flex gap-1 justify-end">
            <RoleGuard permission={PERMISSIONS.PRODUCT_UPDATE}>
              <button
                className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--text-secondary)] hover:opacity-70"
                onClick={() => openEdit(p)}
                title="Edit"
              >
                <Pencil size={14} />
              </button>
            </RoleGuard>
            <RoleGuard permission={PERMISSIONS.PRODUCT_DELETE}>
              <button
                className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--accent-rose)] hover:opacity-70"
                onClick={() => handleDelete(p.id, p.name)}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </RoleGuard>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catList]
  );

  /* ── Filter options ── */
  const categoryFilterOptions = useMemo(
    () =>
      catList
        .map((c) => ({ value: c.slug, label: c.slug }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [catList]
  );

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  /* Color builder */
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#333333");
  /* Tag input */
  const [tagInput, setTagInput] = useState("");

  /* ── Derived data ── */
  const selectedCategory = useMemo<Category | undefined>(
    () => catList.find((c) => c.id === form.categoryId),
    [catList, form.categoryId]
  );
  const subcategoryOptions = useMemo<SubCategory[]>(
    () => selectedCategory?.subcategories ?? [],
    [selectedCategory]
  );

  /* ── Pre-computed <option> arrays ── */
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
      price: Number(p.price) || 0,
      originalPrice: p.originalPrice != null ? Number(p.originalPrice) : null,
      images: [...p.images],
      categoryId: p.category?.id ?? "",
      subcategoryId: p.subcategory?.id ? String(p.subcategory.id) : "",
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

  /* ── CRUD operations (Redux dispatch) ── */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (subcategoryOptions.length > 0 && !form.subcategoryId) {
      toast.error("Please select a subcategory (this category requires one)");
      return;
    }

    try {
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        originalPrice: form.originalPrice != null ? Number(form.originalPrice) : null,
        subcategoryId: form.subcategoryId || null,
      };
      if (editingId) {
        await dispatch(updateProduct({ id: editingId, body: payload })).unwrap();
        toast.success("Product updated");
      } else {
        await dispatch(createProduct(payload)).unwrap();
        toast.success("Product created");
      }
      tableRef.current?.refresh();
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await dispatch(deleteProduct(id)).unwrap();
      toast.success("Product deleted");
      tableRef.current?.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-display text-2xl text-[var(--text-heading)] font-normal">Products</h1>
          <p className="text-xs text-[var(--text-muted)] font-primary mt-1">
            {total} product{total !== 1 ? "s" : ""}
          </p>
        </div>
        <RoleGuard permission={PERMISSIONS.PRODUCT_CREATE}>
          <button
            className="flex items-center gap-1.5 py-[10px] px-5 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-lg text-sm font-semibold font-primary cursor-pointer hover:opacity-90 transition-opacity"
            onClick={openCreate}
          >
            <Plus size={16} /> Add Product
          </button>
        </RoleGuard>
      </div>

      <DataTable<Product>
        tableRef={tableRef}
        columns={columns}
        fetchData={fetchProducts}
        searchPlaceholder="Name product..."
        filters={[
          { key: "category", label: "Category", options: categoryFilterOptions },
          {
            key: "status",
            label: "Status",
            options: [
              { value: "active", label: "Active" },
              { value: "disabled", label: "Disabled" },
            ],
          },
          {
            key: "badge",
            label: "Badge",
            options: [
              { value: "new", label: "New" },
              { value: "sale", label: "Sale" },
              { value: "bestseller", label: "Bestseller" },
            ],
          },
        ]}
        sortOptions={SORT_OPTIONS as unknown as { value: string; label: string }[]}
        defaultSort="createdAt"
      />

      {/* ═══════════════════════════ MODAL FORM ═══════════════════════════ */}
      {showModal && (
        <div
          className="fixed inset-0 bg-[rgba(10,10,8,0.5)] flex items-center justify-center z-[100] p-6"
          onClick={closeModal}
        >
          <div
            className="bg-[var(--bg-primary)] rounded-2xl w-full max-w-[720px] max-h-[85vh] overflow-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex justify-between items-center py-5 px-6 border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--bg-primary)] z-[1]">
              <h2 className="font-display text-lg text-[var(--text-heading)] font-normal m-0">
                {editingId ? "Edit Product" : "New Product"}
              </h2>
              <button
                className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--text-muted)] hover:opacity-70"
                onClick={closeModal}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
              {/* ── Basic Info ── */}
              <Section title="Basic Info">
                <Field label="Product Name" required>
                  <input
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full"
                    value={form.name}
                    placeholder="e.g. Classic White T-Shirt"
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((p) => ({ ...p, name: v, slug: slugify(v) }));
                    }}
                    required
                  />
                </Field>
                <Field label="Description" span={2}>
                  <textarea
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full resize-y"
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
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full"
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
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full"
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
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full"
                    value={form.categoryId}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, categoryId: e.target.value, subcategoryId: "" }))
                    }
                    required
                  >
                    <option value="">— Select a category —</option>
                    {categoryOptions}
                  </select>
                </Field>
                <Field label="SubCategory">
                  <select
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full"
                    value={form.subcategoryId}
                    onChange={(e) => setForm((p) => ({ ...p, subcategoryId: e.target.value }))}
                    disabled={!form.categoryId || subcategoryOptions.length === 0}
                  >
                    <option value="">— None —</option>
                    {subcategorySelectOptions}
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full"
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="active">Active — visible in store</option>
                    <option value="disabled">Disabled — hidden</option>
                  </select>
                </Field>
                <Field label="Badge">
                  <select
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full"
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
                {/* Sizes */}
                <div className="flex flex-col gap-1 col-span-2">
                  <div className="flex gap-5 items-center">
                    <span className="text-xs font-semibold text-[var(--text-secondary)] font-primary">
                      Sizes
                    </span>
                    {form.sizes.length > 0 && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 py-0.5 px-2 bg-transparent border-0 rounded-sm text-[10px] font-primary text-[var(--text-muted)] cursor-pointer"
                        onClick={() => setForm((p) => ({ ...p, sizes: [] }))}
                      >
                        Clear all ({form.sizes.length})
                        <X size={10} />
                      </button>
                    )}
                  </div>
                  {SIZE_GROUPS.map((group) => (
                    <div key={group.label} className="mb-2">
                      <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1 block">
                        {group.label}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {group.sizes.map((size) => {
                          const active = form.sizes.includes(size);
                          return (
                            <button
                              key={size}
                              type="button"
                              className={`inline-flex items-center gap-1 py-[5px] px-3 rounded-full text-xs font-primary cursor-pointer border-0 transition-all ${
                                active
                                  ? "bg-[var(--accent-sage)] text-white px-2 font-semibold cursor-default"
                                  : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                              }`}
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
                  <div className="flex gap-1.5 mt-0">
                    <input
                      className="py-1.5 px-2.5 border-0 border-b border-[var(--border-light)] rounded-none text-xs font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none flex-1"
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

                {/* Colors */}
                <Field label="Colors" span={2}>
                  <div className="flex gap-2 mb-2.5 items-end">
                    <input
                      className="py-1.5 px-2.5 border-0 border-b border-[var(--border-light)] rounded-none text-xs font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none flex-1"
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
                      className="w-10 h-9 border border-[var(--border-light)] rounded-sm cursor-pointer p-0.5 bg-none shrink-0"
                    />
                    <button
                      type="button"
                      className="flex items-center justify-center w-8.5 h-8.5 border-0 rounded-sm bg-[var(--bg-elevated)] cursor-pointer text-[var(--accent-primary)] shrink-0 self-end"
                      onClick={addColor}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  {form.colors.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {form.colors.map((c, i) => (
                        <span
                          key={`${c.name}-${c.hex}`}
                          className="inline-flex items-center gap-1 py-[5px] px-2 rounded-full bg-[var(--accent-sage)] text-white text-xs font-semibold cursor-default"
                        >
                          <span
                            className="inline-block w-4 h-4 rounded-sm border border-black/15 shrink-0"
                            style={{ background: c.hex }}
                          />
                          <span className="text-xs font-medium">{c.name}</span>
                          <code className="text-[10px] text-white/70">{c.hex}</code>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center w-4 h-4 border-0 bg-transparent cursor-pointer text-white/70 p-0 ml-0.5 rounded-full shrink-0"
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
                    <p className="text-xs text-[var(--text-muted)] italic">No colors added yet.</p>
                  )}
                </Field>

                <Field label="Material">
                  <input
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full"
                    value={form.material}
                    onChange={(e) => setForm((p) => ({ ...p, material: e.target.value }))}
                    placeholder="e.g. 100% Cotton"
                  />
                </Field>
                <Field label="Care Instructions">
                  <input
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full"
                    value={form.care}
                    onChange={(e) => setForm((p) => ({ ...p, care: e.target.value }))}
                    placeholder="e.g. Machine wash cold"
                  />
                </Field>

                {/* Tags */}
                <Field label="Tags" span={2}>
                  <div className="flex flex-wrap gap-1.5">
                    {TAG_SUGGESTIONS.filter((t) => !form.tags.includes(t)).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="inline-flex items-center gap-1 py-[5px] px-2.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] text-[11px] font-primary cursor-pointer border-0 transition-all"
                        onClick={() => setForm((p) => ({ ...p, tags: [...p.tags, tag] }))}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <input
                      className="py-1.5 px-2.5 border-0 border-b border-[var(--border-light)] rounded-none text-xs font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none flex-1"
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
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 py-[5px] px-2 rounded-full bg-[var(--accent-sage)] text-white text-xs font-semibold cursor-default"
                        >
                          {tag}
                          <button
                            type="button"
                            className="inline-flex items-center justify-center w-4 h-4 border-0 bg-transparent cursor-pointer text-white/70 p-0 ml-0.5 rounded-full shrink-0"
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
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full resize-y"
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
              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  className="py-2 px-4 bg-[var(--bg-elevated)] border-0 rounded-sm text-sm font-primary text-[var(--text-secondary)] cursor-pointer"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-sm text-sm font-semibold font-primary cursor-pointer disabled:opacity-50"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : editingId ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
